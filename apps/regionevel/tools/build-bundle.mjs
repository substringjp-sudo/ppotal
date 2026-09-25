#!/usr/bin/env node
/**
 * Rebuild a country's topojson bundle from the live geometry documents.
 *
 * Why a bundle at all, and why topojson: the city map reads
 * `regionevel_geometries_bundles/<ISO3>_ADM<level>` and merges it with the live
 * documents. Storing the same shapes as independent GeoJSON polygons means a
 * shared border is stored twice, once per neighbour — and once anything
 * simplifies those two copies separately, they stop agreeing. That is exactly
 * the seam this repo has: municipalities seeded from one simplification sitting
 * next to municipalities from another, with visible gaps along borders they are
 * supposed to share.
 *
 * TopoJSON stores a shared border once, as an arc both polygons reference.
 * Simplifying an arc moves it for both neighbours at the same time, so the
 * seam cannot open. That property is the whole reason to do this rather than
 * round everyone's coordinates and hope.
 *
 * It reads from Firestore and writes a file. Applying the file is
 * `apply-bundle.mjs`, so that nothing here can write to the database.
 *
 * Usage:
 *   node tools/build-bundle.mjs --iso3 JPN --level 2 --out reports/bundle-JPN
 *   node tools/build-bundle.mjs --iso3 JPN --level 2 --out reports/bundle-JPN --keep 0.5
 *   node tools/build-bundle.mjs --iso3 JPN --level 2 --out reports/bundle-JPN --quantize 1e5
 *   node tools/build-bundle.mjs --iso3 JPN --level 1 --out reports/bundle-JPN --keep 1
 *
 * Each level is its own bundle and its own topology. Both have to exist and
 * both have to be current: the map draws one level's fills together with that
 * same level's borders, so a stale bundle at either level shows up as borders
 * that do not follow the shapes they belong to.
 */

import fs from "node:fs";
import path from "node:path";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { feature, quantize } from "topojson-client";

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCHVsk1xvYnMn1fSt5uV2XDfiC6qpVYN68";
const PROJECT = arg("--project", "p-plan");
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const LEVEL_NAME = { 0: "country", 1: "prefecture", 2: "city" };

/** Firestore's REST shape, flattened to plain values. */
const plain = (v) => {
  if (v == null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue !== undefined) {
    return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]));
  }
  if (v.arrayValue !== undefined) return (v.arrayValue.values ?? []).map(plain);
  return null;
};

async function runQuery(body) {
  const r = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).filter((x) => x.document);
}

async function countryRecordId(iso3) {
  const rows = await runQuery({ structuredQuery: {
    from: [{ collectionId: "regions" }],
    where: { compositeFilter: { op: "AND", filters: [
      { fieldFilter: { field: { fieldPath: "iso3" }, op: "EQUAL", value: { stringValue: iso3 } } },
      { fieldFilter: { field: { fieldPath: "admLevel" }, op: "EQUAL", value: { integerValue: "0" } } },
    ]}},
    limit: 1,
  }});
  if (!rows.length) throw new Error(`No country record for ${iso3}`);
  return rows[0].document.name.split("/").pop();
}

/**
 * Every geometry the app's own country-level read returns for this level.
 *
 * The filter has to be the app's own, not one that merely looks equivalent.
 * `getGeometriesByCountry` finds cities by `properties.countryId` plus
 * `properties.level`, but prefectures by their root-level `parentId` — and the
 * prefecture documents carry no `properties.countryId` at all, so reading level
 * 1 the level-2 way returns nothing and the bundle would be built from an empty
 * set.
 */
const levelFilter = (countryId, level, levelName) =>
  level === 1
    ? { fieldFilter: { field: { fieldPath: "parentId" }, op: "EQUAL", value: { stringValue: countryId } } }
    : { compositeFilter: { op: "AND", filters: [
        { fieldFilter: { field: { fieldPath: "properties.countryId" }, op: "EQUAL", value: { stringValue: countryId } } },
        { fieldFilter: { field: { fieldPath: "properties.level" }, op: "EQUAL", value: { stringValue: levelName } } },
      ]}};

async function readGeometries(countryId, level, levelName) {
  const out = [];
  let cursor = null;
  for (;;) {
    const rows = await runQuery({ structuredQuery: {
      from: [{ collectionId: "regionevel_geometries" }],
      where: levelFilter(countryId, level, levelName),
      orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
      limit: 200,
      ...(cursor ? { startAt: { values: [{ referenceValue: cursor }], before: false } } : {}),
    }});
    for (const x of rows) {
      const id = x.document.name.split("/").pop();
      const f = x.document.fields ?? {};
      const props = plain(f.properties) ?? {};
      // The app drops OSM-sourced features everywhere it reads; a bundle that
      // carried them would put them back in through the side door.
      if (id.startsWith("osm_") || props.source === "osm" || props.osmRelationId != null) continue;
      let geometry = null;
      try { geometry = JSON.parse(f.geometry?.stringValue ?? "null"); } catch { /* reported below */ }
      if (!geometry) { console.warn(`  skipping ${id}: geometry missing or unparseable`); continue; }
      out.push({ type: "Feature", id, properties: { ...props, id: props.id ?? id }, geometry });
    }
    if (rows.length < 200) break;
    cursor = rows[rows.length - 1].document.name;
  }
  return out;
}

const countPoints = (geo) => {
  const rings = geo?.type === "Polygon" ? geo.coordinates
    : geo?.type === "MultiPolygon" ? geo.coordinates.flat() : [];
  return rings.reduce((n, r) => n + (r?.length ?? 0), 0);
};

async function main() {
  const iso3 = arg("--iso3");
  const level = Number(arg("--level", "2"));
  const outDir = arg("--out", `reports/bundle-${iso3}`);
  const keep = Number(arg("--keep", "0.5"));
  const quantization = Number(arg("--quantize", "1e5"));
  if (!iso3) {
    console.error("Need --iso3. See the header for an example.");
    process.exit(1);
  }
  const levelName = LEVEL_NAME[level];
  if (!levelName) {
    console.error(`--level must be one of ${Object.keys(LEVEL_NAME).join(", ")}`);
    process.exit(1);
  }
  if (level === 0) {
    console.error("--level 0 is one shape per country; there are no shared borders for a topology to collapse.");
    process.exit(1);
  }

  const countryId = await countryRecordId(iso3);
  console.log(`${iso3} is region ${countryId}; reading ${levelName} geometries…`);
  const features = await readGeometries(countryId, level, levelName);
  if (!features.length) {
    console.error("No geometries matched. Nothing to build.");
    process.exit(1);
  }
  const pointsBefore = features.reduce((n, f) => n + countPoints(f.geometry), 0);
  console.log(`  ${features.length} features, ${pointsBefore.toLocaleString()} coordinate pairs`);

  // Build the topology: shared borders collapse into arcs here, which is the
  // step that makes neighbours agree from now on.
  const topo = topology({ [`${iso3}_ADM${level}`]: { type: "FeatureCollection", features } });
  const arcsBefore = topo.arcs.length;

  // `quantile(topology, p)` is the weight threshold that retains about p of the
  // points, so --keep reads the way it sounds. The figure actually achieved
  // comes out a little higher, because a ring cannot drop below the four points
  // it takes to close, and the run reports the real number rather than the
  // requested one.
  //
  // Detail is not what this is for. Topology makes neighbours agree at any
  // level of simplification, so the level is free to be chosen for size.
  const pre = presimplify(topo);
  const threshold = quantile(pre, keep);
  const simplified = simplify(pre, threshold);

  // Quantize last. Doing it before simplification is wasted work: presimplify
  // needs absolute coordinates to compute an area per point, so it undoes the
  // transform and the file comes out larger than it started.
  //
  // Quantizing does two things here. It snaps every coordinate to a grid, so two
  // shapes meeting at a border land on exactly the same grid point rather than
  // on two floats differing in the twelfth decimal; and it lets the file store
  // small integer deltas instead of 15-digit floats, which is most of why a
  // topojson bundle is smaller than the polygons it came from.
  //
  // The grid is the bounding box divided by this number, so its size in metres
  // depends on the country: 1e5 over Japan is about 24 m, and the run prints
  // the figure it actually got. That is coarser than the 5-decimal (~1 m)
  // precision of the individual documents, and fine here — this bundle is only
  // read at country level, where the whole of Japan spans a screen and 24 m is
  // a hundredth of a pixel. 1e6 would give ~2 m but does not fit the document
  // limit at any useful --keep.
  const small = quantize(simplified, quantization);

  const rebuilt = feature(small, small.objects[`${iso3}_ADM${level}`]);
  const pointsAfter = rebuilt.features.reduce((n, f) => n + countPoints(f.geometry), 0);
  const empty = rebuilt.features.filter((f) => countPoints(f.geometry) === 0);

  const json = JSON.stringify(small);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${iso3}_ADM${level}.json`);
  fs.writeFileSync(outFile, json);

  const metres = (small.transform?.scale?.[1] ?? 0) * 111320;
  console.log(`\narcs: ${arcsBefore}  (quantized to ${quantization.toExponential(0)}, a grid of about ${metres.toFixed(0)} m)`);
  console.log(`coordinate pairs: ${pointsBefore.toLocaleString()} -> ${pointsAfter.toLocaleString()} (${(100 * pointsAfter / pointsBefore).toFixed(0)}%)`);
  console.log(`bundle: ${(json.length / 1048576).toFixed(2)} MiB (${json.length.toLocaleString()} bytes)  -> ${outFile}`);

  // The bundle is stored as one Firestore document, and those cap at 1 MiB
  // including field names and overhead. Leave room rather than discover it on
  // the write.
  const DOC_LIMIT = 1048576, HEADROOM = 0.9;
  if (json.length > DOC_LIMIT * HEADROOM) {
    console.error(`\nToo large for a Firestore document: ${json.length.toLocaleString()} bytes against a ${DOC_LIMIT.toLocaleString()} limit (keeping ${Math.round(HEADROOM * 100)}% as the ceiling).`);
    console.error(`Lower --keep (currently ${keep}) and run again.`);
    process.exit(1);
  }

  // A shape simplified out of existence is a hole, which is the fault this
  // whole exercise exists to remove. Refuse rather than write one.
  if (empty.length) {
    console.error(`\n${empty.length} features lost every ring at --keep ${keep}:`);
    for (const f of empty.slice(0, 10)) console.error(`  ${f.properties?.id} ${f.properties?.shapeName ?? f.properties?.name ?? ""}`);
    console.error(`Raise --keep and run again. Nothing was applied; the file above is for inspection only.`);
    process.exit(1);
  }
  if (rebuilt.features.length !== features.length) {
    console.error(`\nfeature count changed: ${features.length} in, ${rebuilt.features.length} out. Refusing.`);
    process.exit(1);
  }
  console.log(`\nall ${features.length} features survived with at least one ring.`);
  console.log(`Apply with:  node tools/apply-bundle.mjs --bundle ${outFile} --iso3 ${iso3} --level ${level} --project ${PROJECT} --apply`);
}

main().catch((e) => { console.error(e); process.exit(1); });

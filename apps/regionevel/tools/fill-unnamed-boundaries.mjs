#!/usr/bin/env node
/**
 * Fills the holes in a city-level map without importing any new geometry.
 *
 * The holes are not missing boundaries. geoBoundaries ships a polygon for
 * every Japanese municipality (1742 shapes against ~1741 municipalities), and
 * those polygons tile their prefecture correctly. What is missing is the
 * *name*: 26 of the ADM2 shapes carry `shapeName: null` or "?????". The seed
 * matched shapes to region records by name, so those shapes never became
 * regions — and a shape with no region is a hole you cannot even hover.
 *
 * That is why patching from OSM went wrong. It imported geometry to fill a
 * gap that was never geometric, so every patched polygon duplicated one we
 * already had, at a different resolution, and coastal ones dragged in
 * territorial water because OSM municipal relations extend past the shore.
 *
 * So this takes the opposite path: keep the geoBoundaries polygon, and read
 * only a *name* off the other source, matched by where the shapes are rather
 * than by what they are called. No foreign geometry is ever emitted, which is
 * what makes a resolution mismatch and a sea overhang impossible here rather
 * than merely unlikely.
 *
 * Writes nothing to Firestore. It emits files to review and seed.
 *
 * Usage:
 *   node tools/fill-unnamed-boundaries.mjs \
 *     --shapes  ../jprail/public/data/geoBoundaries-JPN-ADM2_simplified.geojson \
 *     --parents ../jprail/public/data/geoBoundaries-JPN-ADM1_simplified.geojson \
 *     --regions reports/all-regions.json \
 *     --names   reports/JPN_ADM2_patch.geojson \
 *     --iso3 JPN --out reports/fill-JPN
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- geometry --

function* rings(geometry) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    if (geometry.coordinates?.[0]) yield geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates ?? []) if (poly?.[0]) yield poly[0];
  }
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > pt[1]) !== (yj > pt[1]))
      && (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeometry(pt, geometry) {
  for (const ring of rings(geometry)) if (pointInRing(pt, ring)) return true;
  return false;
}

/** Planar ring area. Only ever compared against another area nearby, so degrees are fine. */
function geometryArea(geometry) {
  let total = 0;
  for (const ring of rings(geometry)) total += ringArea(ring);
  return total;
}

/** The coordinates of a Point or MultiPoint source, or none for an area source. */
function pointsOf(geometry) {
  if (geometry?.type === "Point") return [geometry.coordinates];
  if (geometry?.type === "MultiPoint") return geometry.coordinates ?? [];
  return [];
}

function bbox(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings(geometry)) {
    for (const p of ring) {
      if (p[0] < b[0]) b[0] = p[0];
      if (p[1] < b[1]) b[1] = p[1];
      if (p[0] > b[2]) b[2] = p[0];
      if (p[1] > b[3]) b[3] = p[1];
    }
  }
  return Number.isFinite(b[0]) ? b : null;
}

/**
 * A point that actually lies inside the shape.
 *
 * The plain centroid escapes concave shapes — a C-shaped municipality, or one
 * wrapped around a bay — and a point outside its own polygon would then match
 * whatever neighbour happens to contain it, which is a silently wrong name.
 */
function interiorPoint(geometry) {
  let best = null;
  let bestArea = -1;
  for (const ring of rings(geometry)) {
    const a = ringArea(ring);
    if (a > bestArea) { bestArea = a; best = ring; }
  }
  if (!best || best.length === 0) return null;

  let x = 0, y = 0;
  for (const p of best) { x += p[0]; y += p[1]; }
  const centre = [x / best.length, y / best.length];
  if (pointInRing(centre, best)) return centre;

  // Walk in from each vertex towards the centre until a point lands inside.
  for (const p of best) {
    for (const t of [0.5, 0.25, 0.1]) {
      const cand = [p[0] + (centre[0] - p[0]) * t, p[1] + (centre[1] - p[1]) * t];
      if (pointInRing(cand, best)) return cand;
    }
  }
  return null;
}

// -------------------------------------------------------------------- misc --

const NAME_KEYS = ["name", "shapeName", "nameEn", "nameJa", "NAME"];

function readName(props) {
  for (const k of NAME_KEYS) {
    const v = props?.[k];
    if (typeof v === "string" && v.trim() && !/^\?+$/.test(v.trim())) return v.trim();
  }
  return null;
}

/**
 * The region table stores a romanised `name` with the local spelling beside it
 * in `nameKo`. A name source may carry both under either key, so pick by
 * script rather than by key: taking whichever key came first is how a table of
 * "Ine", "Chichibu" ends up with a "富士吉田市" in the middle of it, and how a
 * duplicate check against existing romanised names silently never matches.
 */
const LOCAL_SCRIPT = /[぀-ヿ㐀-鿿가-힯]/;

function readNamePair(props) {
  const values = NAME_KEYS
    .map((k) => props?.[k])
    .filter((v) => typeof v === "string" && v.trim() && !/^\?+$/.test(v.trim()))
    .map((v) => v.trim());
  if (values.length === 0) return null;
  const local = values.find((v) => LOCAL_SCRIPT.test(v)) ?? null;
  const roman = values.find((v) => !LOCAL_SCRIPT.test(v)) ?? null;
  return { name: roman ?? local, local: local && local !== roman ? local : null };
}

/**
 * Designations that occupy a polygon without being a municipality. Seeding one
 * creates a region nobody can ever visit.
 */
const NOT_A_MUNICIPALITY = [/^所属未定地$/, /^境界未定地/];

/** A shape whose name is unusable is exactly the shape the seed dropped. */
function hasUsableName(feature) {
  return readName(feature.properties) !== null;
}

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function argAll(flag) {
  const out = [];
  process.argv.forEach((a, i) => {
    if (a === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function featuresOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (Array.isArray(doc?.features)) return doc.features;
  return Object.values(doc);
}

// -------------------------------------------------------------------- main --

function main() {
  const shapesPath = arg("--shapes");
  const parentsPath = arg("--parents");
  const regionsPath = arg("--regions");
  const namePaths = argAll("--names");
  const iso3 = arg("--iso3", "JPN");
  const outDir = arg("--out", `reports/fill-${iso3}`);

  if (!shapesPath || !parentsPath || !regionsPath) {
    console.error("Need --shapes, --parents and --regions. See the header for an example.");
    process.exit(1);
  }

  const shapes = featuresOf(readJson(shapesPath));
  const parents = featuresOf(readJson(parentsPath));
  const regions = featuresOf(readJson(regionsPath));

  const nameSources = namePaths.flatMap((p) => featuresOf(readJson(p)).map((f) => {
    const pair = readNamePair(f.properties) ?? readNamePair(f);
    return {
      name: pair?.name ?? null,
      local: pair?.local ?? null,
      // Set when this polygon is another piece of a region that already
      // exists rather than a region of its own. Only whoever identified the
      // place can know which, so the source says it rather than the tool
      // guessing from a name that may simply collide.
      partOf: typeof f.properties?.partOf === "string" ? f.properties.partOf : null,
      geometry: typeof f.geometry === "string" ? JSON.parse(f.geometry) : f.geometry,
      from: path.basename(p),
    };
  })).filter((s) => s.name && s.geometry);

  for (const s of nameSources) {
    s.box = bbox(s.geometry);
    s.area = geometryArea(s.geometry);
    // A point source names whichever shape contains it, rather than being
    // tested for containing the shape. That is how a coordinate someone looked
    // up by hand becomes a usable name source, and it is the only kind that
    // carries no geometry to get the resolution or the coastline wrong.
    s.points = pointsOf(s.geometry);
  }

  // --- the region table, as it stands
  const parentRecords = regions.filter((r) => r.iso3 === iso3 && r.admLevel === 1);
  const childRecords = regions.filter((r) => r.iso3 === iso3 && r.admLevel === 2);
  const parentByName = new Map(parentRecords.map((r) => [r.name, r]));

  // Two different questions, so two sets. "A record exists" is what decides
  // whether a shape is a hole; "a shape carries this name" is what decides
  // whether a name is still unclaimed. Conflating them makes every named shape
  // look seeded and hides the second kind of hole entirely.
  const recordedNames = new Set(
    childRecords.map((r) => `${r.parentId}::${String(r.name).toLowerCase()}`),
  );
  const claimedNames = new Set(recordedNames);

  // --- id allocation, following the scheme already in the table:
  //     a child id is a sequential prefix followed by its parent's whole id.
  const usedIds = new Set(regions.map((r) => String(r.id)));
  let nextPrefix = 0;
  for (const r of childRecords) {
    const id = String(r.id);
    const parentId = String(r.parentId ?? "");
    if (!parentId || !id.endsWith(parentId)) continue;
    const prefix = Number(id.slice(0, id.length - parentId.length));
    if (Number.isFinite(prefix) && prefix > nextPrefix) nextPrefix = prefix;
  }
  const allocateId = (parentId) => {
    for (;;) {
      nextPrefix += 1;
      const id = `${nextPrefix}${parentId}`;
      if (!usedIds.has(id)) { usedIds.add(id); return id; }
    }
  };

  const parentBoxes = parents.map((f) => ({ f, box: bbox(f.geometry) }));

  /** Which parent boundary a point falls in, and the region record for it. */
  const parentAt = (pt) => {
    const hit = parentBoxes.find(({ f, box }) =>
      box && pt[0] >= box[0] && pt[0] <= box[2] && pt[1] >= box[1] && pt[1] <= box[3]
      && pointInGeometry(pt, f.geometry));
    const parentName = hit ? readName(hit.f.properties) : null;
    return { parentName, parentRecord: parentName ? parentByName.get(parentName) ?? null : null };
  };

  // Locate every shape once: both passes below need its interior point and its
  // parent, and point-in-polygon over 47 parents is not worth doing twice.
  // Scoped to the parent on purpose: "Ina" and "Ogawa" name towns in several
  // prefectures, and treating a name as claimed nationwide would reject the
  // very shapes we are here to fill.
  const located = shapes.map((shape) => {
    const at = interiorPoint(shape.geometry);
    const { parentName, parentRecord } = at ? parentAt(at) : { parentName: null, parentRecord: null };
    const own = readName(shape.properties);
    if (own && parentRecord) claimedNames.add(`${parentRecord.id}::${own.toLowerCase()}`);
    return { shape, at, parentName, parentRecord, own };
  });

  /**
   * How many boundaries carry each name under each parent, against how many
   * records do.
   *
   * A name being present is not the same as it being accounted for. Tokyo
   * holds both 豊島区 and 利島村 and Saitama holds both 三郷市 and 美里町 —
   * each pair romanises to one string, so asking merely "is this name taken"
   * loses the second municipality every time. Counting finds it.
   */
  const shapesPerName = new Map();
  for (const { parentRecord, own } of located) {
    if (!parentRecord || !own) continue;
    const k = `${parentRecord.id}::${own.toLowerCase()}`;
    shapesPerName.set(k, (shapesPerName.get(k) ?? 0) + 1);
  }
  const recordsPerName = new Map();
  for (const r of childRecords) {
    const k = `${r.parentId}::${String(r.name).toLowerCase()}`;
    recordsPerName.set(k, (recordsPerName.get(k) ?? 0) + 1);
  }
  /** True while this name has more boundaries under this parent than records. */
  const needsAnother = (key) => (shapesPerName.get(key) ?? 0) > (recordsPerName.get(key) ?? 0);
  const countOneRecord = (key) => recordsPerName.set(key, (recordsPerName.get(key) ?? 0) + 1);

  const newRegions = [];
  const newGeometries = [];
  const unresolved = [];
  const review = [];
  const extraPolygons = [];

  /** Adds the region and geometry pair for one shape. */
  const emit = (shape, shapeId, parentRecord, name, local, nameSource) => {
    const id = allocateId(parentRecord.id);
    newRegions.push({
      id,
      parentId: parentRecord.id,
      admLevel: 2,
      name,
      ...(local ? { nameKo: local, nameEn: name } : {}),
      iso3,
      code: iso3,
      childrenCount: 0,
      // So a later pass can tell these apart from a normal seed, and see what
      // named them without having to re-derive it.
      nameSource,
      sourceShapeId: shapeId,
    });
    newGeometries.push({
      id,
      parentId: parentRecord.id,
      type: "Feature",
      // The geoBoundaries polygon, untouched. This is the whole point.
      geometry: shape.geometry,
      properties: {
        id,
        shapeID: shapeId,
        shapeName: name,
        name: local ?? name,
        level: "city",
        iso3,
        countryId: iso3,
        parentId: parentRecord.id,
        // Not "osm": the app filters osm-sourced features out of every read,
        // so mislabelling these would hide them all over again.
        source: "geoBoundaries",
      },
    });
  };

  for (const { shape, at, parentName, parentRecord, own } of located) {
    const shapeId = shape.properties?.shapeID ?? shape.properties?.id;
    if (!at) {
      unresolved.push({ shapeId, reason: "no interior point could be found" });
      continue;
    }
    if (!parentRecord) {
      unresolved.push({
        shapeId, at,
        reason: parentName
          ? `no region record for parent "${parentName}"`
          : "not inside any parent boundary",
      });
      continue;
    }

    // A shape that already carries its own name needs no name source at all —
    // it is a hole only because the seed never turned it into a record.
    if (own) {
      const key = `${parentRecord.id}::${own.toLowerCase()}`;
      if (!needsAnother(key)) continue; // every boundary of this name has a record
      if (NOT_A_MUNICIPALITY.some((re) => re.test(own))) {
        review.push({
          shapeId, at, parent: parentRecord.name, name: own,
          reason: "not a municipality — a designation for land with no municipality, so no region was emitted",
        });
        continue;
      }
      countOneRecord(key);
      emit(shape, shapeId, parentRecord, own, null, "the shape's own name");
      continue;
    }

    // Name, by where the shape is — never the other source's geometry.
    const hits = nameSources.filter((s) => (s.points.length > 0
      // A point source: does it fall inside this shape?
      ? s.points.some((p) => pointInGeometry(p, shape.geometry))
      // An area source: does this shape sit inside it?
      : s.box && at[0] >= s.box[0] && at[0] <= s.box[2]
        && at[1] >= s.box[1] && at[1] <= s.box[3]
        && pointInGeometry(at, s.geometry)));

    if (hits.length === 0) {
      unresolved.push({
        shapeId, at, parent: parentRecord.name,
        reason: "no name source covers this point",
      });
      continue;
    }

    // Prefer the source polygon closest in size to the shape being named. A
    // point inside a much larger polygon says only that the shape is somewhere
    // within it — a neighbouring municipality would test just as true.
    // A point inside this shape identifies it outright, so it wins over any
    // area source, which can only ever say "somewhere within me".
    const shapeArea = geometryArea(shape.geometry);
    hits.sort((a, b) => (b.points.length > 0) - (a.points.length > 0)
      || Math.abs(a.area - shapeArea) - Math.abs(b.area - shapeArea));

    const best = hits[0];
    const name = best.name;

    if (hits.length > 1 && new Set(hits.map((h) => h.name)).size > 1) {
      review.push({
        shapeId, at, parent: parentRecord.name,
        reason: `name sources disagree: ${[...new Set(hits.map((h) => h.name))].join(" / ")}`,
        chose: name,
      });
    }

    if (NOT_A_MUNICIPALITY.some((re) => re.test(name) || (best.local && re.test(best.local)))) {
      review.push({
        shapeId, at, parent: parentRecord.name, name,
        reason: "not a municipality — a designation for land with no municipality, so no region was emitted",
      });
      continue;
    }

    // Is this name already spoken for? A point inside a much larger source
    // polygon says only that the shape lies within it, so a neighbouring
    // municipality tests just as true. Comparing areas cannot separate the two
    // here: a coastal source polygon is inflated by the territorial water this
    // whole approach exists to avoid, so the honest signal is whether anything
    // already carries the name. Unclaimed means the shape really is the gap.
    // Another piece of a region that already exists. It cannot be seeded as a
    // record of its own — the geometry is keyed by region id, so a second doc
    // would collide — so it is reported for its polygon to be merged into the
    // region's existing one.
    if (best.partOf) {
      const target = childRecords.find((c) => c.parentId === parentRecord.id
        && String(c.name).toLowerCase() === best.partOf.toLowerCase());
      extraPolygons.push({
        shapeId, at, parent: parentRecord.name,
        partOf: best.partOf,
        regionId: target?.id ?? null,
        reason: target
          ? `another polygon of ${best.partOf} (${target.id}); merge it into that region's geometry rather than seeding a second region`
          : `marked as part of "${best.partOf}", but no region of that name exists under ${parentRecord.name}`,
      });
      continue;
    }

    // A point source identifies this shape outright, so the guard below —
    // which exists to catch a shape merely sitting inside a larger polygon —
    // has nothing to catch. Names collide legitimately: Saitama holds both
    // 三郷市 and 美里町, and both romanise to "Misato".
    const claimedKey = `${parentRecord.id}::${name.toLowerCase()}`;
    if (best.points.length === 0 && claimedNames.has(claimedKey) && !needsAnother(claimedKey)) {
      review.push({
        shapeId, at, parent: parentRecord.name, name,
        areaRatio: shapeArea > 0 ? +(best.area / shapeArea).toFixed(1) : null,
        reason: `"${name}" is already on the map, so this match probably means this shape sits inside it rather than is it`,
      });
      continue;
    }
    claimedNames.add(claimedKey);
    countOneRecord(claimedKey);
    recordedNames.add(claimedKey);

    emit(shape, shapeId, parentRecord, name, best.local, best.from);
  }

  // --- the mirror problem: a record whose shape does not exist
  //
  // Filling holes only fixes one direction. A record with no shape draws
  // nothing, cannot be hovered, and still counts against the denominator — so
  // a parent can come out of this with more children than it has boundaries.
  // Reported rather than resolved: removing a record is destructive and is the
  // owner's call, and a missing shape can equally mean the shape is the thing
  // at fault.
  const shapeNamesByParent = new Set();
  const shapesPerParent = new Map();
  for (const { parentRecord, own } of located) {
    if (!parentRecord) continue;
    shapesPerParent.set(parentRecord.id, (shapesPerParent.get(parentRecord.id) ?? 0) + 1);
    if (own) shapeNamesByParent.add(`${parentRecord.id}::${own.toLowerCase()}`);
  }
  for (const r of newRegions) {
    shapeNamesByParent.add(`${r.parentId}::${String(r.name).toLowerCase()}`);
  }

  const phantoms = childRecords
    .filter((r) => !shapeNamesByParent.has(`${r.parentId}::${String(r.name).toLowerCase()}`))
    .map((r) => ({
      id: r.id,
      name: r.name,
      parentId: r.parentId,
      parent: parentRecords.find((p) => p.id === r.parentId)?.name,
      reason: "no boundary under this parent carries this name — the record draws nothing",
    }));

  // --- reconcile: a hole may already have a record, just a broken one
  //
  // The phantoms are not random. They are the same municipalities, filed under
  // the wrong parent (Kawasaki under Tokyo, Kasamatsu under Aichi) or seeded
  // under the unusable name the shape carried ("?????"). Inserting a second
  // record for one of those would leave a duplicate on the map, so the record
  // is repaired in place and keeps its id — anything already pointing at it,
  // a visit included, keeps pointing at the right place.
  const repairs = [];
  const phantomByName = new Map();
  for (const p of phantoms) {
    const k = String(p.name).toLowerCase();
    if (!phantomByName.has(k)) phantomByName.set(k, p);
  }
  const unusablePhantomsByParent = new Map();
  for (const p of phantoms) {
    if (readName({ name: p.name })) continue; // it has a real name
    const list = unusablePhantomsByParent.get(p.parentId) ?? [];
    list.push(p);
    unusablePhantomsByParent.set(p.parentId, list);
  }

  const claimedPhantomIds = new Set();
  for (let i = newRegions.length - 1; i >= 0; i--) {
    const region = newRegions[i];
    const byName = phantomByName.get(String(region.name).toLowerCase());
    const sameParentUnusable = unusablePhantomsByParent.get(region.parentId) ?? [];

    let target = null;
    let kind = null;
    if (byName && !claimedPhantomIds.has(byName.id)) {
      target = byName;
      kind = byName.parentId === region.parentId ? "rename" : "re-parent";
    } else if (sameParentUnusable.length === 1 && !claimedPhantomIds.has(sameParentUnusable[0].id)) {
      target = sameParentUnusable[0];
      kind = "rename";
    } else if (sameParentUnusable.length > 1) {
      review.push({
        shapeId: region.sourceShapeId,
        name: region.name,
        parent: parentRecords.find((p) => p.id === region.parentId)?.name,
        reason: `${sameParentUnusable.length} records under this parent have unusable names, so which one this shape is cannot be told apart — inserted as new, check for a duplicate`,
      });
    }

    if (!target) continue;
    claimedPhantomIds.add(target.id);

    repairs.push({
      id: target.id,
      kind,
      name: { from: target.name, to: region.name },
      parentId: { from: target.parentId, to: region.parentId },
      ...(region.nameKo ? { nameKo: region.nameKo, nameEn: region.nameEn } : {}),
      sourceShapeId: region.sourceShapeId,
      reason: kind === "re-parent"
        ? `record is filed under ${parentRecords.find((p) => p.id === target.parentId)?.name ?? target.parentId} but the boundary is in ${parentRecords.find((p) => p.id === region.parentId)?.name ?? region.parentId}`
        : `record carries "${target.name}", which the shape could not supply`,
    });

    // The geometry keeps the record's existing id rather than a new one.
    const geom = newGeometries[i];
    geom.id = target.id;
    geom.properties.id = target.id;
    geom.properties.parentId = region.parentId;
    geom.parentId = region.parentId;

    usedIds.delete(region.id);
    newRegions.splice(i, 1);
  }

  // A repaired record is no longer a phantom, and no longer an addition.
  const repairedIds = new Set(repairs.map((r) => r.id));
  const remainingPhantoms = phantoms.filter((p) => !repairedIds.has(p.id));

  // --- childrenCount drift: the denominator of every "visited N of M"
  const countsBefore = new Map(parentRecords.map((r) => [r.id, r.childrenCount ?? 0]));
  const delta = new Map();
  const bump = (parentId, by) => delta.set(parentId, (delta.get(parentId) ?? 0) + by);

  for (const r of newRegions) bump(r.parentId, 1);
  // A re-parent moves a child: the wrong parent loses one, the right one gains.
  for (const r of repairs) {
    if (r.parentId.from === r.parentId.to) continue;
    bump(r.parentId.from, -1);
    bump(r.parentId.to, 1);
  }

  const phantomsPerParent = new Map();
  for (const p of remainingPhantoms) {
    phantomsPerParent.set(p.parentId, (phantomsPerParent.get(p.parentId) ?? 0) + 1);
  }

  const childrenCountFixes = [...delta.entries()].map(([parentId, n]) => {
    const was = countsBefore.get(parentId) ?? 0;
    const shapes = shapesPerParent.get(parentId) ?? 0;
    return {
      parentId,
      name: parentRecords.find((r) => r.id === parentId)?.name,
      was,
      change: n,
      childrenCount: was + n,
      /** Boundaries actually present — what the count should agree with. */
      shapes,
      phantomRecords: phantomsPerParent.get(parentId) ?? 0,
      agreesWithShapes: was + n === shapes,
    };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // --- self-checks, because this output is going to be seeded
  const problems = [];
  const ids = new Set();
  for (const r of newRegions) {
    if (ids.has(r.id)) problems.push(`duplicate generated id ${r.id}`);
    ids.add(r.id);
    if (!parentRecords.some((p) => p.id === r.parentId)) {
      problems.push(`${r.id} (${r.name}) points at a parent that does not exist`);
    }
    if (!String(r.id).endsWith(String(r.parentId))) {
      problems.push(`${r.id} does not follow the <prefix><parentId> id scheme`);
    }
  }
  // Every geometry belongs to something: a record being added, or one being
  // repaired in place (which keeps its own id rather than taking a new one).
  if (newGeometries.length !== newRegions.length + repairs.length) {
    problems.push(
      `${newGeometries.length} geometries for ${newRegions.length} new records and ${repairs.length} repairs`,
    );
  }
  const ownerIds = new Set([...newRegions.map((r) => r.id), ...repairs.map((r) => r.id)]);
  for (const g of newGeometries) {
    if (!ownerIds.has(g.id)) problems.push(`geometry ${g.id} belongs to no record`);
  }
  for (const r of repairs) {
    if (!childRecords.some((c) => c.id === r.id)) {
      problems.push(`repair targets ${r.id}, which is not an existing record`);
    }
  }
  for (const g of newGeometries) {
    if (g.properties.source === "osm") problems.push(`${g.id} is marked osm and would be filtered out`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const write = (file, data) => {
    const p = path.join(outDir, file);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    return p;
  };
  write("regions.json", newRegions);
  write("geometries.json", newGeometries);
  write("children-count.json", childrenCountFixes);
  write("unresolved.json", unresolved);
  write("review.json", review);
  write("phantom-records.json", remainingPhantoms);
  write("extra-polygons.json", extraPolygons);
  write("repairs.json", repairs);

  const unnamed = shapes.filter((f) => !hasUsableName(f)).length;
  const fromOwnName = newRegions.filter((r) => r.nameSource === "the shape's own name").length;
  console.log(`shapes in ${path.basename(shapesPath)}: ${shapes.length}`);
  console.log(`  carrying a name:  ${shapes.length - unnamed}`);
  console.log(`  unnamed:          ${unnamed}`);
  console.log(`\nregion records before: ${childRecords.length}`);
  console.log(`holes filled:          ${newRegions.length}`);
  console.log(`  named shapes the seed never recorded: ${fromOwnName}`);
  console.log(`  unnamed shapes named from a source:   ${newRegions.length - fromOwnName}`);
  console.log(`still needs a name from elsewhere:      ${unresolved.length}`);
  console.log(`flagged for review:                     ${review.length}`);
  console.log(`repaired instead of duplicated:        ${repairs.length}`);
  const uncovered = unresolved.length + review.filter((r) => !r.chose).length;
  void extraPolygons;
  console.log(`\nboundaries left without a region: ${uncovered} of ${shapes.length}`);

  if (childrenCountFixes.length > 0) {
    console.log("\nchildrenCount corrections (the 'visited N of M' denominator):");
    for (const c of childrenCountFixes) {
      const flag = c.agreesWithShapes
        ? ""
        : `  <- still ${c.was + c.change - c.shapes > 0 ? "over" : "under"} the ${c.shapes} boundaries present`
          + (c.phantomRecords > 0 ? `, ${c.phantomRecords} record(s) draw nothing` : "");
      const sign = c.change >= 0 ? `+${c.change}` : `${c.change}`;
      console.log(`  ${c.name}: ${c.was} -> ${c.childrenCount}  (${sign})${flag}`);
    }
  }
  if (repairs.length > 0) {
    console.log(`\nexisting records repaired rather than duplicated: ${repairs.length}`);
    for (const r of repairs) {
      console.log(`  ${r.kind}: "${r.name.from}" -> "${r.name.to}"  (${r.reason})`);
    }
  }
  if (extraPolygons.length > 0) {
    console.log(`\nextra polygons for regions that already exist: ${extraPolygons.length}`);
    for (const e of extraPolygons) console.log(`  ${e.partOf} — ${e.reason}`);
  }
  if (remainingPhantoms.length > 0) {
    console.log(`\nrecords with no boundary (draw nothing, still counted): ${remainingPhantoms.length}`);
    for (const p of remainingPhantoms.slice(0, 15)) console.log(`  ${p.parent} / ${p.name}  (${p.id})`);
    if (remainingPhantoms.length > 15) console.log(`  ...and ${remainingPhantoms.length - 15} more, in phantom-records.json`);
  }
  if (unresolved.length > 0) {
    console.log("\nstill unnamed:");
    for (const u of unresolved) {
      console.log(`  ${u.shapeId} ${u.at ? `@${u.at.map((v) => v.toFixed(3)).join(",")}` : ""} — ${u.reason}`);
    }
  }
  if (review.length > 0) {
    console.log("\nreview before seeding:");
    for (const r of review) console.log(`  ${r.name ?? r.shapeId} — ${r.reason}`);
  }

  console.log(`\nwrote ${outDir}/{regions,geometries,repairs,children-count,unresolved,review,phantom-records,extra-polygons}.json`);

  if (problems.length > 0) {
    console.log("\nSELF-CHECK FAILED — do not seed this output:");
    for (const p of problems) console.log(`  ${p}`);
    process.exit(1);
  }
  console.log("self-check passed: ids unique, parents exist, no osm-sourced geometry emitted.");
}

main();

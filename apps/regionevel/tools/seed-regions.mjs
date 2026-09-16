#!/usr/bin/env node
/**
 * Build region records from boundary files, keyed by shapeID.
 *
 * There was no seeder in this repository — only the store primitives nothing
 * called — so this is the one the data should have been built with. The one
 * that actually produced the table matched shapes to records **by name**, and
 * that single choice caused every boundary problem found so far:
 *
 *   Japan          26 shapes carry `shapeName: null` or "?????". A name that
 *                  matches nothing produced no record, so 35 boundaries ended
 *                  up on the map as holes you could not even hover.
 *   El Salvador    the same missing names went in as the literal string
 *                  "Null", so ten municipalities are labelled that on screen.
 *                  Same cause, opposite symptom.
 *   Toshima        Tokyo holds 豊島区 and 利島村; Saitama holds 三郷市 and
 *                  美里町. Each pair is one string once romanised, so matching
 *                  on it silently loses the second municipality. Japan has 103
 *                  such names.
 *   Kawasaki       filed under Tokyo, Kasamatsu under Aichi, Kamikawa under
 *                  Gunma — a name matched in the wrong parent, and the record
 *                  drew nothing ever after.
 *
 * None of those are possible here, because the join is the shapeID:
 *
 *   - a shape always becomes a record, named or not. A missing name is
 *     recorded as missing (`nameMissing: true`) rather than dropping the
 *     boundary or writing a placeholder in as if it were the name.
 *   - two municipalities sharing a romanisation are two shapeIDs, so they are
 *     two records without anything having to notice the collision.
 *   - the parent is resolved by geometry containment, not by name.
 *   - re-running matches records by the shapeID stored on them, so a second
 *     run updates rather than duplicating. Records seeded before this existed
 *     have no shapeId; they are adopted by (parent, name) once, and carry the
 *     shapeID afterwards, so the ambiguity is paid exactly one time.
 *
 * Ids stay numeric: `padId` infers a region's level from the width of its id,
 * and visits, scores and regions all join on that key, so the shapeID is the
 * *matching* key, never the stored id.
 *
 * Writes nothing to Firestore. It emits a plan to review and seed.
 *
 * Usage:
 *   node tools/seed-regions.mjs --iso3 JPN \
 *     --adm1 geoBoundaries-JPN-ADM1.geojson \
 *     --adm2 geoBoundaries-JPN-ADM2.geojson \
 *     --regions reports/all-regions.json \
 *     [--names <gazetteer.geojson>]... [--out reports/seed-JPN]
 */

import fs from "node:fs";
import path from "node:path";
import {
  bbox, featuresOf, interiorPoint, isNotAMunicipality, isUnusableName,
  pointInGeometry, pointsOf, readJson, readName, readNamePair, readShapeId,
} from "./lib/boundaries.mjs";

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const argAll = (flag) => {
  const out = [];
  process.argv.forEach((a, i) => { if (a === flag && process.argv[i + 1]) out.push(process.argv[i + 1]); });
  return out;
};

function main() {
  const iso3 = arg("--iso3");
  const adm1Path = arg("--adm1");
  const adm2Path = arg("--adm2");
  const regionsPath = arg("--regions");
  const namePaths = argAll("--names");
  const outDir = arg("--out", `reports/seed-${iso3 ?? "out"}`);

  if (!iso3 || !adm1Path || !adm2Path || !regionsPath) {
    console.error("Need --iso3, --adm1, --adm2 and --regions. See the header for an example.");
    process.exit(1);
  }

  const adm1 = featuresOf(readJson(adm1Path, fs));
  const adm2 = featuresOf(readJson(adm2Path, fs));
  const existing = featuresOf(readJson(regionsPath, fs));

  const country = existing.find((r) => r.iso3 === iso3 && r.admLevel === 0);
  if (!country) {
    console.error(`No country record for ${iso3} in ${path.basename(regionsPath)}.`);
    process.exit(1);
  }

  const gazetteer = namePaths.flatMap((p) => featuresOf(readJson(p, fs)).map((f) => {
    const pair = readNamePair(f.properties) ?? readNamePair(f);
    return {
      name: pair?.name ?? null,
      local: pair?.local ?? null,
      geometry: typeof f.geometry === "string" ? JSON.parse(f.geometry) : f.geometry,
      from: path.basename(p),
    };
  })).filter((s) => s.name && s.geometry);
  for (const s of gazetteer) { s.box = bbox(s.geometry); s.points = pointsOf(s.geometry); }

  // --- ids follow the table's scheme: a sequential prefix, then the parent's
  //     whole id. Allocation continues from the highest prefix already used.
  const usedIds = new Set(existing.map((r) => String(r.id)));
  const nextPrefix = new Map();
  for (const r of existing) {
    const id = String(r.id);
    const parentId = String(r.parentId ?? "");
    if (!parentId || !id.endsWith(parentId)) continue;
    const n = Number(id.slice(0, id.length - parentId.length));
    const level = r.admLevel ?? -1;
    if (Number.isFinite(n) && n > (nextPrefix.get(level) ?? 0)) nextPrefix.set(level, n);
  }
  const allocateId = (parentId, level) => {
    for (;;) {
      const n = (nextPrefix.get(level) ?? 0) + 1;
      nextPrefix.set(level, n);
      const id = `${n}${parentId}`;
      if (!usedIds.has(id)) { usedIds.add(id); return id; }
    }
  };

  // --- how a boundary finds the record it already has
  const byShapeId = new Map();
  for (const r of existing) {
    const sid = r.shapeId ?? r.sourceShapeId;
    if (sid) byShapeId.set(String(sid), r);
  }
  /** Records with no shapeId yet, indexed for the one-time adoption below. */
  const adoptable = new Map();
  for (const r of existing) {
    if (r.shapeId ?? r.sourceShapeId) continue;
    if (r.iso3 !== iso3 || r.admLevel == null || r.admLevel === 0) continue;
    const k = `${r.parentId}::${String(r.name).toLowerCase().trim()}`;
    const list = adoptable.get(k) ?? [];
    list.push(r);
    adoptable.set(k, list);
  }

  const plan = { added: [], adopted: [], updated: [], unchanged: [], skipped: [] };
  const geometries = [];

  /** The name for a shape: its own, else a gazetteer point or polygon over it. */
  const nameFor = (shape, at) => {
    const own = readNamePair(shape.properties);
    if (own?.name) return { ...own, from: "the shape itself" };
    const hits = gazetteer.filter((s) => (s.points.length > 0
      ? s.points.some((p) => pointInGeometry(p, shape.geometry))
      : s.box && at && at[0] >= s.box[0] && at[0] <= s.box[2]
        && at[1] >= s.box[1] && at[1] <= s.box[3] && pointInGeometry(at, s.geometry)));
    // A point identifies the shape; a polygon only says it is somewhere inside.
    hits.sort((a, b) => (b.points.length > 0) - (a.points.length > 0));
    return hits[0] ? { name: hits[0].name, local: hits[0].local, from: hits[0].from } : null;
  };

  const parentBoxes = adm1.map((f) => ({ f, box: bbox(f.geometry) }));

  /**
   * One level of the hierarchy, from boundaries to records.
   *
   * `parentFor` maps a shape to the record it hangs under, which is how a
   * city's prefecture is decided by where it is rather than what it is called.
   */
  const seedLevel = (features, admLevel, parentFor) => {
    for (const shape of features) {
      const shapeId = readShapeId(shape);
      const at = interiorPoint(shape.geometry);
      if (!shapeId) {
        plan.skipped.push({ reason: "the boundary carries no shapeID to key on", at });
        continue;
      }

      const parent = at ? parentFor(at) : null;
      if (!parent) {
        plan.skipped.push({ shapeId, at, reason: "not inside any parent boundary" });
        continue;
      }

      const named = nameFor(shape, at);
      if (isNotAMunicipality(named?.name, named?.local)) {
        plan.skipped.push({
          shapeId, at, parent: parent.name, name: named.name,
          reason: "a designation for land with no municipality — a region nobody could visit",
        });
        continue;
      }

      // A boundary always gets a record. Missing names are recorded as
      // missing, never written out as a name and never a reason to drop it.
      const nameMissing = !named?.name;
      const name = named?.name ?? `${parent.name} unnamed ${shapeId.slice(-6)}`;

      let record = byShapeId.get(shapeId);
      let how = "updated";
      if (!record) {
        const key = `${parent.id}::${String(named?.name ?? "").toLowerCase().trim()}`;
        const candidates = adoptable.get(key);
        if (!nameMissing && candidates?.length) {
          record = candidates.shift(); // one record per boundary, even when names collide
          how = "adopted";
        }
      }
      if (!record) {
        record = { id: allocateId(parent.id, admLevel) };
        how = "added";
      }

      const next = {
        id: String(record.id),
        parentId: String(parent.id),
        admLevel,
        name,
        ...(named?.local ? { nameKo: named.local, nameEn: named.name } : {}),
        iso3,
        code: iso3,
        childrenCount: record.childrenCount ?? 0,
        // The join key. Everything above exists so that this, not the name, is
        // what a re-run matches on.
        shapeId,
        ...(nameMissing ? { nameMissing: true } : {}),
        ...(named?.from && !nameMissing ? { nameSource: named.from } : {}),
      };

      const same = record.id != null
        && String(record.name) === next.name
        && String(record.parentId) === next.parentId
        && (record.shapeId ?? record.sourceShapeId) === shapeId;
      if (how === "updated" && same) plan.unchanged.push(next);
      else plan[how].push({ ...next, ...(how !== "added" ? { was: { name: record.name, parentId: record.parentId } } : {}) });

      geometries.push({
        id: next.id,
        parentId: next.parentId,
        type: "Feature",
        geometry: shape.geometry,
        properties: {
          id: next.id,
          shapeID: shapeId,
          shapeName: next.name,
          name: named?.local ?? next.name,
          level: admLevel === 1 ? "prefecture" : "city",
          iso3,
          countryId: iso3,
          parentId: next.parentId,
          source: "geoBoundaries",
        },
      });

      byShapeId.set(shapeId, next);
    }
  };

  // ADM1 hangs off the country; ADM2 off whichever ADM1 contains it.
  seedLevel(adm1, 1, () => country);

  const adm1ByShapeId = new Map();
  for (const f of adm1) {
    const sid = readShapeId(f);
    const rec = sid ? byShapeId.get(sid) : null;
    if (rec) adm1ByShapeId.set(f, rec);
  }
  seedLevel(adm2, 2, (at) => {
    const hit = parentBoxes.find(({ f, box }) =>
      box && at[0] >= box[0] && at[0] <= box[2] && at[1] >= box[1] && at[1] <= box[3]
      && pointInGeometry(at, f.geometry));
    return hit ? adm1ByShapeId.get(hit.f) ?? null : null;
  });

  // --- childrenCount, from what is actually there
  const counts = new Map();
  const all = [...plan.added, ...plan.adopted, ...plan.updated, ...plan.unchanged];
  for (const r of all) counts.set(r.parentId, (counts.get(r.parentId) ?? 0) + 1);
  for (const r of all) if (counts.has(r.id)) r.childrenCount = counts.get(r.id);

  // --- self-checks: this output is going to be seeded
  const problems = [];
  const seenId = new Set();
  const seenShape = new Set();
  for (const r of all) {
    if (seenId.has(r.id)) problems.push(`two records share id ${r.id}`);
    seenId.add(r.id);
    if (seenShape.has(r.shapeId)) problems.push(`two records share shapeId ${r.shapeId}`);
    seenShape.add(r.shapeId);
    if (!String(r.id).endsWith(String(r.parentId))) {
      problems.push(`${r.id} does not follow the <prefix><parentId> id scheme`);
    }
    if (isUnusableName(r.name) && !r.nameMissing) problems.push(`${r.id} has an unusable name`);
  }
  if (geometries.length !== all.length) {
    problems.push(`${geometries.length} geometries for ${all.length} records`);
  }
  const shapeTotal = adm1.length + adm2.length;
  if (all.length + plan.skipped.length !== shapeTotal) {
    problems.push(`${shapeTotal} boundaries in, ${all.length + plan.skipped.length} accounted for`);
  }

  // Not a failure: two municipalities under one parent legitimately share a
  // romanisation, which is the whole reason this keys on shapeID. But it also
  // catches one place split across two boundaries, which becomes two regions
  // here — worth a look before seeding, since only a person can tell those
  // apart.
  const sameName = new Map();
  for (const r of all) {
    const k = `${r.parentId}::${String(r.name).toLowerCase()}`;
    sameName.set(k, [...(sameName.get(k) ?? []), r]);
  }
  const collisions = [...sameName.values()].filter((l) => l.length > 1);

  fs.mkdirSync(outDir, { recursive: true });
  const write = (f, d) => fs.writeFileSync(path.join(outDir, f), JSON.stringify(d, null, 2));
  write("regions.json", all);
  write("geometries.json", geometries);
  write("plan.json", { added: plan.added, adopted: plan.adopted, updated: plan.updated, skipped: plan.skipped });

  const unnamed = all.filter((r) => r.nameMissing);
  console.log(`boundaries in: ${shapeTotal}  (ADM1 ${adm1.length}, ADM2 ${adm2.length})`);
  console.log(`\n  added:     ${plan.added.length}`);
  console.log(`  adopted:   ${plan.adopted.length}   (existing records, matched once by name, now carrying their shapeId)`);
  console.log(`  updated:   ${plan.updated.length}`);
  console.log(`  unchanged: ${plan.unchanged.length}`);
  console.log(`  skipped:   ${plan.skipped.length}`);
  console.log(`\nrecords with no name from any source: ${unnamed.length}`);
  if (unnamed.length) {
    console.log("  kept as records and flagged, rather than dropped — a boundary with no");
    console.log("  region is a hole on the map, which is the failure this replaces:");
    for (const r of unnamed.slice(0, 8)) console.log(`    ${r.shapeId} under ${r.parentId}`);
    if (unnamed.length > 8) console.log(`    … and ${unnamed.length - 8} more`);
  }
  for (const s of plan.skipped.slice(0, 10)) {
    console.log(`  skipped ${s.shapeId ?? "(no shapeID)"} — ${s.reason}`);
  }

  if (collisions.length) {
    console.log(`\nnames shared by more than one region under the same parent: ${collisions.length}`);
    console.log("  expected where two municipalities romanise alike; a problem only where");
    console.log("  one place is split across two boundaries — check before seeding:");
    for (const l of collisions.slice(0, 6)) {
      console.log(`    ${l[0].name} x${l.length} under ${l[0].parentId}  [${l.map((r) => r.shapeId.slice(-8)).join(", ")}]`);
    }
    if (collisions.length > 6) console.log(`    … and ${collisions.length - 6} more, in plan.json`);
    write("name-collisions.json", collisions);
  }

  console.log(`\nwrote ${outDir}/{regions,geometries,plan}.json`);
  if (problems.length) {
    console.log("\nSELF-CHECK FAILED — do not seed this output:");
    for (const p of problems.slice(0, 10)) console.log(`  ${p}`);
    process.exit(1);
  }
  console.log("self-check passed: one record per boundary, ids unique and well-formed, no name invented.");
}

main();

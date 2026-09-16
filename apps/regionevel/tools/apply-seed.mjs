#!/usr/bin/env node
/**
 * Apply a fill or seed plan to Firestore.
 *
 * The other tools only ever emit files. This is the one that writes, so it is
 * deliberately the most cautious thing here:
 *
 *   - it refuses to do anything until you pass --apply. The default is a dry
 *     run that prints exactly what it would write.
 *   - it backs up every document it is about to touch, to a file, before
 *     touching any of them. A repair rewrites a record that may already have
 *     visits pointed at it, and there is no undo otherwise.
 *   - it re-reads each target first and stops if the live document has drifted
 *     from what the plan expects. A plan built against an export is a claim
 *     about the past; this checks it still holds.
 *   - writes go in small batches, and it reports what it did even when it
 *     fails partway, so a second run can pick up from there.
 *
 * `regions` is `allow write: if false` in the rules, so this needs Admin SDK
 * credentials, which bypass rules. Point GOOGLE_APPLICATION_CREDENTIALS at a
 * service account key for the project.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node tools/apply-seed.mjs --plan reports/fill-JPN --project p-plan          # dry run
 *   node tools/apply-seed.mjs --plan reports/fill-JPN --project p-plan --apply
 *
 * Needs firebase-admin:  pnpm add -w -D firebase-admin
 */

import fs from "node:fs";
import path from "node:path";

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const APPLY = process.argv.includes("--apply");

const REGIONS = "regions";
const GEOMETRIES = "regionevel_geometries";

function readIfPresent(dir, file) {
  const p = path.join(dir, file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
}

async function main() {
  const planDir = arg("--plan");
  const projectId = arg("--project", "p-plan");
  if (!planDir) {
    console.error("Need --plan <dir>, the output directory of fill-unnamed-boundaries or seed-regions.");
    process.exit(1);
  }

  const newRegions = readIfPresent(planDir, "regions.json");
  const geometries = readIfPresent(planDir, "geometries.json");
  const repairs = readIfPresent(planDir, "repairs.json");
  const childrenCount = readIfPresent(planDir, "children-count.json");

  const totalWrites = newRegions.length + geometries.length + repairs.length + childrenCount.length;
  console.log(`plan: ${path.basename(planDir)}`);
  console.log(`  new regions:        ${newRegions.length}`);
  console.log(`  geometries:         ${geometries.length}`);
  console.log(`  repairs:            ${repairs.length}  (rewrite existing records)`);
  console.log(`  childrenCount sets: ${childrenCount.length}`);
  console.log(`  ${totalWrites} writes in total\n`);

  if (!APPLY) {
    console.log("DRY RUN — nothing will be written. Re-run with --apply to commit.\n");
    for (const r of repairs) {
      console.log(`  repair ${r.id}: name ${JSON.stringify(r.name.from)} -> ${JSON.stringify(r.name.to)}`
        + (r.parentId.from !== r.parentId.to ? `, parent ${r.parentId.from} -> ${r.parentId.to}` : ""));
    }
    for (const c of childrenCount) console.log(`  childrenCount ${c.name}: ${c.was} -> ${c.childrenCount}`);
    console.log(`  ...and ${newRegions.length} new regions with ${geometries.length} geometries`);
    return;
  }

  let admin;
  try {
    admin = await import("firebase-admin");
  } catch {
    console.error("firebase-admin is not installed.  pnpm add -w -D firebase-admin");
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS is not set. `regions` denies writes to anything else.");
    process.exit(1);
  }

  const app = admin.default.initializeApp({
    credential: admin.default.credential.applicationDefault(),
    projectId,
  });
  const db = admin.default.firestore(app);

  // --- 1. drift check, before anything is written
  console.log("checking the plan still matches what is live…");
  const drift = [];
  for (const r of repairs) {
    const snap = await db.collection(REGIONS).doc(String(r.id)).get();
    if (!snap.exists) { drift.push(`${r.id} no longer exists`); continue; }
    const d = snap.data();
    if (String(d.name) !== String(r.name.from)) {
      drift.push(`${r.id} is named ${JSON.stringify(d.name)}, plan expected ${JSON.stringify(r.name.from)}`);
    }
    if (String(d.parentId) !== String(r.parentId.from)) {
      drift.push(`${r.id} sits under ${d.parentId}, plan expected ${r.parentId.from}`);
    }
  }
  for (const r of newRegions) {
    const snap = await db.collection(REGIONS).doc(String(r.id)).get();
    if (snap.exists) drift.push(`${r.id} already exists (${snap.data().name}) — the plan would overwrite it`);
  }
  if (drift.length) {
    console.error("\nThe live data has moved since the plan was built. Nothing written:");
    for (const d of drift.slice(0, 20)) console.error(`  ${d}`);
    console.error("\nRe-export the regions and re-run the fill tool.");
    process.exit(1);
  }
  console.log("  matches.\n");

  // --- 2. back up everything about to be touched
  const backup = { at: new Date().toISOString(), projectId, regions: [], geometries: [] };
  const touchedRegionIds = [
    ...repairs.map((r) => String(r.id)),
    ...childrenCount.map((c) => String(c.parentId)),
  ];
  for (const id of new Set(touchedRegionIds)) {
    const snap = await db.collection(REGIONS).doc(id).get();
    if (snap.exists) backup.regions.push({ id, data: snap.data() });
  }
  for (const g of geometries) {
    const snap = await db.collection(GEOMETRIES).doc(String(g.id)).get();
    if (snap.exists) backup.geometries.push({ id: String(g.id), data: snap.data() });
  }
  const backupPath = path.join(planDir, `backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`backed up ${backup.regions.length} regions and ${backup.geometries.length} geometries`);
  console.log(`  -> ${backupPath}\n`);

  // --- 3. write, in batches, reporting as it goes
  const BATCH = 200;
  let written = 0;
  const commit = async (ops, label) => {
    for (let i = 0; i < ops.length; i += BATCH) {
      const chunk = ops.slice(i, i + BATCH);
      const batch = db.batch();
      for (const op of chunk) op(batch);
      await batch.commit();
      written += chunk.length;
      process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH, ops.length)}/${ops.length}   `);
    }
    process.stdout.write("\n");
  };

  await commit(newRegions.map((r) => (b) => {
    const { nameSource, sourceShapeId, ...rest } = r;
    b.set(db.collection(REGIONS).doc(String(r.id)), {
      ...rest,
      // Keep the join key on the record, so a re-seed matches on it rather
      // than on the name that caused all of this.
      ...(sourceShapeId ? { shapeId: sourceShapeId } : {}),
    });
  }), "new regions");

  await commit(repairs.map((r) => (b) => {
    b.update(db.collection(REGIONS).doc(String(r.id)), {
      name: r.name.to,
      parentId: String(r.parentId.to),
      ...(r.nameKo ? { nameKo: r.nameKo, nameEn: r.nameEn } : {}),
      ...(r.sourceShapeId ? { shapeId: r.sourceShapeId } : {}),
    });
  }), "repairs");

  await commit(geometries.map((g) => (b) => {
    b.set(db.collection(GEOMETRIES).doc(String(g.id)), {
      ...g,
      // Firestore rejects deeply nested arrays, which a polygon is.
      geometry: JSON.stringify(g.geometry),
    });
  }), "geometries");

  await commit(childrenCount.map((c) => (b) => {
    b.update(db.collection(REGIONS).doc(String(c.parentId)), { childrenCount: c.childrenCount });
  }), "childrenCount");

  console.log(`\ndone: ${written} writes.`);
  console.log(`if anything looks wrong, ${path.basename(backupPath)} holds every document as it was.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

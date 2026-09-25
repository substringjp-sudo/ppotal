#!/usr/bin/env node
/**
 * Write a topojson bundle built by `build-bundle.mjs` to Firestore.
 *
 * Separate from the builder so that building can never write. Same posture as
 * `apply-seed.mjs`: --apply is required, the existing document is backed up
 * first, and the write is refused if the file would not fit.
 *
 * The bundle is one document, `regionevel_geometries_bundles/<ISO3>_ADM<level>`,
 * and the city map merges it with the live geometry documents. Replacing it
 * changes what every viewer sees at country level, so it is worth the same care
 * as the region writes.
 *
 * Install from the REPOSITORY ROOT: apps/regionevel has its own
 * pnpm-workspace.yaml covering only its own apps/* and packages/*, so a
 * `pnpm install` run from inside it cannot see @ppotal/ui at the repo root and
 * fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND.
 *
 * Usage:
 *   pnpm install                                   # from the repo root
 *   cd apps/regionevel
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node tools/apply-bundle.mjs --bundle reports/bundle-JPN/JPN_ADM2.json --iso3 JPN --level 2    # dry run
 *   node tools/apply-bundle.mjs --bundle reports/bundle-JPN/JPN_ADM2.json --iso3 JPN --level 2 --apply
 */

import fs from "node:fs";
import path from "node:path";

const arg = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const APPLY = process.argv.includes("--apply");

const COLLECTION = "regionevel_geometries_bundles";
const DOC_LIMIT = 1048576;

async function main() {
  const bundlePath = arg("--bundle");
  const iso3 = arg("--iso3");
  const level = Number(arg("--level", "2"));
  const projectId = arg("--project", "p-plan");
  if (!bundlePath || !iso3) {
    console.error("Need --bundle <file> and --iso3. See the header for an example.");
    process.exit(1);
  }
  if (!fs.existsSync(bundlePath)) {
    console.error(`No such bundle: ${bundlePath}`);
    process.exit(1);
  }

  const data = fs.readFileSync(bundlePath, "utf8");
  const docId = `${iso3}_ADM${level}`;

  // Parse it here rather than trusting the filename: writing a malformed
  // bundle empties the country map for everyone.
  let topo;
  try {
    topo = JSON.parse(data);
  } catch (e) {
    console.error(`${bundlePath} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  const objectKey = Object.keys(topo.objects ?? {})[0];
  if (topo.type !== "Topology" || !objectKey) {
    console.error(`${bundlePath} is not a topojson topology with at least one object.`);
    process.exit(1);
  }
  const shapes = topo.objects[objectKey]?.geometries?.length ?? 0;

  console.log(`bundle:    ${path.basename(bundlePath)}`);
  console.log(`document:  ${COLLECTION}/${docId}`);
  console.log(`shapes:    ${shapes}`);
  console.log(`size:      ${data.length.toLocaleString()} bytes of a ${DOC_LIMIT.toLocaleString()} limit`);
  console.log(`arcs:      ${topo.arcs?.length ?? 0}`);

  if (data.length > DOC_LIMIT * 0.95) {
    console.error(`\nToo close to the document limit to write safely. Rebuild with a lower --keep.`);
    process.exit(1);
  }
  if (shapes === 0) {
    console.error(`\nThe bundle holds no shapes. Refusing.`);
    process.exit(1);
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply to commit.`);
    return;
  }

  let admin;
  try {
    admin = await import("firebase-admin");
  } catch {
    console.error("firebase-admin is not installed. Run `pnpm install` from the repo root.");
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS is not set. It takes the path to the key file, not its contents.");
    process.exit(1);
  }

  const app = admin.default.initializeApp({
    credential: admin.default.credential.applicationDefault(),
    projectId,
  });
  const db = admin.default.firestore(app);
  const ref = db.collection(COLLECTION).doc(docId);

  // Back up whatever is there, so a bad bundle is one restore away.
  const snap = await ref.get();
  if (snap.exists) {
    const backupPath = path.join(path.dirname(bundlePath), `backup-${docId}-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(snap.data(), null, 2));
    const prev = snap.data();
    // `updatedAt` is a string on the bundles this tool writes but a Firestore
    // Timestamp on the ones written before it, and interpolating that gives
    // "[object Object]". Take whichever form is there.
    const prevWhen = typeof prev?.updatedAt === "string"
      ? prev.updatedAt
      : (prev?.updatedAt?.toDate?.().toISOString() ?? snap.updateTime?.toDate?.().toISOString() ?? "unknown");
    console.log(`\nbacked up the existing bundle (${String(prev?.data ?? "").length.toLocaleString()} bytes, updated ${prevWhen})`);
    console.log(`  -> ${backupPath}`);
  } else {
    console.log(`\nno existing bundle at ${docId}; this creates it.`);
  }

  await ref.set({
    iso3,
    admLevel: level,
    data,
    updatedAt: new Date().toISOString(),
  });

  console.log(`\ndone: ${docId} now holds ${shapes} shapes.`);
  console.log(`The city map merges this with the live documents, so viewers see it once their cache expires.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Seeds Firestore with region metadata from data/meta/{ISO3}.json
 *
 * Prerequisites:
 *   1. Create a Firebase project and enable Firestore
 *   2. Download a service account key: Firebase Console → Project Settings
 *      → Service Accounts → Generate new private key → save as scripts/serviceAccount.json
 *   3. Install firebase-admin: pnpm add -Dw firebase-admin
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccount.json \
 *   npx tsx scripts/seed-firestore.ts KOR
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Region } from "@regionevel/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ISO3 = process.argv[2] ?? "KOR";
const metaFile = join(__dirname, "../data/meta", `${ISO3}.json`);
const regions = JSON.parse(readFileSync(metaFile, "utf-8")) as Region[];

async function main() {
  // Dynamically import firebase-admin to avoid breaking when not installed
  let admin: typeof import("firebase-admin");
  try {
    admin = await import("firebase-admin");
  } catch {
    console.error("firebase-admin not installed. Run: pnpm add -Dw firebase-admin");
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();
  const BATCH_SIZE = 499;
  let total = 0;

  for (let i = 0; i < regions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const region of regions.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection("regions").doc(region.id), region);
    }
    await batch.commit();
    total += Math.min(BATCH_SIZE, regions.length - i);
    console.log(`Seeded ${total}/${regions.length} regions…`);
  }

  console.log(`Done. ${regions.length} regions written to Firestore.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Deploy Firestore and Storage security rules using Firebase Admin SDK,
 * bypassing the firebase-tools CLI permission requirements.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccount.json \
 *   npx tsx scripts/deploy-rules.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";
import { readFileSync } from "fs";
import { join } from "path";
import serviceAccount from "./serviceAccount.json";

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
}

const root = new URL("..", import.meta.url).pathname;
const rules = getSecurityRules();

async function deployFirestoreRules() {
  const source = readFileSync(join(root, "firestore.rules"), "utf8");
  console.log("Deploying Firestore rules…");
  await rules.releaseFirestoreRulesetFromSource(source);
  console.log("  ✓ Firestore rules deployed");
}

async function deployStorageRules() {
  const source = readFileSync(join(root, "storage.rules"), "utf8");
  const bucket = `${serviceAccount.project_id}.firebasestorage.app`;
  console.log("Deploying Storage rules…");
  await rules.releaseStorageRulesetFromSource(source, bucket);
  console.log("  ✓ Storage rules deployed");
}

async function main() {
  await deployFirestoreRules();
  await deployStorageRules();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

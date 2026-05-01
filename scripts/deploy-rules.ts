/**
 * Deploy Firestore and Storage security rules using Firebase Admin SDK,
 * bypassing the firebase-tools CLI permission requirements.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccount.json \
 *   npx tsx scripts/deploy-rules.ts
 */

import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const root = new URL("..", import.meta.url).pathname;
const rules = getSecurityRules();

function getProjectId(): string {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  
  try {
    const firebaserc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    const id = firebaserc.projects?.default;
    if (id) return id;
  } catch (e) {
    // Fallback
  }
  
  return (getApps()[0].options.credential as any)?.projectId || "regionevel";
}

async function deployFirestoreRules() {
  const source = readFileSync(join(root, "firestore.rules"), "utf8");
  const projectId = getProjectId();
  console.log(`Deploying Firestore rules to project ${projectId}…`);
  await rules.releaseFirestoreRulesetFromSource(source);
  console.log("  ✓ Firestore rules deployed");
}

async function deployStorageRules() {
  const source = readFileSync(join(root, "storage.rules"), "utf8");
  const projectId = getProjectId();
  const bucket = `${projectId}.firebasestorage.app`;
  console.log(`Deploying Storage rules for bucket ${bucket} to project ${projectId}…`);
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

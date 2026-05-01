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

function flattenTree(tree: any[]): Region[] {
  const regions: Region[] = [];
  for (const country of tree) {
    regions.push({
      id: country.id,
      parentId: null,
      name: country.name,
      iso3: country.code,
      admLevel: 0,
    });
    if (country.prefectures) {
      for (const pref of country.prefectures) {
        regions.push({
          id: pref.id,
          parentId: country.id,
          name: pref.name,
          iso3: country.code,
          admLevel: 1,
        });
        if (pref.cities) {
          for (const city of pref.cities) {
            regions.push({
              id: city.id,
              parentId: pref.id,
              name: city.name,
              iso3: country.code,
              admLevel: 2,
            });
          }
        }
      }
    }
  }
  return regions;
}

const args = process.argv.slice(2);
const useTree = args.includes("--tree");
const useGeo = args.includes("--geo");
const ISO3 = (useTree || useGeo) ? null : (args[0] ?? "KOR");

function getProjectId(): string {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    const firebaserc = JSON.parse(readFileSync(join(__dirname, "../.firebaserc"), "utf8"));
    return firebaserc.projects?.default || "regionevel";
  } catch {
    return "regionevel";
  }
}

async function main() {
  // Dynamically import firebase-admin
  let admin: any;
  try {
    admin = (await import("firebase-admin")).default;
  } catch {
    console.error("firebase-admin not installed. Run: pnpm add -Dw firebase-admin");
    process.exit(1);
  }

  const projectId = getProjectId();
  console.log(`Using project ID: ${projectId}`);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
  const db = admin.firestore();

  if (useGeo) {
    console.log("Seeding geometries...");
    const geoDir = join(__dirname, "../apps/web/public/geo");
    const worldFile = join(geoDir, "world.json");
    
    // 1. World features (Countries)
    const worldData = JSON.parse(readFileSync(worldFile, "utf-8"));
    await seedGeoCollection(db, worldData.features, null);

    // 2. Country features (Prefectures)
    const countriesDir = join(geoDir, "countries");
    const fs = await import("fs");
    const countryFiles = fs.readdirSync(countriesDir).filter(f => f.endsWith(".json"));
    for (const file of countryFiles) {
      const countryId = file.replace(".json", "");
      const data = JSON.parse(readFileSync(join(countriesDir, file), "utf-8"));
      await seedGeoCollection(db, data.features, countryId);
    }

    // 3. Prefecture features (Cities)
    const prefecturesDir = join(geoDir, "prefectures");
    if (fs.existsSync(prefecturesDir)) {
      const prefFiles = fs.readdirSync(prefecturesDir).filter(f => f.endsWith(".json"));
      for (const file of prefFiles) {
        const prefId = file.replace(".json", "");
        const data = JSON.parse(readFileSync(join(prefecturesDir, file), "utf-8"));
        await seedGeoCollection(db, data.features, prefId);
      }
    }

    console.log("Geometries seeding done.");
    process.exit(0);
  }

  let regions: Region[];
  if (useTree) {
    const treeFile = join(__dirname, "../apps/web/public/data/meta/tree.json");
    const tree = JSON.parse(readFileSync(treeFile, "utf-8"));
    regions = flattenTree(tree);
    console.log(`Loading from tree.json: ${regions.length} regions`);
  } else {
    const metaFile = join(__dirname, "../data/meta", `${ISO3}.json`);
    regions = JSON.parse(readFileSync(metaFile, "utf-8")) as Region[];
    console.log(`Loading from ${ISO3}.json: ${regions.length} regions`);
  }

  const BATCH_SIZE = 499;
  let total = 0;

  for (let i = 0; i < regions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = regions.slice(i, i + BATCH_SIZE);
    for (const region of chunk) {
      batch.set(db.collection("regions").doc(region.id), region);
    }
    await batch.commit();
    total += chunk.length;
    console.log(`Seeded ${total}/${regions.length} regions…`);
  }

  console.log(`Done. ${regions.length} regions written to Firestore.`);
  process.exit(0);
}

async function seedGeoCollection(db: any, features: any[], parentId: string | null) {
  const BATCH_SIZE = 499;
  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = features.slice(i, i + BATCH_SIZE);
    for (const feature of chunk) {
      const id = feature.properties.id || feature.properties.shapeID;
      if (!id) continue;
      
      const geometryString = JSON.stringify(feature.geometry);
      // Firestore document limit is 1MB (1,048,576 bytes). 
      // We check the string length as a proxy for bytes.
      if (geometryString.length > 1000000) {
        console.error(`  [SKIP] Geometry for ${id} is too large (${(geometryString.length / 1024).toFixed(1)} KB)`);
        continue;
      }

      batch.set(db.collection("geometries").doc(id), {
        type: feature.type,
        properties: feature.properties,
        geometry: geometryString,
        parentId,
      });
    }
    await batch.commit();
    console.log(`  Seeded ${i + chunk.length} geometries for parent ${parentId || "WORLD"}...`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

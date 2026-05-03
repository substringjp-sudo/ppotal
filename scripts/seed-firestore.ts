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
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Region } from "@regionevel/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Normalizes an ID to a fixed length based on its type:
 * - Country: 3 digits (e.g., "001")
 * - Prefecture: 7 digits
 * - City: 12 digits
 */
const padId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return "";
  const s = String(id).trim();
  if (!/^\d+$/.test(s)) return s;
  
  const len = s.length;
  if (len <= 3) return s.padStart(3, "0");
  if (len <= 7) return s.padStart(7, "0");
  return s.padStart(12, "0");
};

function flattenTree(tree: any[]): Region[] {
  const regions: Region[] = [];
  for (const country of tree) {
    const paddedCountryId = padId(country.id);
    regions.push({
      id: paddedCountryId,
      parentId: null,
      name: country.name,
      iso3: country.code || "",
      code: country.code,
      admLevel: 0,
      childrenCount: country.prefectures?.length ?? 0,
    });
    if (country.prefectures) {
      for (const pref of country.prefectures) {
        const paddedPrefId = padId(pref.id);
        regions.push({
          id: paddedPrefId,
          parentId: paddedCountryId,
          name: pref.name,
          iso3: country.code || "",
          code: country.code,
          admLevel: 1,
          childrenCount: pref.cities?.length ?? 0,
        });
        if (pref.cities) {
          for (const city of pref.cities) {
            regions.push({
              id: padId(city.id),
              parentId: paddedPrefId,
              name: city.name,
              iso3: country.code || "",
              code: country.code,
              admLevel: 2,
              childrenCount: 0,
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

  const rootTree = join(__dirname, "../data/raw/tree.json");
  const publicTree = join(__dirname, "../apps/web/public/data/meta/tree.json");
  const treeFile = existsSync(rootTree) ? rootTree : publicTree;
  const tree = JSON.parse(readFileSync(treeFile, "utf-8"));
  const allRegions = flattenTree(tree);
  
  const isoMap = new Map<string, string>();
  for (const r of allRegions) {
    const id = padId(r.id);
    if (r.iso3) isoMap.set(r.iso3.toUpperCase(), id);
    if (r.code) isoMap.set(r.code.toUpperCase(), id);
  }

  if (useGeo) {
    console.log("Seeding geometries from processed maps...");
    const geoDir = join(__dirname, "../data/processed/maps");
    const worldFile = join(geoDir, "world.geojson");
    
    // 1. World features (Countries)
    if (existsSync(worldFile)) {
      const worldData = JSON.parse(readFileSync(worldFile, "utf-8"));
      await seedGeoCollection(db, worldData.features, null, isoMap);
    }

    // 2. Country features (Prefectures)
    const countriesDir = join(geoDir, "countries");
    if (existsSync(countriesDir)) {
      const countryFiles = readdirSync(countriesDir).filter(f => f.endsWith(".geojson"));
      for (const file of countryFiles) {
        // file.replace(".geojson", "") might be "CHN", need to map it to numeric if possible
        const rawCountryId = file.replace(".geojson", "");
        let countryId = padId(rawCountryId);
        if (!/^\d+$/.test(rawCountryId)) {
          countryId = isoMap.get(rawCountryId.toUpperCase()) || countryId;
        }

        const data = JSON.parse(readFileSync(join(countriesDir, file), "utf-8"));
        await seedGeoCollection(db, data.features, countryId, isoMap);
      }
    }

    console.log("Geometries seeding done.");
    process.exit(0);
  }

  const regions = allRegions;

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

async function seedGeoCollection(db: any, features: any[], parentId: string | null, isoMap?: Map<string, string>) {
  const batchSize = 100;
  for (let i = 0; i < features.length; i += batchSize) {
    const batch = db.batch();
    const chunk = features.slice(i, i + batchSize);
    for (const feature of chunk) {
      const rawId = feature.properties.id || feature.properties.shapeID || feature.id;
      let id = padId(rawId);

      // If ID is alphabetic (e.g. "CHN"), map to numeric via isoMap
      if (isoMap && typeof rawId === "string" && !/^\d+$/.test(rawId)) {
        const mappedId = isoMap.get(rawId.toUpperCase());
        if (mappedId) {
          id = mappedId;
        }
      }

      // Convert geometry to string if it's too large, but for now just skip if truly massive
      // Firestore has 1MB limit per document
      const geometryString = JSON.stringify(feature.geometry);
      if (geometryString.length > 1000000) {
        console.log(`  [SKIP] Geometry for ${id} is too large (${(geometryString.length / 1024).toFixed(1)} KB)`);
        continue;
      }

      // Overwrite the ID in properties to ensure it's always numeric in the frontend
      feature.properties.id = id;

      batch.set(db.collection("geometries").doc(id), {
        type: feature.type,
        properties: feature.properties,
        geometry: geometryString,
        parentId,
      });
    }
    await batch.commit();
  }
  console.log(`  Seeded ${features.length} geometries for parent ${parentId || "root"}...`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

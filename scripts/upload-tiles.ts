/**
 * Upload map tile files to Firebase Storage under gs://<bucket>/tiles/.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccount.json \
 *   npx tsx scripts/upload-tiles.ts [--geojson] [--pmtiles] [ISO3...]
 *
 * Flags:
 *   --geojson   upload GeoJSON files from apps/web/public/data/  (default when no PMTiles found)
 *   --pmtiles   upload PMTiles files from public/tiles/
 *
 * Examples:
 *   npx tsx scripts/upload-tiles.ts --geojson          # upload KOR GeoJSON
 *   npx tsx scripts/upload-tiles.ts --pmtiles KOR USA  # upload specific PMTiles
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { createReadStream, statSync, readdirSync } from "fs";
import { join, basename } from "path";
import serviceAccount from "./serviceAccount.json";

const PROJECT_ID = serviceAccount.project_id;
const BUCKET = `${PROJECT_ID}.firebasestorage.app`;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    storageBucket: BUCKET,
  });
}

const bucket = getStorage().bucket();
const root = new URL("..", import.meta.url).pathname;

async function uploadFile(localPath: string, destPath: string, contentType: string) {
  const size = statSync(localPath).size;
  console.log(`  uploading ${basename(localPath)} (${(size / 1024).toFixed(1)} KB) → ${destPath}`);
  await bucket.upload(localPath, {
    destination: destPath,
    metadata: {
      contentType,
      cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

const args = process.argv.slice(2);
const useGeoJSON = args.includes("--geojson") || !args.includes("--pmtiles");
const usePMTiles = args.includes("--pmtiles");
const isoFilter = args.filter((a) => !a.startsWith("--")).map((s) => s.toUpperCase());

async function main() {
  if (useGeoJSON) {
    const dataDir = join(root, "apps/web/public/data");
    const files = readdirSync(dataDir).filter((f) => f.endsWith(".geojson"));
    const toUpload = isoFilter.length
      ? files.filter((f) => isoFilter.some((iso) => f.startsWith(iso)))
      : files;

    console.log(`\nUploading ${toUpload.length} GeoJSON file(s) to gs://${BUCKET}/tiles/`);
    for (const file of toUpload) {
      await uploadFile(join(dataDir, file), `tiles/${file}`, "application/geo+json");
    }
  }

  if (usePMTiles) {
    const tilesDir = join(root, "public/tiles");
    let files: string[];
    try {
      files = readdirSync(tilesDir).filter((f) => f.endsWith(".pmtiles"));
    } catch {
      console.error(`No PMTiles found at ${tilesDir}. Run the PMTiles pipeline first.`);
      process.exit(1);
    }
    const toUpload = isoFilter.length
      ? files.filter((f) => isoFilter.some((iso) => f.startsWith(iso)))
      : files;

    console.log(`\nUploading ${toUpload.length} PMTiles file(s) to gs://${BUCKET}/tiles/`);
    for (const file of toUpload) {
      await uploadFile(join(tilesDir, file), `tiles/${file}`, "application/vnd.mapbox-vector-tile");
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

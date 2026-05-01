#!/usr/bin/env node
/**
 * Drill-down boundary data build pipeline
 *
 * Uses TopoJSON-based topology-preserving simplification to ensure that
 * shared boundaries between adjacent regions are not separated.
 *
 * Output structure:
 *   public/geo/world.json                ← World map (218 countries)
 *   public/geo/countries/{countryId}.json ← Prefecture collection per country
 *   public/geo/prefectures/{prefId}.json  ← City collection per prefecture
 *
 * Usage: npx tsx scripts/build-geo-tiles.ts
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { readFile } from "fs/promises";
// @ts-ignore - stream-json CJS module
import { withParserAsStream } from "stream-json/streamers/stream-object.js";

// topojson is a CJS module, use createRequire
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { topology } = require("topojson-server") as typeof import("topojson-server");
const { presimplify, simplify, quantile } = require("topojson-simplify") as typeof import("topojson-simplify");
const { feature } = require("topojson-client") as typeof import("topojson-client");

// ─── Settings ──────────────────────────────────────────────────────────────────
const CONFIG = {
  /** World map simplification intensity (quantile). Smaller values preserve more detail. */
  worldQuantile: 0,
  /** Prefecture simplification intensity per country */
  prefectureQuantile: 0,
  /** City simplification intensity per prefecture */
  cityQuantile: 0,
};

const DATA_DIR = join(process.cwd(), "data/meta");
const OUT_DIR = join(process.cwd(), "apps/web/public/geo");

// ─── Types ───────────────────────────────────────────────────────────────────────
interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSONGeometry;
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface PrefectureMeta {
  id: string;
  name: string;
  country: string;
  code: string;
}

interface CityMeta {
  id: string;
  name: string;
  country: string;
  prefecture: string | number;
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Stream parse _geom.json files and return { shapeId → geometry } map
 */
function streamLoadGeometries(filePath: string): Promise<Map<string, GeoJSONGeometry>> {
  return new Promise((resolve, reject) => {
    const map = new Map<string, GeoJSONGeometry>();
    const readStream = createReadStream(filePath);
    const pipeline = readStream.pipe(withParserAsStream());

    let count = 0;
    pipeline.on("data", ({ key, value }: { key: string; value: GeoJSONGeometry }) => {
      map.set(key, value);
      count++;
      if (count % 10000 === 0) {
        console.log(`  ... ${count} geometries loaded`);
      }
    });

    pipeline.on("end", () => {
      console.log(`  Total ${count} geometries loaded: ${filePath}`);
      resolve(map);
    });

    pipeline.on("error", reject);
  });
}

/**
 * Restore FeatureCollection to GeoJSON after topology-preserving simplification based on TopoJSON
 */
function simplifyWithTopology(
  fc: GeoJSONFeatureCollection,
  quantileValue: number,
  label: string = "Map",
): GeoJSONFeatureCollection {
  if (fc.features.length === 0) {
    return fc;
  }

  // If quantile is 0, bypass simplification to preserve maximum detail
  if (quantileValue === 0) {
    console.log(`    [${label}] Quantile is 0, bypassing simplification.`);
    return fc;
  }

  let currentQuantile = quantileValue;
  let restored: any;
  let maxRetries = 5;
  let finalTopo: any;

  while (maxRetries > 0) {
    // 1. GeoJSON → TopoJSON (extract shared arcs)
    const topo = topology({ collection: fc }, 1e6);
    
    // 2. Topology-preserving simplification
    const presimplified = presimplify(topo);
    const minWeight = quantile(presimplified, currentQuantile);
    const simplified = simplify(presimplified, minWeight);

    // 3. TopoJSON → GeoJSON restoration
    restored = feature(simplified, simplified.objects.collection);
    finalTopo = simplified;

    // 4. Check Firestore 1MB limit (approx. 1,000,000 characters)
    const features = restored.type === "FeatureCollection" ? restored.features : [restored];
    let tooLargeFeature = null;
    for (const f of features) {
      const size = JSON.stringify(f.geometry).length;
      if (size > 950000) { // Set 950KB as threshold
        tooLargeFeature = { id: f.properties.id || "unknown", size };
        break;
      }
    }

    if (!tooLargeFeature) break;

    console.warn(`    [${label}] Feature ${tooLargeFeature.id} is too large (${(tooLargeFeature.size / 1024).toFixed(1)} KB). Increasing quantile: ${currentQuantile} -> ${currentQuantile * 2}`);
    currentQuantile *= 2;
    maxRetries--;
  }

  // Print simplification degree by comparing arc counts (debugging)
  const originalTopo = topology({ collection: fc });
  const originalArcs = originalTopo.arcs.length;
  const simplifiedArcs = finalTopo.arcs.length;
  if (originalArcs > 100) {
     console.log(`    [${label}] Arcs: ${originalArcs} -> ${simplifiedArcs} (Retention: ${((simplifiedArcs/originalArcs)*100).toFixed(1)}%) / Final Quantile: ${currentQuantile}`);
  }

  // feature() returns a single Feature or FeatureCollection
  if (restored.type === "FeatureCollection") {
    return restored as unknown as GeoJSONFeatureCollection;
  }
  return {
    type: "FeatureCollection",
    features: [restored as unknown as GeoJSONFeature],
  };
}

/**
 * Save GeoJSON to file (compact JSON)
 */
function saveGeoJSON(filePath: string, fc: GeoJSONFeatureCollection): void {
  const dir = join(filePath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(fc));
}

/**
 * Format bytes to human-readable units
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ─── Step 1: World Map ──────────────────────────────────────────────────────────

async function buildWorldMap(): Promise<void> {
  console.log("\n═══ Step 1: Generating World Map (world.json) ═══");

  // Load country metadata
  const countriesMeta = JSON.parse(
    await readFile(join(DATA_DIR, "countries.json"), "utf-8"),
  ) as Array<{ id: string; name: string; code: string }>;

  const countryNameMap = new Map(countriesMeta.map((c) => [c.id, c]));

  // Stream load country geometries
  console.log("  Loading country geometries...");
  const countryGeoms = await streamLoadGeometries(join(DATA_DIR, "country_geom.json"));

  // Compose FeatureCollection
  const features: GeoJSONFeature[] = [];
  for (const [id, geometry] of countryGeoms) {
    const meta = countryNameMap.get(id);
    features.push({
      type: "Feature",
      properties: {
        id,
        name: meta?.name ?? id,
        code: meta?.code ?? "",
      },
      geometry,
    });
  }

  const fc: GeoJSONFeatureCollection = { type: "FeatureCollection", features };
  console.log(`  ${features.length} country features composed`);

  // Topology-preserving simplification via TopoJSON
  console.log(`  Simplifying topology (quantile: ${CONFIG.worldQuantile})...`);
  const simplified = simplifyWithTopology(fc, CONFIG.worldQuantile, "World");

  // Save
  const outPath = join(OUT_DIR, "world.json");
  saveGeoJSON(outPath, simplified);
  const size = Buffer.byteLength(JSON.stringify(simplified));
  console.log(`  ✅ Saved: ${outPath} (${formatBytes(size)}, ${simplified.features.length} features)`);
}

// ─── Step 2: Country Prefectures ──────────────────────────────────────────────

async function buildCountryPrefectures(): Promise<void> {
  console.log("\n═══ Step 2: Generating Prefecture Files per Country ═══");

  // Load prefecture metadata → group by country
  const prefMeta = JSON.parse(
    await readFile(join(DATA_DIR, "prefectures.json"), "utf-8"),
  ) as PrefectureMeta[];

  const prefByCountry = new Map<string, PrefectureMeta[]>();
  for (const p of prefMeta) {
    const arr = prefByCountry.get(p.country) ?? [];
    arr.push(p);
    prefByCountry.set(p.country, arr);
  }
  console.log(`  ${prefMeta.length} prefectures across ${prefByCountry.size} countries`);

  // Stream load prefecture geometries
  console.log("  Loading prefecture geometries...");
  const prefGeoms = await streamLoadGeometries(join(DATA_DIR, "prefecture_geom.json"));

  // Process by country
  let totalFiles = 0;
  let totalSize = 0;
  const countriesDir = join(OUT_DIR, "countries");
  mkdirSync(countriesDir, { recursive: true });

  for (const [countryId, prefs] of prefByCountry) {
    // Compose prefecture features for the country
    const features: GeoJSONFeature[] = [];
    for (const p of prefs) {
      const geom = prefGeoms.get(p.id);
      if (!geom) continue;
      features.push({
        type: "Feature",
        properties: { id: p.id, name: p.name, country: p.country, code: p.code },
        geometry: geom,
      });
    }

    if (features.length === 0) continue;

    const fc: GeoJSONFeatureCollection = { type: "FeatureCollection", features };

    // Topology-preserving simplification via TopoJSON
    const simplified = simplifyWithTopology(fc, CONFIG.prefectureQuantile, `Country ${countryId}`);

    // Save
    const outPath = join(countriesDir, `${countryId}.json`);
    saveGeoJSON(outPath, simplified);
    const size = Buffer.byteLength(JSON.stringify(simplified));
    totalSize += size;
    totalFiles++;
  }

  console.log(`  ✅ Finished generating ${totalFiles} country files (Total ${formatBytes(totalSize)})`);
}

// ─── Step 3: Prefecture Cities ───────────────────────────────────────────────

async function buildPrefectureCities(): Promise<void> {
  console.log("\n═══ Step 3: Generating City Files per Prefecture ═══");

  // Load city metadata → group by prefecture
  const cityMeta = JSON.parse(
    await readFile(join(DATA_DIR, "cities.json"), "utf-8"),
  ) as CityMeta[];

  const cityByPref = new Map<string, CityMeta[]>();
  let orphanCount = 0;
  for (const c of cityMeta) {
    // Skip if prefecture is -1 or missing
    if (!c.prefecture || c.prefecture === -1) {
      orphanCount++;
      continue;
    }
    const prefId = String(c.prefecture);
    const arr = cityByPref.get(prefId) ?? [];
    arr.push(c);
    cityByPref.set(prefId, arr);
  }
  console.log(`  ${cityMeta.length - orphanCount} cities across ${cityByPref.size} prefectures (Orphans: ${orphanCount})`);

  // Stream load city geometries
  console.log("  Loading city geometries...");
  const cityGeoms = await streamLoadGeometries(join(DATA_DIR, "city_geom.json"));

  // Process by prefecture
  let totalFiles = 0;
  let totalSize = 0;
  const prefsDir = join(OUT_DIR, "prefectures");
  mkdirSync(prefsDir, { recursive: true });

  let processedCount = 0;
  const totalPrefs = cityByPref.size;

  for (const [prefId, cities] of cityByPref) {
    // Compose city features for the prefecture
    const features: GeoJSONFeature[] = [];
    for (const c of cities) {
      const geom = cityGeoms.get(c.id);
      if (!geom) continue;
      features.push({
        type: "Feature",
        properties: { id: c.id, name: c.name, country: c.country, prefecture: prefId },
        geometry: geom,
      });
    }

    if (features.length === 0) continue;

    const fc: GeoJSONFeatureCollection = { type: "FeatureCollection", features };

    // Topology-preserving simplification via TopoJSON
    const simplified = simplifyWithTopology(fc, CONFIG.cityQuantile, `Pref ${prefId}`);

    // Save
    const outPath = join(prefsDir, `${prefId}.json`);
    saveGeoJSON(outPath, simplified);
    const size = Buffer.byteLength(JSON.stringify(simplified));
    totalSize += size;
    totalFiles++;

    processedCount++;
    if (processedCount % 500 === 0) {
      console.log(`  ... ${processedCount}/${totalPrefs} prefectures processed`);
    }
  }

  console.log(`  ✅ Finished generating ${totalFiles} prefecture files (Total ${formatBytes(totalSize)})`);
}

// ─── Verification ─────────────────────────────────────────────────────────────

function verify(): void {
  console.log("\n═══ Verification ═══");

  // Check world.json
  const worldPath = join(OUT_DIR, "world.json");
  if (existsSync(worldPath)) {
    const data = JSON.parse(require("fs").readFileSync(worldPath, "utf-8"));
    console.log(`  world.json: ${data.features.length} countries`);
  } else {
    console.error("  ❌ world.json missing!");
  }

  // Check countries/ directory
  const countriesDir = join(OUT_DIR, "countries");
  if (existsSync(countriesDir)) {
    const files = require("fs").readdirSync(countriesDir) as string[];
    console.log(`  countries/: ${files.length} files`);
  }

  // Check prefectures/ directory
  const prefsDir = join(OUT_DIR, "prefectures");
  if (existsSync(prefsDir)) {
    const files = require("fs").readdirSync(prefsDir) as string[];
    console.log(`  prefectures/: ${files.length} files`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🗺️  Starting drill-down boundary data build");
  console.log(`   Data:   ${DATA_DIR}`);
  console.log(`   Output: ${OUT_DIR}`);

  const startTime = Date.now();

  try {
    await buildWorldMap();
    await buildCountryPrefectures();
    await buildPrefectureCities();
    verify();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Build complete! (${elapsed}s)`);
  } catch (err) {
    console.error("\n❌ Build failed:", err);
    process.exit(1);
  }
}

main();

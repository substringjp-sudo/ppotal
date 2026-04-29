#!/usr/bin/env node
/**
 * Builds the region hierarchy tree from geoBoundaries GeoJSON files.
 *
 * Parent-child linking uses centroid-in-polygon (spatial containment),
 * NOT name or code matching — avoids cross-border naming inconsistencies.
 *
 * Usage: npx tsx scripts/build-region-tree.ts [ISO3] [maxAdmLevel]
 * Example: npx tsx scripts/build-region-tree.ts KOR 2
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AdmLevel, Region } from "@regionevel/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(__dirname, "../data/source");
const metaDir = join(__dirname, "../data/meta");
mkdirSync(metaDir, { recursive: true });

const ISO3 = process.argv[2] ?? "KOR";
const MAX_ADM = Number(process.argv[3] ?? 2) as AdmLevel;

// ─── Minimal geometry types ───────────────────────────────────────────────────

type Position = [number, number];
type Ring = Position[];

function centroid(polygon: { coordinates: Ring[] }): Position {
  const ring = polygon.coordinates[0]!;
  let x = 0, y = 0;
  for (const [lon, lat] of ring) {
    x += lon!;
    y += lat!;
  }
  const n = ring.length;
  return [x / n, y / n];
}

function pointInPolygon(point: Position, polygon: { coordinates: Ring[] }): boolean {
  const [px, py] = point;
  for (const ring of polygon.coordinates) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi! > py! !== yj! > py! && px! < ((xj! - xi!) * (py! - yi!)) / (yj! - yi!) + xi!) {
        inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

// ─── Load GeoJSON features ────────────────────────────────────────────────────

type GeoFeature = {
  properties: { shapeID: string; shapeName: string };
  geometry: { type: string; coordinates: Ring[] };
};

function loadFeatures(admLevel: AdmLevel): GeoFeature[] {
  const file = join(sourceDir, `${ISO3}_ADM${admLevel}.geojson`);
  if (!existsSync(file)) {
    console.warn(`Missing: ${file} — skipping ADM${admLevel}`);
    return [];
  }
  const raw = JSON.parse(readFileSync(file, "utf-8")) as {
    features: GeoFeature[];
  };
  return raw.features;
}

// ─── Build tree ───────────────────────────────────────────────────────────────

const regionsByLevel: Map<AdmLevel, GeoFeature[]> = new Map();
for (let lvl = 0; lvl <= MAX_ADM; lvl++) {
  regionsByLevel.set(lvl as AdmLevel, loadFeatures(lvl as AdmLevel));
}

const regions: Region[] = [];

for (let lvl = 0 as AdmLevel; lvl <= MAX_ADM; lvl = (lvl + 1) as AdmLevel) {
  const features = regionsByLevel.get(lvl) ?? [];
  const parentFeatures = lvl > 0 ? (regionsByLevel.get((lvl - 1) as AdmLevel) ?? []) : [];

  for (const f of features) {
    let parentId: string | null = null;

    if (parentFeatures.length > 0) {
      const c = centroid(f.geometry as { coordinates: Ring[] });
      const parent = parentFeatures.find((pf) =>
        pointInPolygon(c, pf.geometry as { coordinates: Ring[] }),
      );
      parentId = parent?.properties.shapeID ?? null;

      if (!parentId) {
        console.warn(
          `No parent found for ${f.properties.shapeID} (${f.properties.shapeName}) at ADM${lvl}`,
        );
      }
    }

    regions.push({
      id: f.properties.shapeID,
      parentId,
      name: f.properties.shapeName,
      iso3: ISO3,
      admLevel: lvl,
    });
  }
}

const outFile = join(metaDir, `${ISO3}.json`);
writeFileSync(outFile, JSON.stringify(regions, null, 2));

console.log(`Built ${regions.length} regions → ${outFile}`);
for (let lvl = 0; lvl <= MAX_ADM; lvl++) {
  const count = regions.filter((r) => r.admLevel === lvl).length;
  console.log(`  ADM${lvl}: ${count} features`);
}

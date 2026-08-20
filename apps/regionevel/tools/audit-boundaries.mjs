#!/usr/bin/env node
/**
 * Audit an ADM2 layer before trusting it, or before patching it.
 *
 * Written after a patch of 78 "missing" Japanese cities turned out to be 78
 * duplicates of cities we already had. The detection behind it matched OSM
 * against our data by name, which cannot see three things:
 *
 *   - originals whose shapeName is null or "?????" (24 of Japan's 1742)
 *   - coastal cities, where OSM includes territorial water and geoBoundaries
 *     does not, so the same city looks like two different places
 *   - island municipalities, whose OSM centroid sits in open sea and so falls
 *     outside every land polygon
 *
 * So this asks the questions geometrically instead. Names are reported, never
 * relied on.
 *
 * Usage:
 *   node scripts/audit-boundaries.mjs \
 *     --adm1 path/to/ADM1.geojson \
 *     --adm2 path/to/ADM2.geojson \
 *     [--adm0 path/to/ADM0.geojson] \
 *     [--patch path/to/patch.geojson] \
 *     [--step 0.02]
 */
import fs from "node:fs";
import * as turf from "@turf/turf";

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const adm1Path = arg("adm1");
const adm2Path = arg("adm2");
const adm0Path = arg("adm0");
const patchPath = arg("patch");
const STEP = Number(arg("step", "0.02"));

if (!adm1Path || !adm2Path) {
  console.error("need --adm1 and --adm2 (see header for usage)");
  process.exit(1);
}

const load = (p) => JSON.parse(fs.readFileSync(p, "utf8")).features;
const km2 = (g) => (g ? turf.area(g) / 1e6 : 0);
const boxOf = (f) => turf.bbox(f);
const boxesMeet = (a, b) => !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
const nameOf = (f) => f.properties?.shapeName ?? f.properties?.name ?? null;

const adm1 = load(adm1Path);
const adm2 = load(adm2Path);
const adm2Boxes = adm2.map(boxOf);

console.log(`ADM1: ${adm1.length}   ADM2: ${adm2.length}`);

// ---------------------------------------------------------------- names
const unnamed = adm2.filter((f) => {
  const n = nameOf(f);
  return !n || n === "null" || /^\?+$/.test(n);
});
console.log(`\n[names] ADM2 with no usable name: ${unnamed.length}`);
if (unnamed.length) {
  console.log(`        any name-based matcher reports every one of these as missing.`);
  console.log(`        ids: ${unnamed.slice(0, 8).map((f) => f.properties?.shapeID).join(", ")}${unnamed.length > 8 ? " …" : ""}`);
}

// ---------------------------------------------------------- completeness
// A grid point inside a prefecture but inside none of its children is a hole.
// This is the only completeness test that survives bad names.
console.log(`\n[coverage] sampling at ${STEP}deg …`);
let sampled = 0;
let uncovered = 0;
const perParent = [];

for (const parent of adm1) {
  const pb = boxOf(parent);
  const candidates = [];
  for (let i = 0; i < adm2.length; i++) if (boxesMeet(pb, adm2Boxes[i])) candidates.push(i);

  let inside = 0;
  let holes = 0;
  const where = [];
  for (let lon = pb[0]; lon <= pb[2]; lon += STEP) {
    for (let lat = pb[1]; lat <= pb[3]; lat += STEP) {
      const pt = turf.point([lon, lat]);
      let inParent = false;
      try { inParent = turf.booleanPointInPolygon(pt, parent); } catch { continue; }
      if (!inParent) continue;
      inside++;
      let covered = false;
      for (const i of candidates) {
        const b = adm2Boxes[i];
        if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
        try { if (turf.booleanPointInPolygon(pt, adm2[i])) { covered = true; break; } } catch { /* bad ring */ }
      }
      if (!covered) { holes++; where.push([+lon.toFixed(3), +lat.toFixed(3)]); }
    }
  }
  sampled += inside;
  uncovered += holes;
  perParent.push({ name: nameOf(parent), inside, holes, pct: inside ? (holes / inside) * 100 : 0, where });
}

console.log(`           points inside a parent: ${sampled}`);
console.log(`           covered by no child:    ${uncovered} (${((uncovered / sampled) * 100).toFixed(2)}%)`);
console.log(`\n           worst parents:`);
perParent.sort((a, b) => b.pct - a.pct).slice(0, 10).forEach((p) =>
  console.log(`             ${String(p.name).padEnd(24)} ${String(p.holes).padStart(5)}/${String(p.inside).padEnd(6)} ${p.pct.toFixed(2)}%  e.g. ${JSON.stringify(p.where.slice(0, 2))}`));
console.log(`\n           A percent or two in an archipelago is the grid falling between`);
console.log(`           islands, not a missing municipality. Look for whole clusters.`);

// ---------------------------------------------------------------- patch
if (patchPath) {
  const patch = load(patchPath);
  const adm0 = adm0Path ? load(adm0Path)[0] : null;
  console.log(`\n[patch] ${patch.length} features from ${patchPath}`);

  let dup = 0, ambiguous = 0, fresh = 0, seaTotal = 0, patchTotal = 0;
  const rows = [];

  for (const p of patch) {
    const pb = boxOf(p);
    const pa = km2(p);
    patchTotal += pa;

    let best = null;
    for (let i = 0; i < adm2.length; i++) {
      if (!boxesMeet(pb, adm2Boxes[i])) continue;
      let inter = null;
      try { inter = turf.intersect(turf.featureCollection([p, adm2[i]])); } catch { continue; }
      if (!inter) continue;
      const ia = km2(inter);
      if (ia < 0.05) continue;
      const iou = ia / (pa + km2(adm2[i]) - ia);
      if (!best || iou > best.iou) best = { iou, name: nameOf(adm2[i]) };
    }

    let sea = 0;
    if (adm0) {
      try { sea = km2(turf.difference(turf.featureCollection([p, adm0]))); } catch { /* skip */ }
      seaTotal += sea;
    }

    const verdict = !best ? "new" : best.iou >= 0.5 ? "duplicate" : best.iou >= 0.1 ? "same place, different extent" : "overlaps something";
    if (verdict === "duplicate") dup++;
    else if (verdict === "new") fresh++;
    else ambiguous++;

    rows.push({ name: nameOf(p), pa, iou: best?.iou ?? null, match: best?.name ?? null, sea, verdict });
  }

  console.log(`        duplicates (IoU>=0.5):        ${dup}`);
  console.log(`        same place, other extent:     ${ambiguous}`);
  console.log(`        touching nothing we have:     ${fresh}   <- the only ones worth adding`);
  if (adm0) {
    console.log(`        area outside the land mask:   ${seaTotal.toFixed(0)} / ${patchTotal.toFixed(0)} km2 (${((seaTotal / patchTotal) * 100).toFixed(1)}%)`);
    console.log(`        (OSM municipal relations include territorial water; geoBoundaries does not)`);
  }

  console.log(`\n        every patch feature that already has a counterpart:`);
  rows.filter((r) => r.match).sort((a, b) => (b.iou ?? 0) - (a.iou ?? 0)).slice(0, 20).forEach((r) =>
    console.log(`          ${String(r.name).padEnd(18)} IoU=${r.iou.toFixed(3)}  vs "${r.match}"  sea=${r.sea.toFixed(0)}km2  ${r.verdict}`));

  if (fresh === 0) {
    console.log(`\n        VERDICT: nothing here is new. Adding this layer duplicates`);
    console.log(`        regions that already exist, which double-counts visits.`);
  }
}

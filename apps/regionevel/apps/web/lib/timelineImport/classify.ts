import type { VisitCategory } from "@regionevel/types";
import { VISIT_CONFIG } from "@regionevel/types";
import { padId, getLocalizedName } from "@regionevel/utils";
import { fetchGeometries, fetchCountryGeometries, fetchRegionsByIds, fetchAncestorsBulk } from "@/lib/regions";
import { findRegionForPoint } from "@/lib/geo";
import type { ParsedTimeline, TimelineImportPreview, RegionImportSummary } from "./types";

/** A stop of 30 minutes or less reads as a transfer, not a stop. */
const TRANSIT_MAX_MS = 30 * 60_000;
/** Stays in the same region closer together than this are one occasion (e.g. left for dinner, came back). */
const MERGE_GAP_MS = 3 * 60 * 60_000;
/** Overnight window used to detect a stay ("숙박"). */
const OVERNIGHT_START_HOUR = 2;
const OVERNIGHT_END_HOUR = 6;
/** Cap on how many points of one movement segment we bother resolving. */
const MOVE_SAMPLE_MAX_POINTS = 12;

interface ResolvedPoint {
  regionId: string;
  admLevel: 0 | 1 | 2;
}

/**
 * There is no timezone data attached to a raw lat/lon, so "local time" here
 * is approximated from longitude (15° per hour). It is wrong near timezone
 * borders and for places with non-standard offsets, but it is the same
 * approximation travel apps commonly use and is good enough to tell a hotel
 * stay from a daytime stroll.
 */
function estimateUtcOffsetHours(lon: number): number {
  return Math.max(-12, Math.min(14, Math.round(lon / 15)));
}

function overlapsOvernightWindow(startTime: number, endTime: number, lon: number): boolean {
  const offsetMs = estimateUtcOffsetHours(lon) * 3_600_000;
  const dayMs = 24 * 3_600_000;
  const localStart = startTime + offsetMs;
  const localEnd = endTime + offsetMs;
  const firstDay = Math.floor(localStart / dayMs) * dayMs;
  for (let day = firstDay; day <= localEnd; day += dayMs) {
    const windowStart = day + OVERNIGHT_START_HOUR * 3_600_000;
    const windowEnd = day + OVERNIGHT_END_HOUR * 3_600_000;
    if (localEnd >= windowStart && localStart <= windowEnd) return true;
  }
  return false;
}

function localDateKey(t: number, lon: number): string {
  const offsetMs = estimateUtcOffsetHours(lon) * 3_600_000;
  return new Date(t + offsetMs).toISOString().slice(0, 10);
}

/**
 * Resolves a batch of points to the most specific region available
 * (city, else prefecture, else country), fetching boundary data only for
 * the countries the points actually touch.
 */
async function resolvePoints(points: { lat: number; lon: number }[]): Promise<(ResolvedPoint | null)[]> {
  const results: (ResolvedPoint | null)[] = new Array(points.length).fill(null);
  if (points.length === 0) return results;

  const countryFeatures = await fetchGeometries(null);
  const countryIdByPoint: (string | null)[] = points.map((p) => {
    const hit = findRegionForPoint(p.lat, p.lon, countryFeatures);
    return hit ? hit.id : null;
  });

  const idxByCountry = new Map<string, number[]>();
  countryIdByPoint.forEach((cid, i) => {
    if (!cid) return;
    const arr = idxByCountry.get(cid) ?? [];
    arr.push(i);
    idxByCountry.set(cid, arr);
  });
  if (idxByCountry.size === 0) return results;

  const countryRegions = await fetchRegionsByIds(Array.from(idxByCountry.keys()));
  const iso3ByCountryId = new Map(countryRegions.map((r) => [padId(r.id), r.iso3]));

  for (const [countryId, idxs] of idxByCountry) {
    const iso3 = iso3ByCountryId.get(countryId);
    if (!iso3) {
      idxs.forEach((i) => { results[i] = { regionId: countryId, admLevel: 0 }; });
      continue;
    }

    const [cityFeatures, prefFeatures] = await Promise.all([
      fetchCountryGeometries(iso3, 2).catch(() => []),
      fetchCountryGeometries(iso3, 1).catch(() => []),
    ]);

    for (const i of idxs) {
      const p = points[i]!;
      const cityHit = cityFeatures.length > 0 ? findRegionForPoint(p.lat, p.lon, cityFeatures) : null;
      if (cityHit) { results[i] = { regionId: cityHit.id, admLevel: 2 }; continue; }

      const prefHit = prefFeatures.length > 0 ? findRegionForPoint(p.lat, p.lon, prefFeatures) : null;
      if (prefHit) { results[i] = { regionId: prefHit.id, admLevel: 1 }; continue; }

      results[i] = { regionId: countryId, admLevel: 0 };
    }
  }

  return results;
}

/** Evenly-spaced sample of a movement trace, always keeping both endpoints. */
function samplePoints<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}

export async function buildTimelineImportPreview(parsed: ParsedTimeline): Promise<TimelineImportPreview> {
  const { stays, moves, skipped } = parsed;

  // --- 1. Resolve every stay and every sampled move point in one batch ------
  // (one shared call so a country touched by both stays and pass-throughs
  // only has its boundary data fetched once).
  const moveSamplePoints: { lat: number; lon: number }[] = [];
  const moveSampleOwner: number[] = []; // index into `moves`
  moves.forEach((trace, mi) => {
    for (const p of samplePoints(trace, MOVE_SAMPLE_MAX_POINTS)) {
      moveSamplePoints.push({ lat: p.lat, lon: p.lon });
      moveSampleOwner.push(mi);
    }
  });

  const stayPoints = stays.map((s) => ({ lat: s.lat, lon: s.lon }));
  const combinedResolutions = await resolvePoints([...stayPoints, ...moveSamplePoints]);
  const stayResolutions = combinedResolutions.slice(0, stayPoints.length);
  const moveResolutions = combinedResolutions.slice(stayPoints.length);

  interface Occasion { regionId: string; admLevel: 0 | 1 | 2; startTime: number; endTime: number; lon: number }
  const rawStayEvents: Occasion[] = [];
  stays.forEach((stay, i) => {
    const r = stayResolutions[i];
    if (!r) return;
    rawStayEvents.push({ regionId: r.regionId, admLevel: r.admLevel, startTime: stay.startTime, endTime: stay.endTime, lon: stay.lon });
  });
  rawStayEvents.sort((a, b) => a.startTime - b.startTime);

  // --- 2. Merge consecutive same-region stays into one occasion ------------
  const occasions: Occasion[] = [];
  for (const ev of rawStayEvents) {
    const prev = occasions[occasions.length - 1];
    if (prev && prev.regionId === ev.regionId && ev.startTime - prev.endTime <= MERGE_GAP_MS) {
      prev.endTime = Math.max(prev.endTime, ev.endTime);
    } else {
      occasions.push({ ...ev });
    }
  }

  // --- 3. Classify each occasion, tally per region --------------------------
  const stoppedRegions = new Map<string, { admLevel: 0 | 1 | 2; counts: Partial<Record<VisitCategory, number>> }>();
  for (const occ of occasions) {
    const category: VisitCategory = overlapsOvernightWindow(occ.startTime, occ.endTime, occ.lon)
      ? "stay"
      : occ.endTime - occ.startTime <= TRANSIT_MAX_MS
        ? "transit"
        : "visit";

    const entry = stoppedRegions.get(occ.regionId) ?? { admLevel: occ.admLevel, counts: {} };
    entry.counts[category] = (entry.counts[category] ?? 0) + 1;
    stoppedRegions.set(occ.regionId, entry);
  }

  // --- 4. Movement segments: regions merely passed through, never stopped --
  const passDays = new Map<string, { admLevel: 0 | 1 | 2; days: Set<string> }>();
  moveResolutions.forEach((r, i) => {
    if (!r) return;
    if (stoppedRegions.has(r.regionId)) return; // it was a real stop somewhere in the import, not a mere pass-through
    const mi = moveSampleOwner[i]!;
    const t = moves[mi]?.[0]?.t ?? Date.now();
    const lon = moveSamplePoints[i]!.lon;
    const entry = passDays.get(r.regionId) ?? { admLevel: r.admLevel, days: new Set<string>() };
    entry.days.add(localDateKey(t, lon));
    passDays.set(r.regionId, entry);
  });

  // --- 5. Merge stop-based and pass-based tallies, capped at the store's own limits
  const allRegionIds = new Set<string>([...stoppedRegions.keys(), ...passDays.keys()]);
  const regionAdmLevel = new Map<string, 0 | 1 | 2>();
  const regionCounts = new Map<string, Partial<Record<VisitCategory, number>>>();

  for (const [regionId, { admLevel, counts }] of stoppedRegions) {
    regionAdmLevel.set(regionId, admLevel);
    regionCounts.set(regionId, { ...counts });
  }
  for (const [regionId, { admLevel, days }] of passDays) {
    regionAdmLevel.set(regionId, admLevel);
    const counts = regionCounts.get(regionId) ?? {};
    counts.pass = days.size;
    regionCounts.set(regionId, counts);
  }

  for (const counts of regionCounts.values()) {
    for (const cat of Object.keys(counts) as VisitCategory[]) {
      counts[cat] = Math.min(counts[cat]!, VISIT_CONFIG[cat].maxCount);
    }
  }

  // --- 6. Attach names for the review UI ------------------------------------
  const leafIds = Array.from(allRegionIds);
  const [leafRegions, ancestorRegions] = await Promise.all([
    fetchRegionsByIds(leafIds),
    fetchAncestorsBulk(leafIds),
  ]);
  const regionById = new Map(leafRegions.map((r) => [padId(r.id), r]));
  const ancestorById = new Map(ancestorRegions.map((r) => [padId(r.id), r]));

  const regions: RegionImportSummary[] = leafIds.map((regionId) => {
    const region = regionById.get(regionId);
    const admLevel = regionAdmLevel.get(regionId) ?? 2;
    const ancestorNames: string[] = [];
    let current = region;
    const guard = new Set<string>();
    while (current?.parentId && !guard.has(padId(current.parentId))) {
      const pid = padId(current.parentId);
      guard.add(pid);
      const parent = ancestorById.get(pid);
      if (!parent) break;
      ancestorNames.unshift(getLocalizedName(parent));
      current = parent;
    }
    return {
      regionId,
      admLevel,
      name: region ? getLocalizedName(region) : regionId,
      ancestorNames,
      counts: regionCounts.get(regionId) ?? {},
    };
  });

  regions.sort((a, b) => a.ancestorNames.join("/").localeCompare(b.ancestorNames.join("/")) || a.name.localeCompare(b.name));

  const applyList: TimelineImportPreview["applyList"] = [];
  for (const r of regions) {
    for (const cat of Object.keys(r.counts) as VisitCategory[]) {
      const n = r.counts[cat] ?? 0;
      for (let i = 0; i < n; i++) applyList.push({ regionId: r.regionId, category: cat });
    }
  }

  return { regions, skipped, applyList };
}

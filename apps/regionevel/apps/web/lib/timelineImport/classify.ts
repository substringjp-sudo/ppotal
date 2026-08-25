import type { VisitCategory } from "@regionevel/types";
import { VISIT_CONFIG } from "@regionevel/types";
import { padId, getLocalizedName } from "@regionevel/utils";
import { fetchGeometries, fetchCountryGeometries, fetchRegionsByIds, fetchAncestorsBulk } from "@/lib/regions";
import { findRegionForPoint } from "@/lib/geo";
import type { ParsedTimeline, TimelineImportPreview, RegionImportSummary, TracePoint } from "./types";

/** 15 minutes or less at a place is treated as a quick transit / transfer */
const TRANSIT_MAX_MS = 15 * 60_000;
/** Merge consecutive same-region stays if closer than 3 hours */
const MERGE_GAP_MS = 3 * 60 * 60_000;
/** Overnight window for stay detection (2:00 AM - 4:00 AM) */
const OVERNIGHT_START_HOUR = 2;
const OVERNIGHT_END_HOUR = 4;
/** Maximum time gap for overnight bridge detection (18 hours) */
const OVERNIGHT_BRIDGE_MAX_GAP_MS = 18 * 60 * 60_000;
interface ResolvedPoint {
  regionId: string;
  admLevel: 0 | 1 | 2;
}

export type ProgressCallback = (percent: number, message: string) => void;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Approximates UTC offset hours from longitude (15° per hour).
 */
export function estimateUtcOffsetHours(lon: number): number {
  return Math.max(-12, Math.min(14, Math.round(lon / 15)));
}

/**
 * Checks if a time range directly overlaps with 2:00 AM - 4:00 AM local time.
 */
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
 * (city ADM2, else prefecture ADM1, else country ADM0).
 */
async function resolvePoints(
  points: { lat: number; lon: number }[],
  onProgress?: ProgressCallback,
): Promise<(ResolvedPoint | null)[]> {
  const results: (ResolvedPoint | null)[] = new Array(points.length).fill(null);
  if (points.length === 0) return results;

  onProgress?.(25, "국가 경계 데이터 확인 중…");
  await yieldToMain();

  const countryFeatures = await fetchGeometries(null);
  const countryIdByPoint: (string | null)[] = new Array(points.length).fill(null);

  // Spatial point cache for country matching
  const countryPointCache = new Map<string, string | null>();

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
    if (countryPointCache.has(key)) {
      countryIdByPoint[i] = countryPointCache.get(key)!;
    } else {
      const hit = findRegionForPoint(p.lat, p.lon, countryFeatures);
      const cid = hit ? hit.id : null;
      countryPointCache.set(key, cid);
      countryIdByPoint[i] = cid;
    }

    if (i % 80 === 0) {
      onProgress?.(25 + Math.round((i / points.length) * 15), `국가 확인 중 (${i + 1}/${points.length})…`);
      await yieldToMain();
    }
  }

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

  onProgress?.(45, "도·도·부·현 및 지역 경계 분석 중…");
  await yieldToMain();

  for (const [countryId, idxs] of idxByCountry) {
    const iso3 = iso3ByCountryId.get(countryId);
    if (!iso3) {
      idxs.forEach((i) => { results[i] = { regionId: countryId, admLevel: 0 }; });
      continue;
    }

    // 1. Fetch prefectures (ADM1)
    const prefFeatures = await fetchCountryGeometries(iso3, 1).catch(() => []);

    // 2. Resolve points to prefecture
    const prefHitByPointIdx = new Map<number, { id: string; name: string }>();
    const prefPointCache = new Map<string, { id: string; name: string } | null>();

    for (let j = 0; j < idxs.length; j++) {
      const i = idxs[j]!;
      const p = points[i]!;
      const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

      let hit: { id: string; name: string } | null = null;
      if (prefPointCache.has(key)) {
        hit = prefPointCache.get(key)!;
      } else {
        hit = prefFeatures.length > 0 ? findRegionForPoint(p.lat, p.lon, prefFeatures) : null;
        prefPointCache.set(key, hit);
      }

      if (hit) {
        prefHitByPointIdx.set(i, hit);
      }

      if (j % 60 === 0) {
        onProgress?.(45 + Math.round((j / idxs.length) * 20), `지역 경계 매칭 중 (${j + 1}/${idxs.length})…`);
        await yieldToMain();
      }
    }

    // 3. For all unique hit prefectures, fetch child city geometries (ADM2)
    const uniquePrefIds = Array.from(new Set(Array.from(prefHitByPointIdx.values()).map((h) => padId(h.id))));
    onProgress?.(65, `${uniquePrefIds.length}개 지역의 시·구·군 상세 경계 로딩 중…`);
    await yieldToMain();

    const cityFeaturesByPref = new Map<string, any[]>();
    await Promise.all(
      uniquePrefIds.map(async (prefId) => {
        try {
          const cities = await fetchGeometries(prefId);
          if (cities && cities.length > 0) {
            cityFeaturesByPref.set(prefId, cities);
          }
        } catch (e) {
          console.warn(`[classify] Failed to fetch city geometries for pref ${prefId}`, e);
        }
      })
    );

    onProgress?.(72, "시·구·군 단위 정밀 매칭 중…");
    await yieldToMain();

    // 4. Resolve each point to City (ADM2) if available, else Prefecture (ADM1), else Country (ADM0)
    const cityPointCache = new Map<string, ResolvedPoint>();

    for (let j = 0; j < idxs.length; j++) {
      const i = idxs[j]!;
      const p = points[i]!;
      const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

      if (cityPointCache.has(key)) {
        results[i] = cityPointCache.get(key)!;
        continue;
      }

      const prefHit = prefHitByPointIdx.get(i);
      let resolved: ResolvedPoint;

      if (prefHit) {
        const prefId = padId(prefHit.id);
        const cityFeatures = cityFeaturesByPref.get(prefId) ?? [];
        const cityHit = cityFeatures.length > 0 ? findRegionForPoint(p.lat, p.lon, cityFeatures) : null;

        if (cityHit) {
          resolved = { regionId: cityHit.id, admLevel: 2 };
        } else {
          resolved = { regionId: prefHit.id, admLevel: 1 };
        }
      } else {
        resolved = { regionId: countryId, admLevel: 0 };
      }

      cityPointCache.set(key, resolved);
      results[i] = resolved;

      if (j % 50 === 0) {
        onProgress?.(72 + Math.round((j / idxs.length) * 13), `시·구·군 매칭 중 (${j + 1}/${idxs.length})…`);
        await yieldToMain();
      }
    }
  }

  return results;
}

/** Haversine distance in km between two lat/lon points */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Densifies a movement trace by interpolating intermediate points along long hops.
 * Step size: ~5km, coarse enough that a whole trip still resolves in seconds
 * (administrative regions are typically far wider than the GPS noise a finer
 * step would chase), while still catching cities passed through along the way.
 * Maximum points per segment: 40, capping the cost of any single very long hop.
 */
export function densifyTrace(trace: TracePoint[], stepKm = 5, maxPointsPerSegment = 40): TracePoint[] {
  if (trace.length === 0) return [];
  if (trace.length === 1) return [...trace];

  const result: TracePoint[] = [trace[0]!];

  for (let i = 0; i < trace.length - 1; i++) {
    const p1 = trace[i]!;
    const p2 = trace[i + 1]!;
    const dist = haversineDistanceKm(p1.lat, p1.lon, p2.lat, p2.lon);

    // Skip extreme distances (e.g. international flights > 800km) to avoid false pass across countries
    if (dist > 800) {
      result.push(p2);
      continue;
    }

    if (dist > stepKm) {
      const numSteps = Math.min(Math.floor(dist / stepKm), 25);
      for (let s = 1; s < numSteps; s++) {
        const ratio = s / numSteps;
        result.push({
          lat: p1.lat + (p2.lat - p1.lat) * ratio,
          lon: p1.lon + (p2.lon - p1.lon) * ratio,
          t: Math.round(p1.t + (p2.t - p1.t) * ratio),
        });
      }
    }
    result.push(p2);
  }

  if (result.length > maxPointsPerSegment) {
    return samplePoints(result, maxPointsPerSegment);
  }
  return result;
}

/** Evenly-spaced sample of a movement trace. */
function samplePoints<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}

export async function buildTimelineImportPreview(
  parsed: ParsedTimeline,
  onProgress?: ProgressCallback,
): Promise<TimelineImportPreview> {
  const { stays, moves, skipped } = parsed;

  onProgress?.(10, "방문 및 이동 데이터 준비 중…");
  await yieldToMain();

  // --- 1. Separate points into: Stays, Move Endpoints (Start/End), Move Waypoints (Path)
  const stayPoints = stays.map((s) => ({ lat: s.lat, lon: s.lon }));

  // Move endpoints: start and end points of each movement
  const moveEndpoints: { lat: number; lon: number; t: number; moveIdx: number; isStart: boolean }[] = [];
  // Move waypoints: intermediate points along the path (densified)
  const moveWaypoints: { lat: number; lon: number; t: number; moveIdx: number }[] = [];

  moves.forEach((rawTrace, mi) => {
    if (rawTrace.length === 0) return;
    // Densify trajectory to capture all traversed intermediate regions
    const trace = densifyTrace(rawTrace);

    const startP = trace[0]!;
    const endP = trace[trace.length - 1]!;
    moveEndpoints.push({ lat: startP.lat, lon: startP.lon, t: startP.t, moveIdx: mi, isStart: true });
    if (trace.length > 1) {
      moveEndpoints.push({ lat: endP.lat, lon: endP.lon, t: endP.t, moveIdx: mi, isStart: false });
    }

    // All intermediate points (both recorded waypoints and densified points) are collected for pass-through calculation
    if (trace.length > 2) {
      const intermediate = trace.slice(1, -1);
      for (const p of intermediate) {
        moveWaypoints.push({ lat: p.lat, lon: p.lon, t: p.t, moveIdx: mi });
      }
    }
  });

  const allPointsToResolve = [
    ...stayPoints,
    ...moveEndpoints.map((e) => ({ lat: e.lat, lon: e.lon })),
    ...moveWaypoints.map((w) => ({ lat: w.lat, lon: w.lon })),
  ];

  const combinedResolutions = await resolvePoints(allPointsToResolve, onProgress);

  const stayResolutions = combinedResolutions.slice(0, stayPoints.length);
  const endpointResolutions = combinedResolutions.slice(stayPoints.length, stayPoints.length + moveEndpoints.length);
  const waypointResolutions = combinedResolutions.slice(stayPoints.length + moveEndpoints.length);

  onProgress?.(86, "방문, 숙박(2시~4시 판정), 이동 구간 정밀 분류 중…");
  await yieldToMain();

  // --- 2. Build Unified Chronological Event Timeline -------------------------
  interface TimelineEvent {
    type: "stay" | "endpoint" | "waypoint";
    regionId: string;
    admLevel: 0 | 1 | 2;
    startTime: number;
    endTime: number;
    lon: number;
  }

  const events: TimelineEvent[] = [];

  // Add stays
  stays.forEach((stay, i) => {
    const r = stayResolutions[i];
    if (!r) return;
    events.push({
      type: "stay",
      regionId: r.regionId,
      admLevel: r.admLevel,
      startTime: stay.startTime,
      endTime: stay.endTime,
      lon: stay.lon,
    });
  });

  // Add move endpoints (start/end)
  moveEndpoints.forEach((ep, i) => {
    const r = endpointResolutions[i];
    if (!r) return;
    events.push({
      type: "endpoint",
      regionId: r.regionId,
      admLevel: r.admLevel,
      startTime: ep.t,
      endTime: ep.t,
      lon: ep.lon,
    });
  });

  // Sort chronologically
  events.sort((a, b) => a.startTime - b.startTime);

  // --- 3. Overnight Stay Detection (2:00 AM - 4:00 AM Window & Bridge) ---------
  // Maps: regionId -> Set of overnight date strings
  const overnightStaysByRegion = new Map<string, Set<string>>();
  const markOvernightStay = (regionId: string, dateKey: string) => {
    const set = overnightStaysByRegion.get(regionId) ?? new Set<string>();
    set.add(dateKey);
    overnightStaysByRegion.set(regionId, set);
  };

  // 3a. Direct overlap during 2:00 AM - 4:00 AM
  for (const ev of events) {
    if (ev.type === "stay") {
      const offsetMs = estimateUtcOffsetHours(ev.lon) * 3_600_000;
      const localStart = ev.startTime + offsetMs;
      const localEnd = ev.endTime + offsetMs;
      const dayMs = 24 * 3_600_000;
      const firstDay = Math.floor(localStart / dayMs) * dayMs;

      for (let day = firstDay; day <= localEnd; day += dayMs) {
        const windowStart = day + OVERNIGHT_START_HOUR * 3_600_000;
        const windowEnd = day + OVERNIGHT_END_HOUR * 3_600_000;
        if (localEnd >= windowStart && localStart <= windowEnd) {
          const dateStr = new Date(day).toISOString().slice(0, 10);
          markOvernightStay(ev.regionId, dateStr);
        }
      }
    }
  }

  // 3b. Overnight Bridge: Check if region before 2:00 AM matches region after 4:00 AM
  for (let i = 0; i < events.length - 1; i++) {
    const evBefore = events[i]!;
    const evAfter = events[i + 1]!;

    if (evBefore.regionId !== evAfter.regionId) continue;
    const timeGap = evAfter.startTime - evBefore.endTime;
    if (timeGap <= 0 || timeGap > OVERNIGHT_BRIDGE_MAX_GAP_MS) continue;

    // Check if the gap spans across the 2:00 AM - 4:00 AM window
    const offsetMs = estimateUtcOffsetHours(evBefore.lon) * 3_600_000;
    const localBeforeEnd = evBefore.endTime + offsetMs;
    const localAfterStart = evAfter.startTime + offsetMs;

    const dayMs = 24 * 3_600_000;
    const startDay = Math.floor(localBeforeEnd / dayMs) * dayMs;
    const endDay = Math.floor(localAfterStart / dayMs) * dayMs;

    for (let day = startDay; day <= endDay; day += dayMs) {
      const windowStart = day + OVERNIGHT_START_HOUR * 3_600_000;
      const windowEnd = day + OVERNIGHT_END_HOUR * 3_600_000;

      // evBefore ended before or around 2:00 AM, and evAfter started after 4:00 AM
      if (localBeforeEnd <= windowEnd && localAfterStart >= windowStart) {
        const dateStr = new Date(day).toISOString().slice(0, 10);
        markOvernightStay(evBefore.regionId, dateStr);
      }
    }
  }

  // --- 4. Tally Categories (Stay, Visit, Transit, Pass) per Region -----------
  const regionAdmLevels = new Map<string, 0 | 1 | 2>();
  const regionCounts = new Map<string, Partial<Record<VisitCategory, number>>>();

  const getCounts = (regionId: string, admLevel: 0 | 1 | 2) => {
    regionAdmLevels.set(regionId, admLevel);
    let c = regionCounts.get(regionId);
    if (!c) {
      c = {};
      regionCounts.set(regionId, c);
    }
    return c;
  };

  // 4a. Apply overnight stays
  for (const [regionId, dates] of overnightStaysByRegion) {
    const sampleEvent = events.find((e) => e.regionId === regionId);
    const adm = sampleEvent ? sampleEvent.admLevel : 2;
    const c = getCounts(regionId, adm);
    c.stay = dates.size;
  }

  // 4b. Apply visits from place stops
  // Merge consecutive same-region stays
  const mergedStays: TimelineEvent[] = [];
  const stayEventsOnly = events.filter((e) => e.type === "stay");
  for (const ev of stayEventsOnly) {
    const prev = mergedStays[mergedStays.length - 1];
    if (prev && prev.regionId === ev.regionId && ev.startTime - prev.endTime <= MERGE_GAP_MS) {
      prev.endTime = Math.max(prev.endTime, ev.endTime);
    } else {
      mergedStays.push({ ...ev });
    }
  }

  for (const occ of mergedStays) {
    const c = getCounts(occ.regionId, occ.admLevel);
    const duration = occ.endTime - occ.startTime;
    if (duration <= TRANSIT_MAX_MS) {
      c.transit = (c.transit ?? 0) + 1;
    } else {
      c.visit = (c.visit ?? 0) + 1;
    }
  }

  // 4c. Apply transit from movement start/end endpoints
  const transitDaysByRegion = new Map<string, Set<string>>();
  moveEndpoints.forEach((ep, i) => {
    const r = endpointResolutions[i];
    if (!r) return;
    const dKey = localDateKey(ep.t, ep.lon);
    const set = transitDaysByRegion.get(r.regionId) ?? new Set<string>();
    set.add(dKey);
    transitDaysByRegion.set(r.regionId, set);
    regionAdmLevels.set(r.regionId, r.admLevel);
  });

  for (const [regionId, dates] of transitDaysByRegion) {
    const adm = regionAdmLevels.get(regionId) ?? 2;
    const c = getCounts(regionId, adm);
    c.transit = Math.max(c.transit ?? 0, dates.size);
  }

  // 4d. Apply pass from intermediate waypoints (Movement path)
  const passDaysByRegion = new Map<string, Set<string>>();
  moveWaypoints.forEach((wp, i) => {
    const r = waypointResolutions[i];
    if (!r) return;
    const dKey = localDateKey(wp.t, wp.lon);
    const set = passDaysByRegion.get(r.regionId) ?? new Set<string>();
    set.add(dKey);
    passDaysByRegion.set(r.regionId, set);
    regionAdmLevels.set(r.regionId, r.admLevel);
  });

  for (const [regionId, days] of passDaysByRegion) {
    const adm = regionAdmLevels.get(regionId) ?? 2;
    const c = getCounts(regionId, adm);
    c.pass = (c.pass ?? 0) + days.size;
  }

  // Cap all counts to VISIT_CONFIG[cat].maxCount
  for (const counts of regionCounts.values()) {
    for (const cat of Object.keys(counts) as VisitCategory[]) {
      counts[cat] = Math.min(counts[cat]!, VISIT_CONFIG[cat].maxCount);
    }
  }

  onProgress?.(92, "지역 정보 및 상위 행정구역 취득 중…");
  await yieldToMain();

  // --- 5. Attach Names & Prepare Summaries -----------------------------------
  const allRegionIds = Array.from(regionCounts.keys());
  const [leafRegions, ancestorRegions] = await Promise.all([
    fetchRegionsByIds(allRegionIds),
    fetchAncestorsBulk(allRegionIds),
  ]);
  const regionById = new Map(leafRegions.map((r) => [padId(r.id), r]));
  const ancestorById = new Map(ancestorRegions.map((r) => [padId(r.id), r]));

  const regions: RegionImportSummary[] = allRegionIds.map((regionId) => {
    const region = regionById.get(regionId);
    const admLevel = regionAdmLevels.get(regionId) ?? 2;
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

  const resolution = {
    pointsTried: allPointsToResolve.length,
    pointsResolved: combinedResolutions.filter(Boolean).length,
  };

  onProgress?.(100, "분석 완료!");
  await yieldToMain();

  return { regions, skipped, applyList, resolution };
}

import type {
  Region,
  RegionScore,
  RegionVisit,
  VisitCategory,
} from "@regionevel/types";
import {
  VISIT_CATEGORY_ORDER,
  VISIT_CONFIG,
} from "@regionevel/types";
import { padId } from "./id";

export const POINTS_PER_REGION = 50;

export function calculateScore(visits: RegionVisit[]): Record<VisitCategory, { directCount: number; points: number }> & {
  directScore: number;
} {
  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, { directCount: 0, points: 0 }]),
  ) as Record<VisitCategory, { directCount: number; points: number }>;

  let directScore = 0;

  for (const visit of visits) {
    const cfg = VISIT_CONFIG[visit.category];
    if (!cfg) {
      console.warn(`[scoring] Unknown visit category: ${visit.category} for region ${visit.regionId}`);
      continue;
    }
    const clamped = Math.min(visit.count, cfg.maxCount);
    const points = clamped * cfg.pointsPerCount;
    breakdown[visit.category] = { directCount: clamped, points };
    directScore += points;
  }

  const result: any = { ...breakdown, directScore };
  return result;
}

/**
 * Returns the raw sums of counts for a region and all its descendants.
 * Capping is handled at the scoring level, not during recursive aggregation.
 */
export function getEffectiveCounts(
  regionId: string,
  allVisits: Map<string, RegionVisit[]>,
  parentIdMap: Map<string | null, Region[]>,
  memo: Map<string, Record<VisitCategory, number>>,
  affectedIds?: Set<string>,
): Record<VisitCategory, number> {
  const normalizedId = padId(regionId);
  const cached = memo.get(normalizedId);
  if (cached) return cached;

  const counts = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, 0]),
  ) as Record<VisitCategory, number>;

  // If we know this region and its descendants have no visits, return early
  if (affectedIds && !affectedIds.has(normalizedId)) {
    memo.set(normalizedId, counts);
    return counts;
  }

  // 1. Direct visits of this region
  const directVisits = allVisits.get(normalizedId) || [];
  for (const v of directVisits) {
    if (v.category in counts) {
      counts[v.category] += v.count;
    }
  }

  // 2. Add sums from children using parentIdMap (O(1) lookup)
  const children = parentIdMap.get(normalizedId) || [];
  for (const child of children) {
    const childCounts = getEffectiveCounts(
      padId(child.id),
      allVisits,
      parentIdMap,
      memo,
      affectedIds,
    );
    for (const cat of VISIT_CATEGORY_ORDER) {
      counts[cat] += childCounts[cat];
    }
  }

  memo.set(normalizedId, counts);
  return counts;
}

export function getRegionScore(
  regionId: string,
  allVisits: RegionVisit[] | Map<string, RegionVisit[]>,
  regionMap: Map<string, Region>,
  parentIdMap: Map<string | null, Region[]>,
  memo: Map<string, Record<VisitCategory, number>> = new Map(),
  scoreMemo: Map<string, RegionScore> = new Map(),
  affectedIds?: Set<string>,
  includeStats: boolean = false
): RegionScore {
  const normalizedId = padId(regionId);
  const cached = scoreMemo.get(normalizedId);
  if (cached) return cached;

  // Convert array to map once if needed for performance in deep recursion
  const visitsMap = allVisits instanceof Map 
    ? allVisits 
    : (() => {
        const m = new Map<string, RegionVisit[]>();
        for (const v of allVisits) {
          const rid = padId(v.regionId);
          const list = m.get(rid) || [];
          list.push(v);
          m.set(rid, list);
        }
        return m;
      })();
  
  const region = regionMap.get(normalizedId);
  const admLevel = region?.admLevel ?? 2;
  const isCountry = admLevel === 0;
  const isPrefecture = admLevel === 1;

  // If we know this region and its descendants have no visits, return empty score early
  if (affectedIds && !affectedIds.has(normalizedId)) {
    const emptyResult: RegionScore = {
      regionId: normalizedId,
      directScore: 0,
      rateScore: 0,
      childSum: 0,
      childMax: (region?.childrenCount ?? 0) * POINTS_PER_REGION,
      totalScore: 0,
      scoreType: admLevel < 2 ? "orange" : "blue",
      hasVisit: false,
      breakdown: Object.fromEntries(
        VISIT_CATEGORY_ORDER.map((cat) => [
          cat,
          { directCount: 0, effectiveCount: 0, points: 0 },
        ]),
      ) as RegionScore["breakdown"],
    };
    scoreMemo.set(normalizedId, emptyResult);
    return emptyResult;
  }

  const effectiveCounts = getEffectiveCounts(
    normalizedId,
    visitsMap,
    parentIdMap,
    memo,
    affectedIds,
  );

  const directVisits = visitsMap.get(normalizedId) || [];
  const { directScore: rawDirectScore, ...directBreakdown } = calculateScore(directVisits);

  const children = parentIdMap.get(normalizedId) || [];
  const hasChildren = children.length > 0;

  // Calculate breakdown and points
  const breakdown: RegionScore["breakdown"] = {} as any;
  for (const cat of VISIT_CATEGORY_ORDER) {
    const cfg = VISIT_CONFIG[cat];
    const effectiveCount = effectiveCounts[cat];
    
    const directData = (directBreakdown as any)[cat] || { directCount: 0, points: 0 };
    const pointsCount = hasChildren ? effectiveCount : directData.directCount;
    const points = Math.min(pointsCount, cfg.maxCount) * cfg.pointsPerCount;
    
    breakdown[cat] = {
      directCount: directData.directCount,
      effectiveCount,
      points,
    };
  }

  const effectiveCategoryPoints = VISIT_CATEGORY_ORDER.reduce((sum, cat) => sum + breakdown[cat].points, 0);
  const displayDirectScore = Math.min(100, effectiveCategoryPoints);

  let childSum = 0;
  let hasChildVisit = false;
  let visitedChildrenCount = 0;
  let cityVisited = 0;
  let cityTotal = 0;

  for (const child of children) {
    const childId = padId(child.id);
    const childScore = getRegionScore(childId, visitsMap, regionMap, parentIdMap, memo, scoreMemo, affectedIds, includeStats);
    childSum += childScore.totalScore;
    
    if (childScore.hasVisit) {
      hasChildVisit = true;
      visitedChildrenCount++;
    }

    if (includeStats) {
      if (isPrefecture) {
        cityTotal++;
        if (childScore.hasVisit) cityVisited++;
      } else if (isCountry && childScore.cityStats) {
        cityVisited += childScore.cityStats.visitedCount;
        cityTotal += childScore.cityStats.totalCount;
      }
    }
  }

  const actualChildrenCount = region?.childrenCount ?? children.length;
  const childMax = actualChildrenCount * POINTS_PER_REGION;
  const rawRateScore = childMax > 0 ? Math.min(100, (childSum / childMax) * 100) : 0;
  const rateScore = rawRateScore > 0 ? Math.max(1, Math.ceil(rawRateScore)) : 0;

  const totalHasVisit = (directVisits.length > 0 && directVisits.some(v => v.count > 0)) || hasChildVisit;
  const scoreType = (isCountry || isPrefecture) && rateScore > 0 ? "orange" : "blue";
  
  let displayTotalScore = (isCountry || isPrefecture) 
    ? Math.max(rateScore, Math.round(displayDirectScore))
    : Math.round(displayDirectScore);
    
  if (displayTotalScore === 0 && totalHasVisit) {
    displayTotalScore = 1;
  }

  const result: RegionScore = {
    regionId: normalizedId,
    directScore: Math.round(displayDirectScore),
    rateScore,
    childSum: Math.round(childSum),
    childMax: Math.round(childMax),
    totalScore: displayTotalScore,
    scoreType,
    hasVisit: totalHasVisit,
    breakdown,
  };

  if (includeStats && (isCountry || isPrefecture)) {
    result.subRegionStats = { visitedCount: visitedChildrenCount, totalCount: actualChildrenCount };
    if (cityTotal > 0 || isCountry || isPrefecture) {
      result.cityStats = { visitedCount: cityVisited, totalCount: cityTotal };
    }
  }

  scoreMemo.set(normalizedId, result);
  return result;
}

export function getMapColor(score: RegionScore): string {
  if (score.totalScore === 0) return "#f8fafc";
  
  if (score.scoreType === "orange") {
    const s = Math.round(score.rateScore);
    if (s < 8) return "#fdba74"; // Orange 300 (1~7)
    if (s < 18) return "#fb923c"; // Orange 400 (8~17)
    if (s < 31) return "#f97316"; // Orange 500 (18~30)
    if (s < 51) return "#ea580c"; // Orange 600 (31~50)
    return "#c2410c"; // Orange 700 (51~100)
  } else {
    const s = Math.round(score.directScore);
    if (s < 8) return "#93c5fd"; // Blue 300 (1~7)
    if (s < 18) return "#60a5fa"; // Blue 400 (8~17)
    if (s < 31) return "#3b82f6"; // Blue 500 (18~30)
    if (s < 51) return "#2563eb"; // Blue 600 (31~50)
    return "#1e3a8a"; // Blue 900 (51~100)
  }
}

export function getNextIncrement(
  visits: RegionVisit[],
  regionId: string,
): { category: VisitCategory; newCount: number } | null {
  const rid = padId(regionId);
  for (const cat of VISIT_CATEGORY_ORDER) {
    const existing = visits.find((v) => padId(v.regionId) === rid && v.category === cat);
    const count = existing?.count ?? 0;
    if (count < VISIT_CONFIG[cat].maxCount) {
      return { category: cat, newCount: count + 1 };
    }
  }
  return null;
}

export function getScoreColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score < 8) return "#93c5fd"; // Blue 300
  if (score < 18) return "#60a5fa"; // Blue 400
  if (score < 31) return "#3b82f6"; // Blue 500
  if (score < 51) return "#2563eb"; // Blue 600
  return "#1e3a8a";
}

export function getCumulativeColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score < 8) return "#fdba74"; // Orange 300
  if (score < 18) return "#fb923c"; // Orange 400
  if (score < 31) return "#f97316"; // Orange 500
  if (score < 51) return "#ea580c"; // Orange 600
  return "#c2410c";
}

/**
 * Returns all ancestor IDs including the regionId itself, ordered from child to parent
 */
export function getAffectedAncestors(regionId: string, regionMap: Map<string, Region>): string[] {
  const normalizedId = padId(regionId);
  const affected: string[] = [normalizedId];
  let currentId = normalizedId;
  
  // Use a safety counter to prevent infinite loops in case of data corruption
  let safety = 0;
  while (safety < 10) {
    const region = regionMap.get(currentId);
    if (!region || !region.parentId) break;
    
    const pId = padId(region.parentId);
    if (affected.indexOf(pId) !== -1) break;
    affected.push(pId);
    currentId = pId;
    safety++;
  }
  
  return affected;
}




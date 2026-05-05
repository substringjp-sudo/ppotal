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

export function calculateScore(visits: RegionVisit[]): Record<VisitCategory, { directCount: number; points: number }> & {
  directScore: number;
} {
  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, { directCount: 0, points: 0 }]),
  ) as Record<VisitCategory, { directCount: number; points: number }>;

  let directScore = 0;

  for (const visit of visits) {
    const cfg = VISIT_CONFIG[visit.category];
    const clamped = Math.min(visit.count, cfg.maxCount);
    const points = clamped * cfg.pointsPerCount;
    breakdown[visit.category] = { directCount: clamped, points };
    directScore += points;
  }

  return { ...breakdown, directScore };
}



/**
 * Returns the raw sums of counts for a region and all its descendants.
 * Capping is handled at the scoring level, not during recursive aggregation.
 */
export function getEffectiveCounts(
  regionId: string,
  allRegions: Region[],
  allVisits: RegionVisit[] | Map<string, RegionVisit[]>,
  parentIdMap?: Map<string | null, Region[]>,
  memo: Map<string, Record<VisitCategory, number>> = new Map(),
): Record<VisitCategory, number> {
  const normalizedId = padId(regionId);
  if (memo.has(normalizedId)) return memo.get(normalizedId)!;

  const counts = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, 0]),
  ) as Record<VisitCategory, number>;

  // 1. Direct visits of this region
  const directVisits = Array.isArray(allVisits) 
    ? allVisits.filter((v) => padId(v.regionId) === normalizedId)
    : allVisits.get(normalizedId) || [];

  for (const v of directVisits) {
    // We count direct visits as they are (usually already capped by UI to maxCount)
    counts[v.category] += v.count;
  }

  // 2. Add sums from children
  const childrenFromRegions = parentIdMap
    ? parentIdMap.get(normalizedId) || []
    : allRegions.filter((r) => padId(r.parentId) === normalizedId);
    
  // If we have children in the region list, we use them.
  // If not (partial list), we might need to infer from visits, but usually parentIdMap is provided.
  const allChildIds = new Set(childrenFromRegions.map(r => padId(r.id)));

  for (const childId of allChildIds) {
    const childCounts = getEffectiveCounts(
      childId,
      allRegions,
      allVisits,
      parentIdMap,
      memo,
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
  allRegions: Region[] = [],
  parentIdMap?: Map<string | null, Region[]>,
  memo?: Map<string, Record<VisitCategory, number>>,
  scoreMemo?: Map<string, RegionScore>,
): RegionScore {
  const normalizedId = padId(regionId);
  if (scoreMemo?.has(normalizedId)) return scoreMemo.get(normalizedId)!;
  
  const activeMemo = memo || new Map();
  const activeScoreMemo = scoreMemo || new Map();
  
  const effectiveCounts = getEffectiveCounts(
    normalizedId,
    allRegions,
    allVisits,
    parentIdMap,
    activeMemo,
  );

  // Get direct visits for this region
  const directVisits = Array.isArray(allVisits)
    ? allVisits.filter((v) => padId(v.regionId) === normalizedId)
    : allVisits.get(normalizedId) || [];
    
  const { directScore: rawDirectScore, ...directBreakdown } = calculateScore(directVisits);

  // Identify the region
  const region = allRegions.find(r => padId(r.id) === normalizedId);
  const isCountry = region?.admLevel === 0;
  const isPrefecture = region?.admLevel === 1;

  // Children for aggregation
  const childrenFromRegions = parentIdMap
    ? parentIdMap.get(normalizedId) || []
    : allRegions.filter((r) => padId(r.parentId) === normalizedId);
  
  const allChildIds = new Set(childrenFromRegions.map(r => padId(r.id)));
  const hasChildren = allChildIds.size > 0;

  // Calculate breakdown and points
  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => {
      const cfg = VISIT_CONFIG[cat];
      const effectiveCount = effectiveCounts[cat];
      
      // Rule: For regions with children, we sum descendant counts and then cap at maxCount.
      // For leaf regions (cities), it's just the direct count (already capped in directBreakdown).
      const pointsCount = hasChildren ? effectiveCount : directBreakdown[cat].directCount;
      const points = Math.min(pointsCount, cfg.maxCount) * cfg.pointsPerCount;
      
      return [
        cat,
        {
          directCount: directBreakdown[cat].directCount,
          effectiveCount,
          points,
        },
      ];
    }),
  ) as RegionScore["breakdown"];

  const effectiveCategoryPoints = VISIT_CATEGORY_ORDER.reduce((sum, cat) => {
    return sum + breakdown[cat].points;
  }, 0);

  // Points capped at 100
  const displayDirectScore = Math.min(100, effectiveCategoryPoints);

  // Recursively get child scores for rateScore calculation
  let childSum = 0;
  let hasChildVisit = false;
  for (const childId of allChildIds) {
    const childScore = getRegionScore(childId, allVisits, allRegions, parentIdMap, activeMemo, activeScoreMemo);
    childSum += childScore.totalScore;
    if (childScore.hasVisit) hasChildVisit = true;
  }

  const actualChildrenCount = region?.childrenCount ?? allChildIds.size;

  // rateScore (occupancy rate) formula: (childSum) / (children.length * 50)
  const childMax = actualChildrenCount * 50;
  const rawRateScore = childMax > 0 ? Math.min(100, (childSum / childMax) * 100) : 0;
  
  // Floor at 1% if any visit exists
  const rateScore = rawRateScore > 0 ? Math.max(1, Math.ceil(rawRateScore)) : 0;

  const hasDirectVisit = directVisits.some(v => v.count > 0);
  const totalHasVisit = hasDirectVisit || hasChildVisit;

  // scoreType: orange for aggregated regions (countries/prefectures), blue for individual
  const scoreType = (isCountry || isPrefecture) ? "orange" : "blue";
  
  // totalScore: for countries/prefectures, we usually prefer rateScore.
  // If rateScore is 0 but hasDirectVisit, use displayDirectScore.
  let displayTotalScore = (isCountry || isPrefecture) 
    ? (rateScore > 0 ? rateScore : Math.round(displayDirectScore))
    : Math.round(displayDirectScore);
    
  // Final visit floor
  if (displayTotalScore === 0 && totalHasVisit) {
    displayTotalScore = 1;
  }

  // Stats for tooltips
  let subRegionStats = undefined;
  let cityStats = undefined;

  if (isCountry) {
    let munVisited = 0;
    let munTotal = 0;
    let cityVisited = 0;
    let cityTotal = 0;

    // Direct children of country are municipalities (Prefectures)
    for (const munId of allChildIds) {
      munTotal++;
      const munScore = getRegionScore(munId, allVisits, allRegions, parentIdMap, activeMemo, activeScoreMemo);
      if (munScore.hasVisit) munVisited++;

      // Children of prefectures are cities
      const munChildren = parentIdMap?.get(padId(munId)) || [];
      for (const city of munChildren) {
        cityTotal++;
        const cityScore = getRegionScore(city.id, allVisits, allRegions, parentIdMap, activeMemo, activeScoreMemo);
        if (cityScore.hasVisit) cityVisited++;
      }
    }
    subRegionStats = { visitedCount: munVisited, totalCount: munTotal };
    cityStats = { visitedCount: cityVisited, totalCount: cityTotal };
  } else if (isPrefecture) {
    let cityVisited = 0;
    let cityTotal = 0;
    for (const cityId of allChildIds) {
      cityTotal++;
      const cityScore = getRegionScore(cityId, allVisits, allRegions, parentIdMap, activeMemo, activeScoreMemo);
      if (cityScore.hasVisit) cityVisited++;
    }
    subRegionStats = { visitedCount: cityVisited, totalCount: cityTotal };
    cityStats = { visitedCount: cityVisited, totalCount: cityTotal };
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
    subRegionStats,
    cityStats,
  };

  activeScoreMemo.set(normalizedId, result);
  return result;
}



export function getMapColor(score: RegionScore): string {
  if (score.totalScore === 0) return "#f8fafc";
  
  if (score.scoreType === "orange") {
    // Orange scale for rateScore (Thresholds: 10, 30, 50, 70)
    const s = Math.round(score.rateScore);
    if (s < 10) return "#ffedd5";
    if (s < 30) return "#fdba74";
    if (s < 50) return "#f97316";
    if (s < 70) return "#ea580c";
    return "#c2410c";
  } else {
    // Blue scale for directScore (Thresholds: 10, 30, 50, 70)
    const s = Math.round(score.directScore);
    if (s < 10) return "#eff6ff";
    if (s < 30) return "#bfdbfe";
    if (s < 50) return "#60a5fa";
    if (s < 70) return "#2563eb";
    return "#1e3a8a";
  }
}

// Returns the next category+count to increment on a map click.
export function getNextIncrement(
  visits: RegionVisit[],
  regionId: string,
): { category: VisitCategory; newCount: number } | null {
  for (const cat of VISIT_CATEGORY_ORDER) {
    const existing = visits.find(
      (v) => v.regionId === regionId && v.category === cat,
    );
    const count = existing?.count ?? 0;
    if (count < VISIT_CONFIG[cat].maxCount) {
      return { category: cat, newCount: count + 1 };
    }
  }
  return null;
}

export function getScoreColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score < 10) return "#eff6ff";
  if (score < 30) return "#bfdbfe";
  if (score < 50) return "#60a5fa";
  if (score < 70) return "#2563eb";
  return "#1e3a8a";
}

export function getCumulativeColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score < 10) return "#ffedd5";
  if (score < 30) return "#fdba74";
  if (score < 50) return "#f97316";
  if (score < 70) return "#ea580c";
  return "#c2410c";
}



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
 * Returns the effective counts for a region, considering its own visits
 * and the visits of all its descendants, capped at maxCount per category.
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

  // 1. Start with direct visits of this region (raw count)
  const directVisits = Array.isArray(allVisits) 
    ? allVisits.filter((v) => padId(v.regionId) === normalizedId)
    : allVisits.get(normalizedId) || [];

  for (const v of directVisits) {
    counts[v.category] = Math.min(v.count, VISIT_CONFIG[v.category].maxCount);
  }

  // 2. Add 1 for each immediate child that has any effective visits in that category
  // If allRegions is partial, we can still identify children that have visits from the allVisits list.
  const childrenIdsWithVisits = new Set<string>();
  const normalizedVisits = Array.isArray(allVisits) ? allVisits : Array.from(allVisits.values()).flat();
  
  for (const v of normalizedVisits) {
    const vId = padId(v.regionId);
    if (vId.startsWith(normalizedId) && vId.length > normalizedId.length) {
      // Determine the immediate child ID
      let childId = "";
      if (normalizedId.length === 3) childId = vId.substring(0, 7);
      else if (normalizedId.length === 7) childId = vId.substring(0, 12);
      
      if (childId && childId !== normalizedId) {
        childrenIdsWithVisits.add(childId);
      }
    }
  }

  // Combine children from allRegions and inferred from visits
  const childrenFromRegions = parentIdMap
    ? parentIdMap.get(normalizedId) || []
    : allRegions.filter((r) => padId(r.parentId) === normalizedId);
    
  const allChildIds = new Set(childrenFromRegions.map(r => padId(r.id)));
  for (const id of childrenIdsWithVisits) allChildIds.add(id);

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

  // 3. Cap each category at its maxCount
  for (const cat of VISIT_CATEGORY_ORDER) {
    counts[cat] = Math.min(counts[cat], VISIT_CONFIG[cat].maxCount);
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

  // Identify the region's level
  const region = allRegions.find(r => padId(r.id) === normalizedId);
  const isCountry = region?.admLevel === 0;
  const isPrefecture = region?.admLevel === 1;

  // Use effectiveCounts for breakdown and points if it's a prefecture with children
  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => {
      const cfg = VISIT_CONFIG[cat];
      const effectiveCount = effectiveCounts[cat];
      // For prefectures, we want to show the aggregate count as the primary count
      const displayCount = isPrefecture ? effectiveCount : directBreakdown[cat].directCount;
      
      return [
        cat,
        {
          directCount: directBreakdown[cat].directCount,
          effectiveCount,
          points: displayCount * cfg.pointsPerCount,
        },
      ];
    }),
  ) as RegionScore["breakdown"];

  const effectiveCategoryPoints = VISIT_CATEGORY_ORDER.reduce((sum, cat) => {
    return sum + breakdown[cat].points;
  }, 0);

  const displayDirectScore = Math.min(100, effectiveCategoryPoints);

  // Get actual children for sum
  const childrenFromRegions = parentIdMap
    ? parentIdMap.get(normalizedId) || []
    : allRegions.filter((r) => padId(r.parentId) === normalizedId);

  // Inferred children from visits (even if not in allRegions)
  const inferredChildIds = new Set<string>();
  const normalizedVisits = Array.isArray(allVisits) ? allVisits : Array.from(allVisits.values()).flat();
  for (const v of normalizedVisits) {
    const vId = padId(v.regionId);
    if (vId.startsWith(normalizedId) && vId.length > normalizedId.length) {
      if (normalizedId.length === 3) inferredChildIds.add(vId.substring(0, 7));
      else if (normalizedId.length === 7) inferredChildIds.add(vId.substring(0, 12));
    }
  }

  const allChildIds = new Set([...childrenFromRegions.map(r => padId(r.id)), ...inferredChildIds]);

  let childSum = 0;
  for (const childId of allChildIds) {
    const childScore = getRegionScore(childId, allVisits, allRegions, parentIdMap, activeMemo, activeScoreMemo);
    childSum += childScore.totalScore;
  }

  // Identify the region's level and childrenCount
  const actualChildrenCount = region?.childrenCount ?? allChildIds.size;

  // User's formula: (childSum) / (children.length * 50), capped at 100
  const childMax = actualChildrenCount * 50;
  const rawRankScore = childMax > 0 ? Math.min(100, (childSum / childMax) * 100) : 0;
  const rankScore = Math.round(rawRankScore);

  // Rule: Countries have 0 direct score (only sub-region sum matters).
  const effectiveDirectScore = isCountry ? 0 : displayDirectScore;
  
  // Rule: If there are child scores, show orange (aggregated). 
  // Otherwise, if there is a direct score, show blue (individual).
  const scoreType = rankScore > 0 ? "orange" : "blue";
  
  // Final score for display: if orange, use rankScore; if blue, use directScore.
  const displayTotalScore = scoreType === "orange" ? rankScore : Math.round(effectiveDirectScore);

  const result: RegionScore = {
    regionId: normalizedId,
    directScore: Math.round(effectiveDirectScore),
    rankScore: Math.round(rankScore),
    childSum: Math.round(childSum),
    childMax: Math.round(childMax),
    totalScore: displayTotalScore,
    scoreType,
    breakdown,
  };

  activeScoreMemo.set(normalizedId, result);
  return result;
}


export function getMapColor(score: RegionScore): string {
  if (score.totalScore === 0) return "#f8fafc";
  
  if (score.scoreType === "orange") {
    // Orange scale for rankScore (Thresholds: 10, 30, 50, 70)
    const s = Math.round(score.rankScore);
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



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
  if (memo.has(regionId)) return memo.get(regionId)!;

  const counts = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, 0]),
  ) as Record<VisitCategory, number>;

  // 1. Add direct visits of this region
  // Performance optimization: Use pre-grouped visits map if available
  const directVisits = Array.isArray(allVisits) 
    ? allVisits.filter((v) => v.regionId === regionId)
    : allVisits.get(regionId) || [];

  for (const v of directVisits) {
    counts[v.category] += v.count;
  }

  // 2. Recursively add counts from children
  const children = parentIdMap
    ? parentIdMap.get(regionId) || []
    : allRegions.filter((r) => r.parentId === regionId);

  for (const child of children) {
    const childCounts = getEffectiveCounts(
      child.id,
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

  memo.set(regionId, counts);
  return counts;
}

export function getRegionScore(
  regionId: string,
  allVisits: RegionVisit[] | Map<string, RegionVisit[]>,
  allRegions: Region[] = [],
  parentIdMap?: Map<string | null, Region[]>,
  memo?: Map<string, Record<VisitCategory, number>>,
): RegionScore {
  const activeMemo = memo || new Map();
  
  const effectiveCounts = getEffectiveCounts(
    regionId,
    allRegions,
    allVisits,
    parentIdMap,
    activeMemo,
  );

  // Get direct visits for this region
  const directVisits = Array.isArray(allVisits)
    ? allVisits.filter((v) => v.regionId === regionId)
    : allVisits.get(regionId) || [];
    
  const { directScore, ...directBreakdown } = calculateScore(directVisits);

  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => {
      const cfg = VISIT_CONFIG[cat];
      const effectiveCount = effectiveCounts[cat];
      const directCount = directBreakdown[cat].directCount;
      return [
        cat,
        {
          directCount,
          effectiveCount,
          points: effectiveCount * cfg.pointsPerCount,
        },
      ];
    }),
  ) as RegionScore["breakdown"];

  const totalScore = Math.min(
    100,
    VISIT_CATEGORY_ORDER.reduce((sum, cat) => sum + breakdown[cat].points, 0),
  );
  
  const finalDirectScore = Math.min(100, directScore);

  return {
    regionId,
    directScore: finalDirectScore,
    aggregatedChildScore: Math.max(0, totalScore - finalDirectScore),
    totalScore,
    breakdown,
  };
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

// Legacy wrapper to maintain compatibility while transitioning.
// In the new logic, "aggregatedChildScore" is derived from getRegionScore.
export function getAggregatedChildScore(
  regionId: string,
  allRegions: Region[],
  allVisits: RegionVisit[],
  parentIdMap?: Map<string | null, Region[]>,
  memo?: Map<string, number>, // Unused in new logic but kept for signature
): number {
  const score = getRegionScore(regionId, allVisits, allRegions, parentIdMap);
  return score.aggregatedChildScore;
}

export function getScoreColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score < 5) return "#eff6ff";   // Very light: 1-4
  if (score < 10) return "#bfdbfe";  // Level 1: 5+
  if (score < 30) return "#60a5fa";  // Level 2: 10+
  if (score < 50) return "#2563eb";  // Level 3: 30+
  if (score < 100) return "#1e3a8a"; // Level 4: 50+
  return "#0f172a";                  // Level 5: 100 (kept as max)
}

export function getCumulativeColor(score: number, allScores: number[]): string {
  if (score === 0) return "#f8fafc";
  
  // Sort scores to calculate percentiles
  const sorted = [...allScores].filter(s => s > 0).sort((a, b) => b - a);
  if (sorted.length === 0) return "#f8fafc";

  const index = sorted.indexOf(score);
  if (index === -1) return "#f8fafc";
  
  const percentile = (index / sorted.length) * 100;

  if (percentile <= 1) return "#c2410c";   // Top 1% (Orange 700)
  if (percentile <= 10) return "#f97316";  // Top 10% (Orange 500)
  if (percentile <= 30) return "#fdba74";  // Top 30% (Orange 300)
  if (percentile <= 50) return "#ffedd5";  // Top 50% (Orange 100)
  return "#fff7ed";                        // Others (Orange 50)
}

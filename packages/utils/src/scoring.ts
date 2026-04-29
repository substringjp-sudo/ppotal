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

export function calculateScore(visits: RegionVisit[]): RegionScore["breakdown"] & {
  directScore: number;
} {
  const breakdown = Object.fromEntries(
    VISIT_CATEGORY_ORDER.map((cat) => [cat, { count: 0, points: 0 }]),
  ) as RegionScore["breakdown"];

  let directScore = 0;

  for (const visit of visits) {
    const cfg = VISIT_CONFIG[visit.category];
    const clamped = Math.min(visit.count, cfg.maxCount);
    const points = clamped * cfg.pointsPerCount;
    breakdown[visit.category] = { count: clamped, points };
    directScore += points;
  }

  return { ...breakdown, directScore };
}

export function getRegionScore(
  regionId: string,
  visits: RegionVisit[],
  aggregatedChildScore = 0,
): RegionScore {
  const regionVisits = visits.filter((v) => v.regionId === regionId);
  const { directScore, ...breakdown } = calculateScore(regionVisits);

  return {
    regionId,
    directScore,
    aggregatedChildScore,
    totalScore: directScore + aggregatedChildScore,
    breakdown: breakdown as RegionScore["breakdown"],
  };
}

// Returns the next category+count to increment on a map click.
// Finds the first category that hasn't reached maxCount.
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

// Sums direct scores of all descendants of a region.
export function getAggregatedChildScore(
  regionId: string,
  allRegions: Region[],
  allVisits: RegionVisit[],
): number {
  const children = allRegions.filter((r) => r.parentId === regionId);
  if (children.length === 0) return 0;

  return children.reduce((sum, child) => {
    const directScore = calculateScore(
      allVisits.filter((v) => v.regionId === child.id),
    ).directScore;
    const childAgg = getAggregatedChildScore(child.id, allRegions, allVisits);
    return sum + directScore + childAgg;
  }, 0);
}

export function getScoreColor(score: number): string {
  if (score === 0) return "#f8fafc";
  if (score <= 20) return "#bfdbfe";
  if (score <= 40) return "#60a5fa";
  if (score <= 70) return "#2563eb";
  return "#1e3a8a";
}

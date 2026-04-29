export type VisitCategory =
  | "passing"
  | "transit"
  | "visit"
  | "accommodation"
  | "residence";

export interface VisitCategoryConfig {
  label: string;
  maxCount: number;
  pointsPerCount: number;
  maxPoints: number;
}

export const VISIT_CONFIG: Record<VisitCategory, VisitCategoryConfig> = {
  passing: { label: "지나감", maxCount: 5, pointsPerCount: 1, maxPoints: 5 },
  transit: {
    label: "발을 붙임",
    maxCount: 5,
    pointsPerCount: 2,
    maxPoints: 10,
  },
  visit: {
    label: "소비 및 방문",
    maxCount: 3,
    pointsPerCount: 5,
    maxPoints: 15,
  },
  accommodation: {
    label: "숙박",
    maxCount: 3,
    pointsPerCount: 10,
    maxPoints: 30,
  },
  residence: {
    label: "거주",
    maxCount: 1,
    pointsPerCount: 40,
    maxPoints: 40,
  },
} as const;

export const VISIT_CATEGORY_ORDER: VisitCategory[] = [
  "passing",
  "transit",
  "visit",
  "accommodation",
  "residence",
];

export const MAX_TOTAL_SCORE = 100;

// geoBoundaries ADM level: 0=country, 1=province, 2=city, 3=district, 4=sub-district
export type AdmLevel = 0 | 1 | 2 | 3 | 4;

export interface Region {
  // geoBoundaries shapeID used as-is — globally unique, no name/code matching
  id: string;
  parentId: string | null;
  name: string;
  iso3: string; // ISO 3166-1 alpha-3
  admLevel: AdmLevel;
}

export interface RegionVisit {
  regionId: string;
  category: VisitCategory;
  count: number;
  notes?: string;
}

export interface RegionScoreBreakdown {
  count: number;
  points: number;
}

export interface RegionScore {
  regionId: string;
  directScore: number;
  aggregatedChildScore: number;
  totalScore: number;
  breakdown: Record<VisitCategory, RegionScoreBreakdown>;
}

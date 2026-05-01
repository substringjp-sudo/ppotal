export type VisitCategory =
  | "passing"
  | "transit"
  | "visit"
  | "accommodation"
  | "residence";

export interface VisitCategoryConfig {
  label: string;
  description: string;
  maxCount: number;
  pointsPerCount: number;
  maxPoints: number;
}

export const VISIT_CONFIG: Record<VisitCategory, VisitCategoryConfig> = {
  passing: { 
    label: "Passing", 
    description: "Bus, Train, Car",
    maxCount: 5, 
    pointsPerCount: 1, 
    maxPoints: 5 
  },
  transit: {
    label: "Transit",
    description: "Station, Airport",
    maxCount: 5,
    pointsPerCount: 2,
    maxPoints: 10,
  },
  visit: {
    label: "Visit",
    description: "Dining, Sightsee",
    maxCount: 3,
    pointsPerCount: 5,
    maxPoints: 15,
  },
  accommodation: {
    label: "Stay",
    description: "Hotel, Friends",
    maxCount: 3,
    pointsPerCount: 10,
    maxPoints: 30,
  },
  residence: {
    label: "Residence",
    description: "Live, Long-term",
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
  updatedAt?: number; // ms since epoch — used for conflict resolution during sync
}

export interface RegionScoreBreakdown {
  directCount: number;
  effectiveCount: number;
  points: number;
}

export interface RegionScore {
  regionId: string;
  directScore: number;
  aggregatedChildScore: number;
  totalScore: number;
  cumulativeScore?: number;
  breakdown: Record<VisitCategory, RegionScoreBreakdown>;
}

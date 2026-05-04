export type VisitCategory = "transit" | "visit" | "stay" | "live";

export interface VisitCategoryConfig {
  label: string;
  description: string;
  maxCount: number;
  pointsPerCount: number;
  maxPoints: number;
}

export const VISIT_CONFIG: Record<VisitCategory, VisitCategoryConfig> = {
  transit: {
    label: "Transit",
    description: "Passing through or short stay",
    maxCount: 5,
    pointsPerCount: 2,
    maxPoints: 10,
  },
  visit: {
    label: "Visit",
    description: "Sightseeing or dining",
    maxCount: 5,
    pointsPerCount: 4,
    maxPoints: 20,
  },
  stay: {
    label: "Stay",
    description: "Overnight stay",
    maxCount: 5,
    pointsPerCount: 6,
    maxPoints: 30,
  },
  live: {
    label: "Live",
    description: "Residence or long-term",
    maxCount: 1,
    pointsPerCount: 40,
    maxPoints: 40,
  },
} as const;

export const VISIT_CATEGORY_ORDER: VisitCategory[] = [
  "transit",
  "visit",
  "stay",
  "live",
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
  childrenCount?: number;
  code?: string;
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
  directScore: number;     // 점수 (자체 방문)
  rankScore: number;       // 하위 지역 합산 점수 (0-100)
  childSum: number;        // 하위 지역 점수 총합
  childMax: number;        // 하위 지역 가용 최대 점수
  totalScore: number;      // 지도 표시용 최종 점수 (rankScore > 0 ? rankScore : directScore)
  scoreType: "blue" | "orange"; // 색상 계열 결정
  breakdown: Record<VisitCategory, RegionScoreBreakdown>;
}

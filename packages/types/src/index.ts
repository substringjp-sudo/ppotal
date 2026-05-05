export type VisitCategory = "pass" | "transit" | "visit" | "stay" | "residence";

export interface VisitCategoryConfig {
  label: string;
  description: string;
  maxCount: number;
  pointsPerCount: number;
  maxPoints: number;
}

export const VISIT_CONFIG: Record<VisitCategory, VisitCategoryConfig> = {
  pass: {
    label: "Pass (통과)",
    description: "Briefly passed through",
    maxCount: 5,
    pointsPerCount: 1,
    maxPoints: 5,
  },
  transit: {
    label: "Transit (경유)",
    description: "Passing through or short stay",
    maxCount: 5,
    pointsPerCount: 2,
    maxPoints: 10,
  },
  visit: {
    label: "Visit (방문)",
    description: "Sightseeing or dining",
    maxCount: 3,
    pointsPerCount: 5,
    maxPoints: 15,
  },
  stay: {
    label: "Stay (숙박)",
    description: "Overnight stay",
    maxCount: 3,
    pointsPerCount: 10,
    maxPoints: 30,
  },
  residence: {
    label: "Residence (거주)",
    description: "Residence or long-term",
    maxCount: 1,
    pointsPerCount: 40,
    maxPoints: 40,
  },
} as const;

export const VISIT_CATEGORY_ORDER: VisitCategory[] = [
  "pass",
  "transit",
  "visit",
  "stay",
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
  rateScore: number;       // 하위 지역 합산 점수 (0-100)
  childSum: number;        // 하위 지역 점수 총합
  childMax: number;        // 하위 지역 가용 최대 점수
  totalScore: number;      // 지도 표시용 최종 점수 (rateScore > 0 ? rateScore : directScore)
  scoreType: "blue" | "orange"; // 색상 계열 결정
  hasVisit: boolean;       // 실제 방문 여부 (점수와 무관하게 카운트용)
  breakdown: Record<VisitCategory, RegionScoreBreakdown>;
  subRegionStats?: {
    visitedCount: number;
    totalCount: number;
  };
  cityStats?: {
    visitedCount: number;
    totalCount: number;
  };
}


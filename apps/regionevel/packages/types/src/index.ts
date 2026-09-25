export type VisitCategory = "pass" | "transit" | "visit" | "stay" | "residence";

export interface VisitCategoryConfig {
  label: string;
  description: string;
  maxCount: number;
  pointsPerCount: number;
  maxPoints: number;
  color: string;
  emoji: string;
}

export const VISIT_CONFIG: Record<VisitCategory, VisitCategoryConfig> = {
  pass: {
    label: "Pass",
    description: "Passing through by car or train",
    maxCount: 5,
    pointsPerCount: 1,
    maxPoints: 5,
    color: "#FFD60A",
    emoji: "🚗",
  },
  transit: {
    label: "Transit",
    description: "Brief stop at a station or rest area",
    maxCount: 5,
    pointsPerCount: 2,
    maxPoints: 10,
    color: "#FF9F0A",
    emoji: "🚉",
  },
  visit: {
    label: "Visit",
    description: "Sightseeing or having a meal",
    maxCount: 3,
    pointsPerCount: 5,
    maxPoints: 15,
    color: "#32ADE6",
    emoji: "📸",
  },
  stay: {
    label: "Stay",
    description: "Staying overnight (one or more nights)",
    maxCount: 3,
    pointsPerCount: 10,
    maxPoints: 30,
    color: "#007AFF",
    emoji: "🛌",
  },
  residence: {
    label: "Residence",
    description: "Living or long-term stay",
    maxCount: 1,
    pointsPerCount: 40,
    maxPoints: 40,
    color: "#5856D6",
    emoji: "🏠",
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
  /**
   * Numeric, and its width carries the level: 3 digits a country, 7 a
   * prefecture, 12 a city. `padId` infers the level from that width, and
   * visits, scores and regions all join on the padded form — so this is a key,
   * not a reference to the source data. Use `shapeId` for that.
   */
  id: string;
  parentId: string | null;
  name: string;
  nameKo?: string;
  nameEn?: string;
  iso3: string; // ISO 3166-1 alpha-3
  admLevel: AdmLevel;
  childrenCount?: number;
  code?: string;
  type?: string;
  /**
   * The boundary this region was built from, as the source identifies it.
   *
   * The join key between a region and its shape. Matching the two by name
   * instead is what produced every boundary fault found so far: shapes whose
   * name is null matched nothing and became holes in the map, the same missing
   * names elsewhere went in as the literal string "Null", and two
   * municipalities that romanise alike — 豊島区 and 利島村, 三郷市 and 美里町 —
   * collapsed into one record. A shapeID has none of those failure modes.
   */
  shapeId?: string;
  /**
   * Set when no source could name this boundary.
   *
   * A region with no name is still a region: it draws, it can be hovered, and
   * it counts. Dropping it instead is what left holes you could not even point
   * at, so the gap is recorded rather than acted on.
   */
  nameMissing?: boolean;
}

export interface RegionVisit {
  regionId: string;
  category: VisitCategory;
  count: number;
  notes?: string;
  updatedAt?: number; // ms since epoch — used for conflict resolution during sync
  /**
   * Local dates ("YYYY-MM-DD") the counted occasions happened on, oldest first.
   *
   * Distinct from `updatedAt`, which is when the record was written. Only a
   * timeline import knows these; a hand-added visit has none, so this is absent
   * rather than empty. One entry per counted occasion, so `dates.length` is at
   * most `count` — both are capped by the category's `maxCount` together.
   */
  dates?: string[];
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


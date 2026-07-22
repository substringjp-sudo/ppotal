import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { REGIONEVEL_ACHIEVEMENTS, getTotalFootprintScore } from "./achievements";

export type RankingCriterion =
  | "totalScore"
  | "prefectures"
  | "cities"
  | "countries"
  | "stayResidence"
  | "achievements";

export interface UserRankEntry {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  totalScore: number;
  prefecturesCount: number;
  citiesCount: number;
  countriesCount: number;
  stayResidenceCount: number;
  achievementsUnlocked: number;
  level: number;
  updatedAt?: string;
}

export const CRITERIA_DEFINITIONS: Record<
  RankingCriterion,
  {
    key: RankingCriterion;
    title: { ko: string; en: string; ja: string };
    unit: { ko: string; en: string; ja: string };
    icon: string;
    description: { ko: string; en: string; ja: string };
  }
> = {
  totalScore: {
    key: "totalScore",
    title: { ko: "총 방문 스코어", en: "Total Footprint Score", ja: "総訪問スコア" },
    unit: { ko: "점", en: " pts", ja: "点" },
    icon: "bar-chart-3",
    description: {
      ko: "전 세계 모든 국가 및 지역의 누적 풋프린트 레벨 점수 합계",
      en: "Total cumulative footprint score across all nations and regions",
      ja: "全世界・全地域の累計レベルスコア合計",
    },
  },
  prefectures: {
    key: "prefectures",
    title: { ko: "행정구역/도도부현", en: "Prefectures Visited", ja: "都道府県・行政区" },
    unit: { ko: "개 지역", en: " prefectures", ja: "地域" },
    icon: "map",
    description: {
      ko: "방문 레벨을 달성한 행정구역(1차 행정 단위) 개수",
      en: "Number of Level 1 admin regions/prefectures visited",
      ja: "足跡を記録した第1次行政区画・都道府県の数",
    },
  },
  cities: {
    key: "cities",
    title: { ko: "시정촌/도시 정복", en: "Cities Visited", ja: "市町村・都市制覇" },
    unit: { ko: "개 도시", en: " cities", ja: "都市" },
    icon: "building-2",
    description: {
      ko: "방문 레벨을 달성한 2차 시정촌 및 도시 단위 개수",
      en: "Number of Level 2 cities and municipalities visited",
      ja: "足跡を記録した第2次市町村・都市の数",
    },
  },
  countries: {
    key: "countries",
    title: { ko: "방문 국가 수", en: "Countries Visited", ja: "訪問国数" },
    unit: { ko: "개국", en: " countries", ja: "ヶ国" },
    icon: "globe",
    description: {
      ko: "발자국을 남긴 전 세계 독립국 및 국가 단위 수",
      en: "Number of sovereign countries logged in your footprint",
      ja: "足跡を記録した世界の国々",
    },
  },
  stayResidence: {
    key: "stayResidence",
    title: { ko: "체류 & 거주 스코어", en: "Stay & Residence Score", ja: "滞在・居住スコア" },
    unit: { ko: "회", en: " times", ja: "回" },
    icon: "hotel",
    description: {
      ko: "숙박(Stay) 및 거주(Residence) 카테고리의 누적 기록 횟수",
      en: "Total entries logged under Stay and Residence footprint levels",
      ja: "滞在(Stay)および居住(Residence)レベルの累計記録数",
    },
  },
  achievements: {
    key: "achievements",
    title: { ko: "획득 업적 수", en: "Achievements Unlocked", ja: "獲得実績数" },
    unit: { ko: "개", en: " badges", ja: "個" },
    icon: "award",
    description: {
      ko: "분야별·지역별·국지적 업적 챌린지 성공 개수",
      en: "Number of achievement badges unlocked across categories",
      ja: "全カテゴリで達成した実績バッジの数",
    },
  },
};

// Calculate current user's full rank stats
export const computeUserRankEntry = (
  uid: string,
  displayName: string,
  email: string | undefined,
  visits: RegionVisit[],
  stats: {
    visitedCountries: number;
    visitedPrefectures: number;
    visitedCities: number;
    pass: number;
    transit: number;
    visit: number;
    stay: number;
    residence: number;
  },
  scores: Record<string, RegionScore>,
  allRegions: Region[]
): UserRankEntry => {
  const totalScore = Math.round(getTotalFootprintScore(scores));
  const stayResidenceCount = (stats.stay || 0) + (stats.residence || 0);

  let unlockedCount = 0;
  REGIONEVEL_ACHIEVEMENTS.forEach((ach) => {
    const res = ach.calcProgress(visits, stats, scores, allRegions);
    if (res.isUnlocked) unlockedCount++;
  });

  const level = Math.max(1, Math.min(99, Math.floor(Math.sqrt(totalScore / 5)) + 1));

  return {
    uid,
    displayName: displayName || email?.split("@")[0] || "Footprint Explorer",
    ...(email ? { email } : {}),
    totalScore,
    prefecturesCount: stats.visitedPrefectures || 0,
    citiesCount: stats.visitedCities || 0,
    countriesCount: stats.visitedCountries || 0,
    stayResidenceCount,
    achievementsUnlocked: unlockedCount,
    level,
    updatedAt: new Date().toISOString(),
  };
};

// Real community users fetched from Firestore
export const DEMO_COMMUNITY_USERS: UserRankEntry[] = [];

export const getCriterionValue = (user: UserRankEntry, criterion: RankingCriterion): number => {
  switch (criterion) {
    case "totalScore":
      return user.totalScore;
    case "prefectures":
      return user.prefecturesCount;
    case "cities":
      return user.citiesCount;
    case "countries":
      return user.countriesCount;
    case "stayResidence":
      return user.stayResidenceCount;
    case "achievements":
      return user.achievementsUnlocked;
    default:
      return user.totalScore;
  }
};

export const sortUsersByCriterion = (
  users: UserRankEntry[],
  criterion: RankingCriterion
): UserRankEntry[] => {
  return [...users].sort((a, b) => {
    return getCriterionValue(b, criterion) - getCriterionValue(a, criterion);
  });
};

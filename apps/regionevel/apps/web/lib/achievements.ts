import type { Region, RegionScore, RegionVisit } from "@regionevel/types";
import { padId } from "@regionevel/utils";

export interface Achievement {
  id: string;
  category: "field" | "region" | "local";
  icon: string;
  color: string;
  title: {
    ko: string;
    en: string;
    ja: string;
  };
  description: {
    ko: string;
    en: string;
    ja: string;
  };
  maxProgress: number;
  calcProgress: (
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
  ) => { current: number; percent: number; isUnlocked: boolean };
}

// Helper: calculate total footprint score across all regions
export const getTotalFootprintScore = (scores: Record<string, RegionScore>): number => {
  let total = 0;
  Object.values(scores).forEach((s) => {
    total += s.totalScore || 0;
  });
  return total;
};

// Helper: check if region or its parent is visited
const hasVisitedRegionName = (
  visits: RegionVisit[],
  allRegions: Region[],
  queryNames: string[]
): boolean => {
  const visitedSet = new Set(visits.map((v) => padId(v.regionId)));
  return allRegions.some((r) => {
    const rId = padId(r.id);
    if (!visitedSet.has(rId)) return false;
    const nameStr = (r.nameKo + r.name + (r.nameEn || "")).toLowerCase();
    return queryNames.some((q) => nameStr.includes(q.toLowerCase()));
  });
};

export const REGIONEVEL_ACHIEVEMENTS: Achievement[] = [
  // ==================== 🌐 분야별 (Field) ====================
  {
    id: "reg_first_footprint",
    category: "field",
    icon: "footprints",
    color: "from-blue-500 to-indigo-600",
    title: {
      ko: "첫 풋프린트 기록",
      en: "First Footprint Logged",
      ja: "ファーストフットプリント",
    },
    description: {
      ko: "전 세계 지역에 첫 풋프린트 레벨 기록",
      en: "Log your very first region footprint level",
      ja: "最初の地域レベルフットプリントを記録",
    },
    maxProgress: 1,
    calcProgress: (visits) => {
      const isUnlocked = visits.length > 0;
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: "reg_cities_10",
    category: "field",
    icon: "building-2",
    color: "from-cyan-500 to-blue-600",
    title: {
      ko: "시정촌 입문가 (10개 시정촌)",
      en: "City Explorer (10 Cities)",
      ja: "市町村ビギナー (10市町村)",
    },
    description: {
      ko: "10개 이상의 도시/시정촌 단위 풋프린트 달성",
      en: "Record footprint in 10 or more cities/municipalities",
      ja: "10以上の市町村でフットプリントを記録",
    },
    maxProgress: 10,
    calcProgress: (_, stats) => {
      const current = Math.min(10, stats.visitedCities || 0);
      return { current, percent: Math.min(100, (current / 10) * 100), isUnlocked: current >= 10 };
    },
  },
  {
    id: "reg_cities_50",
    category: "field",
    icon: "map-pin",
    color: "from-emerald-400 to-teal-600",
    title: {
      ko: "시정촌 마스터 (50개 시정촌)",
      en: "City Master (50 Cities)",
      ja: "市町村マスター (50市町村)",
    },
    description: {
      ko: "50개 이상의 다양한 지역 도시 정복",
      en: "Conquer 50 or more unique cities across regions",
      ja: "50以上の市町村フットプリントを制覇",
    },
    maxProgress: 50,
    calcProgress: (_, stats) => {
      const current = Math.min(50, stats.visitedCities || 0);
      return { current, percent: Math.min(100, (current / 50) * 100), isUnlocked: current >= 50 };
    },
  },
  {
    id: "reg_stay_5",
    category: "field",
    icon: "hotel",
    color: "from-amber-400 to-orange-500",
    title: {
      ko: "체류 & 거주 전문가",
      en: "Stay & Residence Expert",
      ja: "滞在・居住エキスパート",
    },
    description: {
      ko: "숙박(Stay) 또는 거주(Residence) 카운트 5회 이상 달성",
      en: "Log 5 or more Stay or Residence level footprints",
      ja: "宿泊(Stay)または居住(Residence)レベルを5回以上記録",
    },
    maxProgress: 5,
    calcProgress: (_, stats) => {
      const current = Math.min(5, (stats.stay || 0) + (stats.residence || 0));
      return { current, percent: Math.min(100, (current / 5) * 100), isUnlocked: current >= 5 };
    },
  },
  {
    id: "reg_score_100",
    category: "field",
    icon: "trophy",
    color: "from-purple-500 to-pink-500",
    title: {
      ko: "풋프린트 센추리 (100점)",
      en: "Footprint Century (100 Points)",
      ja: "フットプリントセンチュリー (100点)",
    },
    description: {
      ko: "누적 풋프린트 스코어 100점 이상 기록",
      en: "Reach a cumulative footprint score of 100 or higher",
      ja: "累計フットプリントスコア100点以上を達成",
    },
    maxProgress: 100,
    calcProgress: (_, __, scores) => {
      const total = Math.round(getTotalFootprintScore(scores));
      const current = Math.min(100, total);
      return { current, percent: Math.min(100, (current / 100) * 100), isUnlocked: total >= 100 };
    },
  },

  // ==================== 🗾 지역별 (Region) ====================
  {
    id: "reg_reg_tokyo_metro",
    category: "region",
    icon: "landmark",
    color: "from-blue-600 to-cyan-500",
    title: {
      ko: "도쿄 수도권 4도현",
      en: "Tokyo Metro Area 4 Prefectures",
      ja: "東京首都圏4都県",
    },
    description: {
      ko: "도쿄, 가나가와, 지바, 사이타마 4개 핵심 수도권 정복",
      en: "Record footprints in Tokyo, Kanagawa, Chiba, and Saitama",
      ja: "東京・神奈川・千葉・埼玉の4都県を足跡記録",
    },
    maxProgress: 4,
    calcProgress: (visits, _, __, allRegions) => {
      const targets = ["도쿄", "가나가와", "치바", "지바", "사이타마", "tokyo", "kanagawa", "chiba", "saitama"];
      const visitedSet = new Set(visits.map((v) => padId(v.regionId)));
      let count = 0;
      const checked = new Set<string>();
      allRegions.forEach((r) => {
        if (visitedSet.has(padId(r.id))) {
          const n = (r.nameKo + r.name).toLowerCase();
          if (n.includes("도쿄") || n.includes("tokyo")) checked.add("tokyo");
          if (n.includes("가나가와") || n.includes("kanagawa")) checked.add("kanagawa");
          if (n.includes("치바") || n.includes("지바") || n.includes("chiba")) checked.add("chiba");
          if (n.includes("사이타마") || n.includes("saitama")) checked.add("saitama");
        }
      });
      count = checked.size;
      return { current: count, percent: Math.min(100, (count / 4) * 100), isUnlocked: count === 4 };
    },
  },
  {
    id: "reg_reg_kansai_core",
    category: "region",
    icon: "castle",
    color: "from-amber-500 to-rose-600",
    title: {
      ko: "간사이 3대 도심 (오사카·교토·효고)",
      en: "Kansai Big 3 (Osaka, Kyoto, Hyogo)",
      ja: "関西3大都市 (大阪・京都・兵庫)",
    },
    description: {
      ko: "오사카, 교토, 효고 3개 핵심 지역 풋프린트 달성",
      en: "Log footprints in Osaka, Kyoto, and Hyogo",
      ja: "大阪・京都・兵庫の3大都市を足跡記録",
    },
    maxProgress: 3,
    calcProgress: (visits, _, __, allRegions) => {
      const visitedSet = new Set(visits.map((v) => padId(v.regionId)));
      const checked = new Set<string>();
      allRegions.forEach((r) => {
        if (visitedSet.has(padId(r.id))) {
          const n = (r.nameKo + r.name).toLowerCase();
          if (n.includes("오사카") || n.includes("osaka")) checked.add("osaka");
          if (n.includes("교토") || n.includes("kyoto")) checked.add("kyoto");
          if (n.includes("효고") || n.includes("hyogo")) checked.add("hyogo");
        }
      });
      const count = checked.size;
      return { current: count, percent: Math.min(100, (count / 3) * 100), isUnlocked: count === 3 };
    },
  },
  {
    id: "reg_reg_japan_half",
    category: "region",
    icon: "globe-2",
    color: "from-teal-500 to-emerald-600",
    title: {
      ko: "도도부현 과반수 정복",
      en: "Prefectures Halfway Mark",
      ja: "都道府県過半数制覇",
    },
    description: {
      ko: "일본 47개 도도부현 중 24개 이상 방문 달성",
      en: "Visit 24 or more of Japan's 47 prefectures",
      ja: "47都道府県のうち24以上を訪問",
    },
    maxProgress: 24,
    calcProgress: (_, stats) => {
      const current = Math.min(24, stats.visitedPrefectures || 0);
      return { current, percent: Math.min(100, (current / 24) * 100), isUnlocked: current >= 24 };
    },
  },

  // ==================== 📍 국지적 범위 (Local Hotspots) ====================
  {
    id: "reg_loc_tokyo23",
    category: "local",
    icon: "compass",
    color: "from-blue-500 to-indigo-500",
    title: {
      ko: "도쿄 중심가 풋프린트",
      en: "Tokyo Central Footprint",
      ja: "東京心臓部フットプリント",
    },
    description: {
      ko: "신주쿠, 시부야, 지요다 등 도쿄 핵심구 방문",
      en: "Log footprint in Tokyo's inner wards like Shinjuku or Shibuya",
      ja: "新宿・渋谷・千代田など東京主要区で記録",
    },
    maxProgress: 1,
    calcProgress: (visits, _, __, allRegions) => {
      const isUnlocked = hasVisitedRegionName(visits, allRegions, ["신주쿠", "시부야", "지요다", "shinjuku", "shibuya", "chiyoda"]);
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: "reg_loc_kyoto",
    category: "local",
    icon: "sparkles",
    color: "from-amber-400 to-orange-600",
    title: {
      ko: "천년고도 교토 발자국",
      en: "Ancient Capital Kyoto",
      ja: "古都京都の足跡",
    },
    description: {
      ko: "역사와 전통의 도시 교토시 풋프린트 기록",
      en: "Log footprint in historical Kyoto City",
      ja: "歴史の街・京都市内でフットプリントを記録",
    },
    maxProgress: 1,
    calcProgress: (visits, _, __, allRegions) => {
      const isUnlocked = hasVisitedRegionName(visits, allRegions, ["교토", "kyoto"]);
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: "reg_loc_osaka",
    category: "local",
    icon: "sun",
    color: "from-rose-500 to-red-600",
    title: {
      ko: "오사카 도심 & 베이선",
      en: "Osaka Downtown & Bay",
      ja: "大阪心斎橋・ベイエリア",
    },
    description: {
      ko: "오사카시 미나미/키타 도심 지역 풋프린트 기록",
      en: "Log footprint in central Osaka districts",
      ja: "大阪市中心部でフットプリントを記録",
    },
    maxProgress: 1,
    calcProgress: (visits, _, __, allRegions) => {
      const isUnlocked = hasVisitedRegionName(visits, allRegions, ["오사카", "osaka"]);
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
];

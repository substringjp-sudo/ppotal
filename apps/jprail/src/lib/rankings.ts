import { Trip } from '../types/trip';
import { RailData, Station } from '../types/railData';
import { JPRAIL_ACHIEVEMENTS } from './achievements';

export type RankingCriterion =
  | 'distance'
  | 'lines'
  | 'prefectures'
  | 'shinkansen'
  | 'privateRail'
  | 'trips'
  | 'achievements';

export interface UserRankEntry {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  distance: number; // KM
  linesCount: number;
  prefecturesCount: number;
  shinkansenDistance: number;
  privateRailDistance: number;
  tripsCount: number;
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
  distance: {
    key: 'distance',
    title: { ko: '총 탑승 거리', en: 'Total Distance', ja: '総乗車距離' },
    unit: { ko: 'km', en: 'km', ja: 'km' },
    icon: 'route',
    description: {
      ko: '일본 전체 철도망 누적 이동 거리',
      en: 'Total accumulated distance traveled on Japan rail lines',
      ja: '日本の全鉄道網での累計移動距離',
    },
  },
  lines: {
    key: 'lines',
    title: { ko: '완주 노선 수', en: 'Completed Lines', ja: '完乗路線数' },
    unit: { ko: '개 노선', en: ' lines', ja: '路線' },
    icon: 'alt_route',
    description: {
      ko: '최소 1구간 이상 탑승한 철도 노선 개수',
      en: 'Total number of distinct railway lines traveled',
      ja: '乗車を記録した路線数',
    },
  },
  prefectures: {
    key: 'prefectures',
    title: { ko: '도도부현 정복', en: 'Prefectures Visited', ja: '都道府県制覇' },
    unit: { ko: '개 도도부현', en: ' prefectures', ja: '都道府県' },
    icon: 'location_city',
    description: {
      ko: '철도로 지나는 일본 47개 도도부현 개수',
      en: 'Number of Japan’s 47 prefectures visited by train',
      ja: '鉄道で訪れた47都道府県の数',
    },
  },
  shinkansen: {
    key: 'shinkansen',
    title: { ko: '신칸센 누적 거리', en: 'Shinkansen Distance', ja: '新幹線乗车距離' },
    unit: { ko: 'km', en: 'km', ja: 'km' },
    icon: 'speed',
    description: {
      ko: '고속 신칸센 노선에서의 이동 거리 합계',
      en: 'Total distance logged on high-speed Shinkansen lines',
      ja: '新幹線各線での乗車距離合計',
    },
  },
  privateRail: {
    key: 'privateRail',
    title: { ko: '사철 탐방 거리', en: 'Private Rail Distance', ja: '私鉄乗車距離' },
    unit: { ko: 'km', en: 'km', ja: 'km' },
    icon: 'tram',
    description: {
      ko: 'JR을 제외한 민영 철도 노선 탑승 거리',
      en: 'Total distance logged on private (non-JR) railways',
      ja: 'JR以外の民営私鉄路線での乗車距離',
    },
  },
  trips: {
    key: 'trips',
    title: { ko: '총 여정 횟수', en: 'Total Trips Logged', ja: '総旅程記録数' },
    unit: { ko: '회', en: ' trips', ja: '回' },
    icon: 'history',
    description: {
      ko: '저장된 개별 철도 이동 여정의 총 개수',
      en: 'Number of individual trips recorded on JapanRailNote',
      ja: '記録された全旅程の数',
    },
  },
  achievements: {
    key: 'achievements',
    title: { ko: '획득 업적 수', en: 'Achievements Unlocked', ja: '獲得実績数' },
    unit: { ko: '개', en: ' badges', ja: '個' },
    icon: 'military_tech',
    description: {
      ko: '분야별·지역별·국지적 업적 달성 개수',
      en: 'Total badges earned across all achievement categories',
      ja: '全カテゴリで獲得した実績数',
    },
  },
};

// Calculate current user's full rank stats
export const computeUserRankEntry = (
  uid: string,
  displayName: string,
  email: string | undefined,
  trips: Trip[],
  railData: RailData | null,
  visitedLineLengths: Record<string, number>
): UserRankEntry => {
  let distance = 0;
  let shinkansenDistance = 0;
  let privateRailDistance = 0;
  const prefSet = new Set<number>();
  const stationSet = new Set<string>();

  trips.forEach((t) => {
    distance += t.distance || 0;
    t.path?.forEach((stId) => {
      stationSet.add(stId);
      if (railData?.stations) {
        const station = (railData.stations as Record<string, Station>)[stId];
        if (station?.prefecture_id) {
          const prefId = typeof station.prefecture_id === 'number' ? station.prefecture_id : parseInt(String(station.prefecture_id), 10);
          if (!isNaN(prefId)) prefSet.add(prefId);
        }
      }
    });

    if (railData?.sections && railData.lines) {
      t.sectionIds?.forEach((sid) => {
        const section = railData.sections.sections.find((s) => s.id === sid);
        if (section) {
          const line = railData.lines[section.line_id];
          if (line) {
            const secKm = section.length / 1000;
            if (line.name?.includes('신칸센') || line.name?.includes('Shinkansen') || line.name?.includes('新幹線')) {
              shinkansenDistance += secKm;
            }
            if (line.corp_id > 6) {
              privateRailDistance += secKm;
            }
          }
        }
      });
    }
  });

  const linesCount = Object.keys(visitedLineLengths || {}).length;

  let unlockedCount = 0;
  JPRAIL_ACHIEVEMENTS.forEach((ach) => {
    const res = ach.calcProgress(trips, railData, visitedLineLengths);
    if (res.isUnlocked) unlockedCount++;
  });

  // Calculate Level (Level 1 to Level 99)
  const scoreFactor = distance + linesCount * 20 + unlockedCount * 100;
  const level = Math.max(1, Math.min(99, Math.floor(Math.sqrt(scoreFactor / 10)) + 1));

  return {
    uid,
    displayName: displayName || email?.split('@')[0] || 'Rail Explorer',
    email,
    distance: Math.round(distance * 10) / 10,
    linesCount,
    prefecturesCount: prefSet.size,
    shinkansenDistance: Math.round(shinkansenDistance * 10) / 10,
    privateRailDistance: Math.round(privateRailDistance * 10) / 10,
    tripsCount: trips.length,
    achievementsUnlocked: unlockedCount,
    level,
    updatedAt: new Date().toISOString(),
  };
};

// Real community users fetched from Firestore
export const DEMO_COMMUNITY_USERS: UserRankEntry[] = [];

export const getCriterionValue = (user: UserRankEntry, criterion: RankingCriterion): number => {
  switch (criterion) {
    case 'distance':
      return user.distance;
    case 'lines':
      return user.linesCount;
    case 'prefectures':
      return user.prefecturesCount;
    case 'shinkansen':
      return user.shinkansenDistance;
    case 'privateRail':
      return user.privateRailDistance;
    case 'trips':
      return user.tripsCount;
    case 'achievements':
      return user.achievementsUnlocked;
    default:
      return user.distance;
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

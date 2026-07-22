import { Trip } from '../types/trip';
import { RailData, Station } from '../types/railData';

export interface Achievement {
  id: string;
  category: 'field' | 'region' | 'local';
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
    trips: Trip[],
    railData: RailData | null,
    visitedLineLengths: Record<string, number>
  ) => { current: number; percent: number; isUnlocked: boolean };
}

// Helper: check prefecture coverage from trips
const getVisitedPrefectures = (trips: Trip[], railData: RailData | null): Set<number> => {
  const prefs = new Set<number>();
  if (!railData?.stations) return prefs;
  trips.forEach((t) => {
    t.path?.forEach((stId) => {
      const station = (railData.stations as Record<string, Station>)[stId];
      if (station && station.prefecture_id) {
        const prefId = typeof station.prefecture_id === 'number' ? station.prefecture_id : parseInt(String(station.prefecture_id), 10);
        if (!isNaN(prefId)) {
          prefs.add(prefId);
        }
      }
    });
  });
  return prefs;
};

// Helper: check total distance
const getTotalDistance = (trips: Trip[]): number => {
  return trips.reduce((sum, t) => sum + (t.distance || 0), 0);
};

// Helper: check Shinkansen distance
const getShinkansenDistance = (trips: Trip[], railData: RailData | null): number => {
  if (!railData?.sections || !railData.lines) return 0;
  let dist = 0;
  trips.forEach((t) => {
    t.sectionIds?.forEach((sid) => {
      const section = railData.sections.sections.find((s) => s.id === sid);
      if (section) {
        const line = railData.lines[section.line_id];
        if (line && (line.name?.includes('신칸센') || line.name?.includes('Shinkansen') || line.name?.includes('新幹線'))) {
          dist += section.length / 1000;
        }
      }
    });
  });
  return dist;
};

// Helper: check Private rail distance (corp_id != JR companies)
const getPrivateRailDistance = (trips: Trip[], railData: RailData | null): number => {
  if (!railData?.sections || !railData.lines) return 0;
  let dist = 0;
  trips.forEach((t) => {
    t.sectionIds?.forEach((sid) => {
      const section = railData.sections.sections.find((s) => s.id === sid);
      if (section) {
        const line = railData.lines[section.line_id];
        // JR corp IDs are typically 1 to 6
        if (line && line.corp_id > 6) {
          dist += section.length / 1000;
        }
      }
    });
  });
  return dist;
};

export const JPRAIL_ACHIEVEMENTS: Achievement[] = [
  // ==================== 🌐 분야별 (Field) ====================
  {
    id: 'jrn_dist_100',
    category: 'field',
    icon: 'route',
    color: 'from-blue-500 to-indigo-600',
    title: {
      ko: '첫 주행 100km',
      en: 'First 100km Journey',
      ja: 'ファースト100km走行',
    },
    description: {
      ko: '일본 철도 누적 주행 거리 100km 달성',
      en: 'Achieve cumulative 100km rail travel in Japan',
      ja: '日本の鉄道で cumulative 100km 走行を達成',
    },
    maxProgress: 100,
    calcProgress: (trips) => {
      const current = Math.min(100, Math.round(getTotalDistance(trips)));
      return { current, percent: Math.min(100, (current / 100) * 100), isUnlocked: current >= 100 };
    },
  },
  {
    id: 'jrn_dist_1000',
    category: 'field',
    icon: 'train',
    color: 'from-cyan-500 to-blue-600',
    title: {
      ko: '천 킬로 완승가',
      en: '1,000km Rail Master',
      ja: '千キロ完乗家',
    },
    description: {
      ko: '일본 철도 누적 주행 거리 1,000km 달성',
      en: 'Achieve cumulative 1,000km rail travel in Japan',
      ja: '日本の鉄道で cumulative 1,000km 走行を達成',
    },
    maxProgress: 1000,
    calcProgress: (trips) => {
      const current = Math.min(1000, Math.round(getTotalDistance(trips)));
      return { current, percent: Math.min(100, (current / 1000) * 100), isUnlocked: current >= 1000 };
    },
  },
  {
    id: 'jrn_dist_5000',
    category: 'field',
    icon: 'workspace_premium',
    color: 'from-amber-400 to-orange-600',
    title: {
      ko: '철도 그랜드 슬램 (5,000km)',
      en: 'Rail Grand Slam (5,000km)',
      ja: 'グランドスラム（5,000km）',
    },
    description: {
      ko: '대륙을 넘나드는 누적 5,000km 철도 탐험',
      en: 'Reach an extraordinary 5,000km in cumulative rail travels',
      ja: '大原野を駆け抜ける cumulative 5,000km 鉄道探訪',
    },
    maxProgress: 5000,
    calcProgress: (trips) => {
      const current = Math.min(5000, Math.round(getTotalDistance(trips)));
      return { current, percent: Math.min(100, (current / 5000) * 100), isUnlocked: current >= 5000 };
    },
  },
  {
    id: 'jrn_shinkansen_500',
    category: 'field',
    icon: 'speed',
    color: 'from-sky-400 to-indigo-500',
    title: {
      ko: '신칸센 라이더 (500km)',
      en: 'Shinkansen Rider (500km)',
      ja: '新幹線ライダー (500km)',
    },
    description: {
      ko: '고속 신칸센 완승 거리 500km 이상 탑승',
      en: 'Travel over 500km on high-speed Shinkansen lines',
      ja: '高速新幹線で500km以上を乗車',
    },
    maxProgress: 500,
    calcProgress: (trips, railData) => {
      const current = Math.min(500, Math.round(getShinkansenDistance(trips, railData)));
      return { current, percent: Math.min(100, (current / 500) * 100), isUnlocked: current >= 500 };
    },
  },
  {
    id: 'jrn_private_300',
    category: 'field',
    icon: 'tram',
    color: 'from-emerald-400 to-teal-600',
    title: {
      ko: '로컬 사철 모험가 (300km)',
      en: 'Private Rail Adventurer',
      ja: '私鉄探訪冒険家 (300km)',
    },
    description: {
      ko: '민영 사철 노선 탑승 거리 300km 달성',
      en: 'Travel over 300km on private/non-JR railway lines',
      ja: '民営私鉄路線で300km以上の乗車を達成',
    },
    maxProgress: 300,
    calcProgress: (trips, railData) => {
      const current = Math.min(300, Math.round(getPrivateRailDistance(trips, railData)));
      return { current, percent: Math.min(100, (current / 300) * 100), isUnlocked: current >= 300 };
    },
  },
  {
    id: 'jrn_lines_10',
    category: 'field',
    icon: 'alt_route',
    color: 'from-purple-500 to-pink-500',
    title: {
      ko: '노선 콜렉터 (10개 노선)',
      en: 'Line Collector (10 Lines)',
      ja: '路線コレクター (10路線)',
    },
    description: {
      ko: '서로 다른 10개 이상의 노선 경험',
      en: 'Complete sections across 10 or more unique railway lines',
      ja: '10以上の異なる路線で乗車を記録',
    },
    maxProgress: 10,
    calcProgress: (_, __, visitedLineLengths) => {
      const current = Math.min(10, Object.keys(visitedLineLengths || {}).length);
      return { current, percent: Math.min(100, (current / 10) * 100), isUnlocked: current >= 10 };
    },
  },

  // ==================== 🗾 지역별 (Region) ====================
  {
    id: 'jrn_reg_kanto',
    category: 'region',
    icon: 'location_city',
    color: 'from-blue-600 to-violet-600',
    title: {
      ko: '간토 7도현 철도 정복',
      en: 'Kanto Rail Conqueror',
      ja: '関東7都県鉄道制覇',
    },
    description: {
      ko: '도쿄, 가나가와, 사이타마, 지바, 이바라키, 도치기, 군마 7개 지역 방문',
      en: 'Visit all 7 prefectures in Kanto area by train',
      ja: '東京・神奈川・埼玉・千葉・茨城・栃木・群馬の7都県を鉄道で訪問',
    },
    maxProgress: 7,
    calcProgress: (trips, railData) => {
      const kantoIds = [11, 12, 13, 14, 8, 9, 10]; // Saitama, Chiba, Tokyo, Kanagawa, Ibaraki, Tochigi, Gunma
      const visited = getVisitedPrefectures(trips, railData);
      const count = kantoIds.filter((id) => visited.has(id)).length;
      return { current: count, percent: Math.min(100, (count / 7) * 100), isUnlocked: count === 7 };
    },
  },
  {
    id: 'jrn_reg_kansai',
    category: 'region',
    icon: 'castle',
    color: 'from-amber-500 to-rose-600',
    title: {
      ko: '간사이 6부현 철도 마스터',
      en: 'Kansai Rail Master',
      ja: '関西6府県鉄道マスター',
    },
    description: {
      ko: '오사카, 교토, 효고, 나라, 시가, 와카야마 6개 지역 방문',
      en: 'Visit all 6 prefectures in Kansai area by train',
      ja: '大阪・京都・兵庫・奈良・滋賀・和歌山の6府県を訪問',
    },
    maxProgress: 6,
    calcProgress: (trips, railData) => {
      const kansaiIds = [25, 26, 27, 28, 29, 30]; // Shiga, Kyoto, Osaka, Hyogo, Nara, Wakayama
      const visited = getVisitedPrefectures(trips, railData);
      const count = kansaiIds.filter((id) => visited.has(id)).length;
      return { current: count, percent: Math.min(100, (count / 6) * 100), isUnlocked: count === 6 };
    },
  },
  {
    id: 'jrn_reg_hokkaido',
    category: 'region',
    icon: 'ac_unit',
    color: 'from-cyan-400 to-blue-500',
    title: {
      ko: '북해도 낭만 설원 열차',
      en: 'Hokkaido Snow Train',
      ja: '北海道雪国列車',
    },
    description: {
      ko: '홋카이도(1번 도현) 철도 탑승 및 역 경험',
      en: 'Log rail trips within Hokkaido prefecture (Prefecture #1)',
      ja: '北海道（1番）内で鉄道旅を記録',
    },
    maxProgress: 1,
    calcProgress: (trips, railData) => {
      const visited = getVisitedPrefectures(trips, railData);
      const isUnlocked = visited.has(1);
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: 'jrn_reg_kyushu',
    category: 'region',
    icon: 'volcano',
    color: 'from-red-500 to-amber-600',
    title: {
      ko: '규슈 열정 익스프레스',
      en: 'Kyushu Passion Express',
      ja: '九州情熱エクスプレス',
    },
    description: {
      ko: '규슈 지역 4개 이상 도도부현 철도 방문',
      en: 'Visit 4 or more prefectures in Kyushu by rail',
      ja: '九州地方の4県以上で鉄道訪問を達成',
    },
    maxProgress: 4,
    calcProgress: (trips, railData) => {
      const kyushuIds = [40, 41, 42, 43, 44, 45, 46]; // Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima
      const visited = getVisitedPrefectures(trips, railData);
      const count = kyushuIds.filter((id) => visited.has(id)).length;
      return { current: count, percent: Math.min(100, (count / 4) * 100), isUnlocked: count >= 4 };
    },
  },

  // ==================== 📍 국지적 범위 (Local Hotspots) ====================
  {
    id: 'jrn_loc_yamanote',
    category: 'local',
    icon: 'radio_button_checked',
    color: 'from-emerald-500 to-green-600',
    title: {
      ko: '도쿄 야마노테선 루프',
      en: 'Tokyo Yamanote Loop',
      ja: '山手線ループマスター',
    },
    description: {
      ko: '도쿄의 심장부 야마노테선 노선 구간 기록',
      en: 'Record rail trips on Tokyo’s iconic Yamanote Line',
      ja: '東京の心臓部・山手線の乗車を記録',
    },
    maxProgress: 1,
    calcProgress: (trips, railData) => {
      let isUnlocked = false;
      if (railData?.sections && railData.lines) {
        trips.forEach((t) => {
          t.sectionIds?.forEach((sid) => {
            const section = railData.sections.sections.find((s) => s.id === sid);
            if (section) {
              const line = railData.lines[section.line_id];
              if (line && (line.name?.includes('야마노테') || line.name?.includes('Yamanote') || line.name?.includes('山手'))) {
                isUnlocked = true;
              }
            }
          });
        });
      }
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: 'jrn_loc_enoden',
    category: 'local',
    icon: 'beach_access',
    color: 'from-teal-400 to-cyan-600',
    title: {
      ko: '에노덴 바다 감성선',
      en: 'Enoden Seaside Express',
      ja: '江ノ電湘南海岸線',
    },
    description: {
      ko: '가마쿠라-에노시마 해안선 에노시마 전철 탑승',
      en: 'Experience the romantic coastal Enoshima Electric Railway',
      ja: '鎌倉・江の島を走る江ノ島電鉄に乗車',
    },
    maxProgress: 1,
    calcProgress: (trips, railData) => {
      let isUnlocked = false;
      if (railData?.sections && railData.lines) {
        trips.forEach((t) => {
          t.sectionIds?.forEach((sid) => {
            const section = railData.sections.sections.find((s) => s.id === sid);
            if (section) {
              const line = railData.lines[section.line_id];
              if (line && (line.name?.includes('에노시마') || line.name?.includes('Enoshima') || line.name?.includes('江ノ島'))) {
                isUnlocked = true;
              }
            }
          });
        });
      }
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
  {
    id: 'jrn_loc_airport',
    category: 'local',
    icon: 'flight_takeoff',
    color: 'from-blue-500 to-sky-400',
    title: {
      ko: '공항 철도 특급 게이트',
      en: 'Airport Express Specialist',
      ja: '空港アクセス特急',
    },
    description: {
      ko: '나리타/하네다/간사이 공항 연결 철도 노선 탑승',
      en: 'Ride Narita Express, Haruka, or Haneda Monorail access lines',
      ja: '成田・羽田・関空アクセス路線に乗車',
    },
    maxProgress: 1,
    calcProgress: (trips, railData) => {
      let isUnlocked = false;
      if (railData?.sections && railData.lines) {
        trips.forEach((t) => {
          t.sectionIds?.forEach((sid) => {
            const section = railData.sections.sections.find((s) => s.id === sid);
            if (section) {
              const line = railData.lines[section.line_id];
              if (
                line &&
                (line.name?.includes('공항') ||
                  line.name?.includes('Airport') ||
                  line.name?.includes('空港') ||
                  line.name?.includes('모노레일') ||
                  line.name?.includes('Monorail'))
              ) {
                isUnlocked = true;
              }
            }
          });
        });
      }
      return { current: isUnlocked ? 1 : 0, percent: isUnlocked ? 100 : 0, isUnlocked };
    },
  },
];

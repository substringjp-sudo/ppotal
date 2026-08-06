/**
 * 좌표 → "내가 간 곳" 후보 랭킹.
 *
 * 대부분의 앱이 사진 좌표로 장소를 못 맞히고, 틀려도 고칠 후보조차 못 내놓는 이유는
 * 역지오코딩(= 좌표의 '주소'를 묻는 API)을 쓰기 때문이다. 그건 애초에 후보 목록을
 * 만들지 않는다. 우리는 주변 장소 검색으로 후보를 받고, 사진 클러스터에서만 얻을 수
 * 있는 신호로 다시 정렬한다:
 *
 *   · 체류 시간 — 45분 머문 곳은 편의점이 아니다
 *   · 사진 장수 — 여러 장 찍었다면 볼거리가 있던 곳
 *   · 시각 — 12시의 식당, 21시의 술집
 *   · 거리 — GPS 오차(5~50m)를 감안한 완만한 감쇠. "가장 가까운 것"은 정답이 아니다
 *
 * 이 모듈은 순수 함수다(구글 API 호출 없음). 호출부가 후보를 가져와 넘긴다.
 */

export interface PlaceCandidate {
    placeId: string;
    name: string;
    types: string[];
    distanceMeters: number;
    lat?: number;
    lng?: number;
    address?: string;
    userRatingsTotal?: number;
    rating?: number;
    /** 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY' */
    businessStatus?: string;
}

export interface CandidateContext {
    /** 사진 클러스터 체류 시간(분) */
    dwellMinutes?: number;
    /** 이 장소에서 찍은 사진 수 */
    photoCount?: number;
    /** 첫 사진 시각 HH:mm */
    timeOfDay?: string;
}

export interface ScoredCandidate extends PlaceCandidate {
    score: number;
    /** 왜 추천되는지 — 사용자가 신뢰하고 고를 수 있게 */
    reason?: string;
}

/** 좌표의 '주소'일 뿐 방문한 장소가 아닌 것들 — 후보에서 제외 */
const NON_PLACE_TYPES = new Set([
    'route', 'political', 'locality', 'sublocality', 'sublocality_level_1',
    'administrative_area_level_1', 'administrative_area_level_2', 'administrative_area_level_3',
    'country', 'postal_code', 'street_address', 'premise', 'subpremise',
    'plus_code', 'neighborhood', 'intersection', 'geocode',
]);

/** 오래 머무는 곳 */
const LONG_STAY = new Set([
    'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium', 'park',
    'tourist_attraction', 'stadium', 'movie_theater', 'spa', 'shopping_mall',
    'department_store', 'campground', 'lodging', 'restaurant', 'cafe', 'bar',
    'night_club', 'library', 'place_of_worship', 'church', 'hindu_temple',
    'mosque', 'synagogue', 'natural_feature', 'aquarium', 'bowling_alley',
]);

/** 스쳐 지나가는 곳 */
const SHORT_STOP = new Set([
    'convenience_store', 'atm', 'bank', 'bus_station', 'subway_station',
    'train_station', 'transit_station', 'light_rail_station', 'taxi_stand',
    'parking', 'gas_station', 'pharmacy', 'post_office', 'storage',
]);

/** 사진을 많이 찍게 되는 곳 */
const PHOTO_WORTHY = new Set([
    'tourist_attraction', 'park', 'museum', 'art_gallery', 'natural_feature',
    'zoo', 'aquarium', 'amusement_park', 'place_of_worship', 'church',
    'hindu_temple', 'mosque', 'stadium', 'landmark',
]);

const has = (types: string[], set: Set<string>) => types.some((t) => set.has(t));

function minutesOf(hhmm?: string): number | undefined {
    if (!hhmm) return undefined;
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return undefined;
    return Number(m[1]) * 60 + Number(m[2]);
}

/** 시각과 장소 종류가 어울리는가 (-1 ~ +1) */
function timeFit(types: string[], hhmm?: string): number {
    const t = minutesOf(hhmm);
    if (t == null) return 0;
    const lunch = t >= 11 * 60 && t <= 14 * 60 + 30;
    const dinner = t >= 17 * 60 + 30 && t <= 21 * 60 + 30;
    const morning = t >= 7 * 60 && t <= 10 * 60;
    const night = t >= 21 * 60 || t <= 2 * 60;

    if (types.includes('restaurant')) return (lunch || dinner) ? 1 : (night ? -0.3 : 0);
    if (types.includes('cafe')) return morning || (t >= 13 * 60 && t <= 18 * 60) ? 0.8 : 0;
    if (types.includes('bar') || types.includes('night_club')) return night ? 1 : (morning ? -1 : -0.2);
    if (types.includes('museum') || types.includes('art_gallery')) return (t >= 10 * 60 && t <= 17 * 60) ? 0.5 : -0.5;
    if (types.includes('lodging')) return night || morning ? 0.5 : -0.2;
    return 0;
}

/** 체류 시간과 장소 종류가 어울리는가 (-1 ~ +1) */
function dwellFit(types: string[], dwellMinutes?: number): number {
    if (dwellMinutes == null) return 0;
    const long = has(types, LONG_STAY);
    const short = has(types, SHORT_STOP);
    if (dwellMinutes >= 25) {
        if (long) return 1;
        if (short) return -1;      // 45분을 편의점에서 보내진 않는다
        return 0;
    }
    if (dwellMinutes <= 8) {
        if (short) return 0.6;
        if (long) return -0.3;
        return 0;
    }
    return long ? 0.3 : 0;
}

/**
 * 후보를 신호 기반으로 정렬한다. 점수가 낮아도 버리지 않고 돌려준다 —
 * "제안조차 없는" 상황을 만들지 않는 것이 이 함수의 목적이다.
 */
export function rankPlaceCandidates(
    candidates: PlaceCandidate[],
    ctx: CandidateContext = {},
): ScoredCandidate[] {
    const usable = candidates.filter((c) => {
        if (!c.name) return false;
        // 장소가 아닌 주소성 결과만으로 이뤄진 후보는 제외
        const meaningful = c.types.filter((t) => !NON_PLACE_TYPES.has(t) && t !== 'point_of_interest' && t !== 'establishment');
        return meaningful.length > 0 || c.types.includes('point_of_interest');
    });

    const scored = usable.map<ScoredCandidate>((c) => {
        // 거리: GPS 오차를 감안해 완만하게 (60m까지는 거의 동등하게 본다)
        const distance = Math.exp(-(c.distanceMeters / 80));
        const dwell = dwellFit(c.types, ctx.dwellMinutes);
        const time = timeFit(c.types, ctx.timeOfDay);
        const photoBonus = (ctx.photoCount ?? 0) >= 3 && has(c.types, PHOTO_WORTHY) ? 0.5 : 0;
        // 인지도는 약하게만 — 유명 랜드마크에 과하게 쏠리지 않도록
        const prominence = Math.min(Math.log10((c.userRatingsTotal ?? 0) + 1) / 4, 0.5);
        const closedPenalty = c.businessStatus && c.businessStatus !== 'OPERATIONAL' ? -1.5 : 0;

        const score =
            1.6 * distance +
            1.1 * dwell +
            0.7 * time +
            photoBonus +
            prominence +
            closedPenalty;

        return { ...c, score, reason: explain(c, ctx, { dwell, time, photoBonus }) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
}

function explain(
    c: PlaceCandidate,
    ctx: CandidateContext,
    parts: { dwell: number; time: number; photoBonus: number },
): string | undefined {
    if (parts.dwell >= 0.9 && ctx.dwellMinutes != null) {
        return `${Math.round(ctx.dwellMinutes)}분 머문 곳과 어울려요`;
    }
    if (parts.time >= 0.8 && ctx.timeOfDay) return `${ctx.timeOfDay}에 어울려요`;
    if (parts.photoBonus > 0) return '사진을 여러 장 찍은 곳';
    if (c.distanceMeters <= 25) return '바로 그 자리';
    return undefined;
}

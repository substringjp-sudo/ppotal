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
    /**
     * 구글에 이 장소로 올라와 있는 사진 수 — nearbySearch 응답의 `photos` 배열 길이.
     * 사용자가 이 여행에서 찍은 사진 수(CandidateContext.photoCount)와는 다른 값이다.
     * 이 배열엔 상한이 있어(정확한 값은 API 버전마다 다름), "많다"는 신호로만 쓴다 —
     * 정확한 임계값을 가정하지 않도록 버킷 대신 로그 스케일로 반영한다.
     */
    googlePhotoCount?: number;
}

export interface CandidateContext {
    /** 사진 클러스터 체류 시간(분) */
    dwellMinutes?: number;
    /** 이 장소에서 찍은 사진 수 */
    photoCount?: number;
    /** 첫 사진 시각 HH:mm */
    timeOfDay?: string;
    /** 방문 날짜 YYYY-MM-DD — 계획의 일정과 대조할 때 쓴다 */
    visitDate?: string;
    /**
     * 이 여행의 계획에 적혀 있던 장소들.
     * 계획대로 다녔는지와 무관하게 "후보 어휘"로서 유효하다 — 없으면 그냥 무시된다.
     */
    plannedPlaces?: PlannedPlaceHint[];
}

/** trip-priors.ts의 PlannedPlace 중 랭킹에 필요한 부분만 (순환 의존을 피하려고 여기 둔다) */
export interface PlannedPlaceHint {
    name: string;
    lat?: number;
    lng?: number;
    googlePlaceId?: string;
    date?: string;
    source?: 'itinerary' | 'bucketlist';
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

/** 이름 비교용 정규화 — 공백·괄호·표기 흔들림을 흡수한다 */
function normalizeName(s: string): string {
    return s.toLowerCase().replace(/[\s\-_()[\]{}·・,.'"]/g, '');
}

function namesMatch(a: string, b: string): boolean {
    const x = normalizeName(a);
    const y = normalizeName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    // 한쪽이 다른 쪽을 포함하면 같은 곳으로 본다 ("긴카쿠지" ⊂ "긴카쿠지 은각사")
    const [short, long] = x.length <= y.length ? [x, y] : [y, x];
    return short.length >= 2 && long.includes(short);
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371000;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const la1 = aLat * Math.PI / 180;
    const la2 = bLat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 계획에 적혀 있던 장소와 얼마나 맞아떨어지는가 (0 ~ 1).
 *
 * 계획은 사용자가 직접 이름을 적어둔 것이라 후보 이름과 맞으면 거의 확실한 정답이다.
 * 다만 계획대로 안 다녔을 수 있으므로 강하게 밀되 절대적으로 만들지는 않는다.
 * 계획이 없거나 좌표·이름이 비어 있으면 0이 나와 기존 동작 그대로다.
 */
function plannedFit(c: PlaceCandidate, ctx: CandidateContext): { score: number; matched?: PlannedPlaceHint } {
    const planned = ctx.plannedPlaces;
    if (!planned?.length) return { score: 0 };

    let best = 0;
    let bestHit: PlannedPlaceHint | undefined;

    for (const p of planned) {
        let s = 0;

        if (p.googlePlaceId && c.placeId && p.googlePlaceId === c.placeId) {
            s = 1;                                    // 같은 장소 ID — 의심의 여지가 없다
        } else if (namesMatch(p.name, c.name)) {
            // 이름이 같으면 강하지만, 좌표가 있는데 멀면 동명이인일 수 있다
            const far = (p.lat != null && p.lng != null && c.lat != null && c.lng != null)
                && metersBetween(p.lat, p.lng, c.lat, c.lng) > 400;
            s = far ? 0.35 : 0.9;
        } else if (p.lat != null && p.lng != null && c.lat != null && c.lng != null) {
            // 이름은 달라도 계획한 좌표 바로 위라면 그 계획의 실체일 가능성이 있다
            const d = metersBetween(p.lat, p.lng, c.lat, c.lng);
            if (d <= 60) s = 0.5;
            else if (d <= 150) s = 0.25;
        }

        if (s === 0) continue;

        // 일정(날짜 있음)이 버킷리스트보다 강하고, 날짜까지 맞으면 더 강하다
        if (p.source === 'bucketlist') s *= 0.7;
        if (p.date && ctx.visitDate) s *= p.date === ctx.visitDate ? 1 : 0.5;

        if (s > best) { best = s; bestHit = p; }
    }

    return { score: best, matched: bestHit };
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
        // 평점 수(상한 없음)가 주력 신호고, 구글 사진 수는 상한이 있어 보조 신호로만 약하게.
        // "0장" vs "몇 장이라도 있음"을 가르는 게 핵심이라, 로그 스케일이 절대 임계값 추측보다 안전하다.
        const communityPhotos = Math.min(Math.log10((c.googlePhotoCount ?? 0) + 1) / 3, 0.3);
        const closedPenalty = c.businessStatus && c.businessStatus !== 'OPERATIONAL' ? -1.5 : 0;
        const planned = plannedFit(c, ctx);

        const score =
            1.6 * distance +
            1.1 * dwell +
            0.7 * time +
            1.4 * planned.score +
            photoBonus +
            prominence +
            communityPhotos +
            closedPenalty;

        return { ...c, score, reason: explain(c, ctx, { dwell, time, photoBonus, planned, communityPhotos }) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
}

function explain(
    c: PlaceCandidate,
    ctx: CandidateContext,
    parts: {
        dwell: number; time: number; photoBonus: number;
        planned: { score: number; matched?: PlannedPlaceHint };
        communityPhotos: number;
    },
): string | undefined {
    // 계획과 맞은 건 가장 설득력 있는 이유라 맨 앞에 둔다
    if (parts.planned.score >= 0.6) {
        return parts.planned.matched?.source === 'bucketlist'
            ? '가고 싶다고 저장한 곳'
            : '계획에 있던 곳';
    }
    if (parts.dwell >= 0.9 && ctx.dwellMinutes != null) {
        return `${Math.round(ctx.dwellMinutes)}분 머문 곳과 어울려요`;
    }
    if (parts.time >= 0.8 && ctx.timeOfDay) return `${ctx.timeOfDay}에 어울려요`;
    if (parts.photoBonus > 0) return '사진을 여러 장 찍은 곳';
    if ((c.userRatingsTotal ?? 0) >= 100) return '많은 사람이 다녀간 곳';
    if (parts.communityPhotos >= 0.2) return '구글에 사진이 많이 올라온 곳';
    if (c.distanceMeters <= 25) return '바로 그 자리';
    return undefined;
}

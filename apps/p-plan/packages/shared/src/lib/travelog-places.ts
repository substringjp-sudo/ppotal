/**
 * 장소 중심 뷰 파생 유틸 (Place-centric derivation).
 *
 * 에디터가 이미 만들어 두는 타임라인(TravelogDailyPlan[] · 사진 클러스터 → 역지오코딩으로
 * 생성됨)에서 장소 목록(TravelogPlace[])을 뽑아낸다. 같은 장소에서 생긴 여러 이벤트는
 * 하나의 장소로 묶고, 사용자가 그 장소에 대해 직접 남긴 소감·평점·분류는 보존한다.
 *
 * 순수 함수(파이어베이스/브라우저 의존 없음)라 단독으로 테스트 가능하다.
 */
import type {
    Travelog,
    TravelogDailyPlan,
    TravelogEvent,
    TravelogPlace,
} from '../types/record';

/** 분류(카테고리) 칩 색 팔레트 */
export const CATEGORY_COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

/** 분류 이름을 팔레트 색으로 결정적으로 매핑한다 */
export function colorForCategory(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

/** 장소들에서 사용된 분류(카테고리)를 등장 순서대로 중복 없이 모은다 */
export function collectCategories(places: TravelogPlace[]): string[] {
    const seen: string[] = [];
    for (const p of places) {
        const c = p.category?.trim();
        if (c && !seen.includes(c)) seen.push(c);
    }
    return seen;
}

/**
 * 장소 식별 키 목록(우선순위 순): [구글 PlaceID, 좌표(≈11m), 이름].
 * 정체성 우선순위 보강 — 같은 장소가 이름으로 태깅된 뒤 나중에 googlePlaceId가 붙어도
 * 여러 키로 교차 조회해 사용자가 남긴 소감/분류를 잃지 않는다.
 */
function keysFor(googlePlaceId?: string, lat?: number, lng?: number, name?: string): string[] {
    const keys: string[] = [];
    if (googlePlaceId) keys.push(`g:${googlePlaceId}`);
    if (typeof lat === 'number' && typeof lng === 'number') keys.push(`c:${lat.toFixed(4)},${lng.toFixed(4)}`);
    const n = (name || '').trim().toLowerCase();
    if (n) keys.push(`n:${n}`);
    return keys;
}

function eventKeys(e: TravelogEvent): string[] {
    const loc = e.location;
    return keysFor(loc?.googlePlaceId, loc?.lat, loc?.lng, loc?.name);
}
function placeKeys(p: TravelogPlace): string[] {
    return keysFor(p.googlePlaceId, p.location?.lat, p.location?.lng, p.name);
}

/**
 * 장소 동일성 판별 키(대표 하나).
 * 1) 구글 Place ID가 있으면 그것으로, 2) 좌표가 있으면 소수 4자리(≈11m)로 반올림해서,
 * 3) 둘 다 없으면 이름(정규화)으로 묶는다.
 */
export function placeKeyForEvent(e: TravelogEvent): string | null {
    const loc = e.location;
    if (loc?.googlePlaceId) return `g:${loc.googlePlaceId}`;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return `c:${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    }
    const name = (loc?.name || '').trim().toLowerCase();
    if (name) return `n:${name}`;
    return null;
}

function stablePlaceId(key: string): string {
    // 키를 결정적(deterministic) id로. 재파생 시에도 같은 장소는 같은 id를 유지한다.
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return `place_${(hash >>> 0).toString(36)}`;
}

interface DeriveOptions {
    /** 이미 존재하는 장소들(사용자가 손으로 쓴 소감·분류 등을 보존하기 위해 병합) */
    existing?: TravelogPlace[];
}

/**
 * 타임라인에서 장소 배열을 파생한다.
 * - 같은 place 키의 이벤트/사진/평점을 하나의 장소로 합친다.
 * - existing에 사용자가 작성한 소감(impression)·분류(category/collectionIds)·평점 override가
 *   있으면 그대로 유지한다(파생이 사용자 글을 덮어쓰지 않는다).
 */
export function derivePlacesFromTimeline(
    timeline: TravelogDailyPlan[] | undefined,
    opts: DeriveOptions = {},
): TravelogPlace[] {
    // 기존 장소를 모든 키(g/c/n)로 색인 → 정체성이 바뀌어도 교차 조회로 찾는다
    const existingByKey = new Map<string, TravelogPlace>();
    (opts.existing || []).forEach((p) => {
        placeKeys(p).forEach((k) => { if (!existingByKey.has(k)) existingByKey.set(k, p); });
    });

    const ordered: TravelogPlace[] = [];       // 등장 순서 보존(장소당 1회)
    const byKey = new Map<string, TravelogPlace>();

    const findExisting = (keys: string[]): TravelogPlace | undefined => {
        for (const k of keys) { const p = existingByKey.get(k); if (p) return p; }
        return undefined;
    };
    const findGroup = (keys: string[]): TravelogPlace | undefined => {
        for (const k of keys) { const p = byKey.get(k); if (p) return p; }
        return undefined;
    };

    const consider = (e: TravelogEvent, day?: number, date?: string) => {
        const keys = eventKeys(e);
        if (keys.length === 0) return;

        let place = findGroup(keys);
        if (!place) {
            const prior = findExisting(keys);
            place = {
                id: prior?.id || stablePlaceId(keys[0]),
                name: prior?.name || e.location?.name || e.title || '이름 없는 장소',
                googlePlaceId: prior?.googlePlaceId || e.location?.googlePlaceId,
                location: prior?.location || e.location,
                visitDate: prior?.visitDate || e.date || date,
                day: prior?.day ?? day,
                // 사용자 작성 필드는 무조건 보존
                impression: prior?.impression,
                impressionJson: prior?.impressionJson,
                rating: prior?.rating,
                emotion: prior?.emotion,
                category: prior?.category,
                order: prior?.order,
                photoUrls: [],
                linkedEventIds: [],
            };
            ordered.push(place);
        }
        // 이 이벤트의 모든 키를 이 장소에 등록(이후 다른 키의 이벤트도 합쳐지도록)
        keys.forEach((k) => { if (!byKey.has(k)) byKey.set(k, place!); });
        // 정체성 업그레이드: 좌표만 있던 장소에 나중에 googlePlaceId가 붙으면 채운다
        if (!place.googlePlaceId && e.location?.googlePlaceId) place.googlePlaceId = e.location.googlePlaceId;
        if (!place.location && e.location) place.location = e.location;

        // 사진 누적(중복 제거)
        if (e.imageUrls?.length) {
            const set = new Set(place.photoUrls || []);
            e.imageUrls.forEach((u) => set.add(u));
            place.photoUrls = Array.from(set);
        }
        // 이벤트 연결
        if (e.id) place.linkedEventIds = [...(place.linkedEventIds || []), e.id];

        // 사용자가 손대지 않은 필드만 이벤트에서 채운다
        const prior = findExisting(keys);
        if (prior?.rating == null && place.rating == null && typeof e.details?.rating === 'number') {
            place.rating = e.details.rating;
        }
        if (prior?.emotion == null && place.emotion == null && e.emotion) {
            place.emotion = e.emotion;
        }
        // impression이 비어 있으면 이벤트 메모를 힌트로 이어붙인다(사용자 글 없음일 때만)
        if (prior?.impression == null && e.memo) {
            place.impression = place.impression ? `${place.impression}\n${e.memo}` : e.memo;
        }

        // 하위 이벤트도 같은 규칙으로 반영
        e.subEvents?.forEach((se) => consider(se, day, date));
    };

    (timeline || []).forEach((d) => d.events?.forEach((e) => consider(e, d.day, d.date)));

    // order 필드가 명시된 건 그 순서, 아니면 타임라인 등장 순서
    const places = ordered.map((p, i) => ({ ...p, order: p.order ?? i }));
    places.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return places;
}

/**
 * 여행기에 장소 레이어를 동기화한다(파생 + 기존 사용자 작성분 병합).
 * 에디터 저장 시점이나 뷰어 진입 시 호출해 travelog.places를 최신화한다.
 */
export function syncTravelogPlaces(travelog: Travelog): TravelogPlace[] {
    const existing = travelog.places || [];
    const derived = derivePlacesFromTimeline(travelog.timeline, { existing });

    // 타임라인이 없는 여행기(카드 스트림 에디터로 직접 쓴 글)는 places가 곧 원천이다.
    if (derived.length === 0) {
        return [...existing].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (existing.length === 0) return derived;

    // 혼합(가져오기 + 직접 추가): 파생분에 반영되지 않은 장소만 이어붙인다.
    const seen = new Set<string>();
    derived.forEach((p) => placeKeys(p).forEach((k) => seen.add(k)));
    const extra = existing.filter((p) => !placeKeys(p).some((k) => seen.has(k)));
    if (extra.length === 0) return derived;

    return [...derived, ...extra].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 저장할 만한 최소 내용이 있는지 판별한다 (빈 여행기 방지).
 * 제목이 있고, 본문(타임라인 이벤트·섹션 내용·개요·장소 소감/사진) 중 하나라도 있어야 한다.
 */
export function hasMinimumContent(
    t: Pick<Travelog, 'title' | 'summary' | 'timeline' | 'sections' | 'places' | 'notes'>,
): boolean {
    if (!t.title || !t.title.trim()) return false;
    const hasTimeline = (t.timeline || []).some((d) => (d.events || []).length > 0);
    const hasSection = (t.sections || []).some((s) => (s.content && s.content.trim()) || (s.imageUrls && s.imageUrls.length > 0));
    const hasSummary = !!(t.summary && t.summary.trim());
    const hasPlace = (t.places || []).some((p) => (p.impression && p.impression.trim()) || (p.photoUrls && p.photoUrls.length > 0));
    const hasNote = (t.notes || []).some((n) => n.text && n.text.trim());
    return hasTimeline || hasSection || hasSummary || hasPlace || hasNote;
}

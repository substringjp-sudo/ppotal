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

/**
 * 장소 동일성 판별 키.
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

function placeKeyForPlace(p: TravelogPlace): string | null {
    if (p.googlePlaceId) return `g:${p.googlePlaceId}`;
    const loc = p.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return `c:${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    }
    const name = (p.name || '').trim().toLowerCase();
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
    const existingByKey = new Map<string, TravelogPlace>();
    (opts.existing || []).forEach((p) => {
        const k = placeKeyForPlace(p);
        if (k) existingByKey.set(k, p);
    });

    const order: string[] = [];
    const byKey = new Map<string, TravelogPlace>();

    const consider = (e: TravelogEvent, day?: number, date?: string) => {
        const key = placeKeyForEvent(e);
        if (!key) return;

        let place = byKey.get(key);
        if (!place) {
            const prior = existingByKey.get(key);
            place = {
                id: prior?.id || stablePlaceId(key),
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
                collectionIds: prior?.collectionIds,
                order: prior?.order,
                photoUrls: [],
                linkedEventIds: [],
            };
            byKey.set(key, place);
            order.push(key);
        }

        // 사진 누적(중복 제거)
        if (e.imageUrls?.length) {
            const set = new Set(place.photoUrls || []);
            e.imageUrls.forEach((u) => set.add(u));
            place.photoUrls = Array.from(set);
        }
        // 이벤트 연결
        if (e.id) place.linkedEventIds = [...(place.linkedEventIds || []), e.id];

        // 사용자가 손대지 않은 필드만 이벤트에서 채운다
        const prior = existingByKey.get(key);
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
    const places = order.map((k, i) => {
        const p = byKey.get(k)!;
        return { ...p, order: p.order ?? i };
    });
    places.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return places;
}

/**
 * 여행기에 장소 레이어를 동기화한다(파생 + 기존 사용자 작성분 병합).
 * 에디터 저장 시점이나 뷰어 진입 시 호출해 travelog.places를 최신화한다.
 */
export function syncTravelogPlaces(travelog: Travelog): TravelogPlace[] {
    return derivePlacesFromTimeline(travelog.timeline, { existing: travelog.places });
}

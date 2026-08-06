'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, type PlaceCandidate } from '@pplaner/shared';

/**
 * 좌표 주변 장소 후보 가져오기 (+ 공용 캐시).
 *
 * 역지오코딩이 아니라 '주변 장소 검색'을 쓴다 — 후보 목록이 처음부터 존재해야
 * 틀렸을 때 한 번 눌러 고칠 수 있다.
 *
 * 비용 방어: Places 주변 검색은 요청당 과금이라 클러스터마다 부르면 여행기 하나에
 * 수십 번이 된다. 그래서
 *   1) 좌표를 약 50m 격자로 반올림한 키로 Firestore에 공용 캐시하고,
 *   2) 사용자가 이름을 고치려 할 때만(레이지) 호출한다.
 * 인기 있는 장소일수록 캐시 적중률이 올라가 시간이 갈수록 비용이 준다.
 */

const CACHE_COLLECTION = 'placeCandidateCache';
const CACHE_TTL_DAYS = 120;

/** 약 50m 격자 — 같은 자리에서 찍은 사진들이 같은 키를 갖게 한다 */
function cacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

async function readCache(key: string): Promise<PlaceCandidate[] | null> {
    try {
        const snap = await getDoc(doc(db, CACHE_COLLECTION, key));
        if (!snap.exists()) return null;
        const data = snap.data() as { candidates: PlaceCandidate[]; cachedAt: string };
        const ageDays = (Date.now() - Date.parse(data.cachedAt)) / 86_400_000;
        if (isNaN(ageDays) || ageDays > CACHE_TTL_DAYS) return null;
        return data.candidates || null;
    } catch {
        return null;
    }
}

async function writeCache(key: string, candidates: PlaceCandidate[]): Promise<void> {
    try {
        await setDoc(doc(db, CACHE_COLLECTION, key), {
            candidates, cachedAt: new Date().toISOString(),
        });
    } catch { /* 캐시는 실패해도 기능에 영향 없음 */ }
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180;
    const la2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/** 구글 주변 검색 (places 라이브러리 필요). 실패하면 빈 배열. */
function searchNearby(lat: number, lng: number, radius: number): Promise<PlaceCandidate[]> {
    return new Promise((resolve) => {
        const g = (typeof window !== 'undefined') ? (window as any).google : undefined;
        if (!g?.maps?.places?.PlacesService) { resolve([]); return; }
        try {
            const container = document.createElement('div');
            const service = new g.maps.places.PlacesService(container);
            service.nearbySearch(
                { location: { lat, lng }, radius },
                (results: any[], status: string) => {
                    if (status !== g.maps.places.PlacesServiceStatus.OK || !results) { resolve([]); return; }
                    resolve(results.slice(0, 20).map((r) => {
                        const pLat = r.geometry?.location?.lat?.();
                        const pLng = r.geometry?.location?.lng?.();
                        return {
                            placeId: r.place_id,
                            name: r.name,
                            types: r.types || [],
                            lat: pLat,
                            lng: pLng,
                            address: r.vicinity,
                            userRatingsTotal: r.user_ratings_total,
                            rating: r.rating,
                            businessStatus: r.business_status,
                            distanceMeters: (pLat != null && pLng != null)
                                ? Math.round(distanceMeters({ lat, lng }, { lat: pLat, lng: pLng }))
                                : radius,
                        } as PlaceCandidate;
                    }));
                },
            );
        } catch {
            resolve([]);
        }
    });
}

/**
 * 좌표 주변 후보를 돌려준다. 캐시 우선, 없으면 구글 호출 후 캐시에 적재.
 * 랭킹은 호출부에서 rankPlaceCandidates(candidates, context)로 수행한다.
 */
export async function getNearbyCandidates(
    lat: number, lng: number, radius = 120,
): Promise<PlaceCandidate[]> {
    const key = cacheKey(lat, lng);
    const cached = await readCache(key);
    if (cached) return cached;

    const fresh = await searchNearby(lat, lng, radius);
    if (fresh.length > 0) void writeCache(key, fresh);
    return fresh;
}

/**
 * 사용자가 고른 장소를 캐시 맨 앞으로 올린다 — 다음 사람은 같은 좌표에서
 * 이 정답을 공짜로 먼저 보게 된다. (사용자의 정정이 곧 데이터 자산)
 */
export async function promoteChosenCandidate(
    lat: number, lng: number, chosen: PlaceCandidate,
): Promise<void> {
    const key = cacheKey(lat, lng);
    const cached = (await readCache(key)) || [];
    const rest = cached.filter((c) => c.placeId !== chosen.placeId);
    void writeCache(key, [chosen, ...rest].slice(0, 20));
}

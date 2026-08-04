/**
 * 스팟 소셜 액션 — 북마크("가고 싶은 지도")와 좋아요(크로스세션) 저장.
 *
 * 모두 사용자 소유 문서로 저장한다(본인만 읽기/쓰기) — 남의 여행기 카운터를 직접
 * 건드리지 않아 규칙이 단순하고 안전하다. 여행기의 집계 saveCount/likeCount는 이후
 * Cloud Function 트리거로 유지한다(랭킹/크리에이터 보상용). 상태 자체는 여기서 완결.
 */
import {
    collection, doc, setDoc, deleteDoc, getDocs, query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { FeedSpot } from './spot-feed';

const SAVED = 'savedSpots';
const LIKES = 'spotLikes';

/** FeedSpot.key 와 동일한 형식의 스팟 키 */
export const spotKeyOf = (travelogId: string, placeId: string) => `${travelogId}::${placeId}`;
const docIdOf = (uid: string, travelogId: string, placeId: string) => `${uid}__${travelogId}__${placeId}`;

export interface SavedSpot {
    id: string;
    userId: string;
    spotKey: string;
    travelogId: string;
    placeId: string;
    name: string;
    coverUrl?: string;
    region?: string;
    lat?: number;
    lng?: number;
    category?: string;
    theme?: string;
    authorName?: string;
    savedAt: string;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
    const out: any = {};
    for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
}

/** 스팟을 "가고 싶은 지도"에 저장 (스냅샷 비정규화 — 보드가 재조회 없이 렌더) */
export async function saveSpot(uid: string, feed: FeedSpot): Promise<void> {
    const id = docIdOf(uid, feed.travelogId, feed.spot.id);
    const rec: SavedSpot = cleanUndefined({
        id,
        userId: uid,
        spotKey: spotKeyOf(feed.travelogId, feed.spot.id),
        travelogId: feed.travelogId,
        placeId: feed.spot.id,
        name: feed.spot.name,
        coverUrl: feed.coverUrl,
        region: feed.region,
        lat: feed.spot.location?.lat,
        lng: feed.spot.location?.lng,
        category: feed.spot.category,
        theme: feed.theme,
        authorName: feed.authorName,
        savedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, SAVED, id), rec, { merge: true });
}

export async function unsaveSpot(uid: string, travelogId: string, placeId: string): Promise<void> {
    await deleteDoc(doc(db, SAVED, docIdOf(uid, travelogId, placeId)));
}

/** 내 "가고 싶은 지도" 전체 (최신 저장 순) */
export async function getSavedSpots(uid: string): Promise<SavedSpot[]> {
    try {
        const q = query(collection(db, SAVED), where('userId', '==', uid), orderBy('savedAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as SavedSpot);
    } catch (e) {
        console.error('[SpotSocial] getSavedSpots failed:', e);
        return [];
    }
}

/** 피드에서 저장 여부 표시용 — 저장된 스팟 키 집합 */
export async function getSavedSpotKeys(uid: string): Promise<Set<string>> {
    const list = await getSavedSpots(uid);
    return new Set(list.map((s) => s.spotKey));
}

// ── 좋아요 (크로스세션 상태 · 휘발적 추천 신호) ──────────────────

export async function likeSpot(uid: string, travelogId: string, placeId: string): Promise<void> {
    const id = docIdOf(uid, travelogId, placeId);
    await setDoc(doc(db, LIKES, id), {
        id, userId: uid, spotKey: spotKeyOf(travelogId, placeId), travelogId, placeId,
        likedAt: new Date().toISOString(),
    }, { merge: true });
}

export async function unlikeSpot(uid: string, travelogId: string, placeId: string): Promise<void> {
    await deleteDoc(doc(db, LIKES, docIdOf(uid, travelogId, placeId)));
}

export async function getLikedSpotKeys(uid: string): Promise<Set<string>> {
    try {
        const q = query(collection(db, LIKES), where('userId', '==', uid));
        const snap = await getDocs(q);
        return new Set(snap.docs.map((d) => (d.data() as any).spotKey as string));
    } catch (e) {
        console.error('[SpotSocial] getLikedSpotKeys failed:', e);
        return new Set();
    }
}

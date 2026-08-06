import {
    collection, doc, getDocs, query, where, orderBy, writeBatch, setDoc, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { removeUndefined } from './utils';
import { generateId } from '../types/common';
import type { FootprintPoint, FootprintActivity } from '../types/record';

const POINTS_COLLECTION = 'footprintPoints';
const ACTIVITIES_COLLECTION = 'footprintActivities';

/**
 * 발자취(FootprintPoint/FootprintActivity) 서비스.
 * 항상 owner-only — 여행기(Travelog)로 발췌해 옮기기 전까지는 공개되지 않는다.
 */

// ─── FootprintPoint ────────────────────────────────────────────

export async function saveFootprintPoints(points: Omit<FootprintPoint, 'id' | 'createdAt'>[]): Promise<FootprintPoint[]> {
    if (points.length === 0) return [];
    const uid = auth.currentUser?.uid;
    if (!uid || points.some((p) => p.userId !== uid)) {
        throw new Error('Authentication mismatch for footprint points');
    }
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const saved: FootprintPoint[] = [];
    points.forEach((p) => {
        const id = `fp_${generateId()}`;
        const record: FootprintPoint = { ...p, id, createdAt: now };
        batch.set(doc(db, POINTS_COLLECTION, id), removeUndefined(record));
        saved.push(record);
    });
    await batch.commit();
    return saved;
}

export async function getFootprintPoints(userId: string): Promise<FootprintPoint[]> {
    try {
        const q = query(
            collection(db, POINTS_COLLECTION),
            where('userId', '==', userId),
            orderBy('timestamp', 'asc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as FootprintPoint);
    } catch (error) {
        console.error('[FootprintService] Error getting footprint points:', error);
        return [];
    }
}

// ─── FootprintActivity ─────────────────────────────────────────

export async function saveFootprintActivities(
    activities: Omit<FootprintActivity, 'id' | 'createdAt' | 'updatedAt'>[],
): Promise<FootprintActivity[]> {
    if (activities.length === 0) return [];
    const uid = auth.currentUser?.uid;
    if (!uid || activities.some((a) => a.userId !== uid)) {
        throw new Error('Authentication mismatch for footprint activities');
    }
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const saved: FootprintActivity[] = [];
    activities.forEach((a) => {
        const id = `fa_${generateId()}`;
        const record: FootprintActivity = { ...a, id, createdAt: now, updatedAt: now };
        batch.set(doc(db, ACTIVITIES_COLLECTION, id), removeUndefined(record));
        saved.push(record);
    });
    await batch.commit();
    return saved;
}

export async function updateFootprintActivity(activity: FootprintActivity): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== activity.userId) {
        throw new Error('Authentication mismatch for footprint activity');
    }
    const ref = doc(db, ACTIVITIES_COLLECTION, activity.id);
    await setDoc(ref, removeUndefined({ ...activity, updatedAt: new Date().toISOString() }), { merge: true });
}

export async function deleteFootprintActivity(activityId: string, userId: string): Promise<void> {
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
        throw new Error('Authentication mismatch for footprint activity deletion');
    }
    await deleteDoc(doc(db, ACTIVITIES_COLLECTION, activityId));
}

export async function getFootprintActivities(userId: string): Promise<FootprintActivity[]> {
    try {
        const q = query(
            collection(db, ACTIVITIES_COLLECTION),
            where('userId', '==', userId),
            orderBy('startAt', 'asc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as FootprintActivity);
    } catch (error) {
        console.error('[FootprintService] Error getting footprint activities:', error);
        return [];
    }
}

export function subscribeToFootprintActivities(
    userId: string,
    onUpdate: (activities: FootprintActivity[]) => void,
) {
    const q = query(
        collection(db, ACTIVITIES_COLLECTION),
        where('userId', '==', userId),
        orderBy('startAt', 'asc'),
    );
    return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map((d) => d.data() as FootprintActivity));
    }, (error) => {
        console.error('[FootprintService] Error subscribing to footprint activities:', error);
    });
}

/** 여러 활동을 하나로 합친다 — 타임라인에서 드래그로 이어붙일 때. */
export async function mergeFootprintActivities(activities: FootprintActivity[]): Promise<FootprintActivity> {
    if (activities.length < 2) throw new Error('Need at least 2 activities to merge');
    const sorted = [...activities].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const uid = auth.currentUser?.uid;
    if (!uid || sorted.some((a) => a.userId !== uid)) {
        throw new Error('Authentication mismatch for footprint activity merge');
    }
    const first = sorted[0];
    const merged: FootprintActivity = {
        ...first,
        endAt: sorted[sorted.length - 1].endAt,
        places: sorted.flatMap((a) => a.places),
        path: sorted.some((a) => a.path) ? sorted.flatMap((a) => a.path || []) : undefined,
        photoUrls: sorted.flatMap((a) => a.photoUrls || []),
        travelogIds: Array.from(new Set(sorted.flatMap((a) => a.travelogIds || []))),
        updatedAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, ACTIVITIES_COLLECTION, first.id), removeUndefined(merged));
    sorted.slice(1).forEach((a) => batch.delete(doc(db, ACTIVITIES_COLLECTION, a.id)));
    await batch.commit();
    return merged;
}

/** 활동 하나를 특정 시각 기준으로 둘로 나눈다. */
export async function splitFootprintActivity(activity: FootprintActivity, atTime: string): Promise<[FootprintActivity, FootprintActivity]> {
    if (!auth.currentUser || auth.currentUser.uid !== activity.userId) {
        throw new Error('Authentication mismatch for footprint activity split');
    }
    const cut = new Date(atTime).getTime();
    const before = { ...activity, places: activity.places.filter((p) => new Date(p.arrivedAt || activity.startAt).getTime() < cut) };
    const after = { ...activity, places: activity.places.filter((p) => new Date(p.arrivedAt || activity.startAt).getTime() >= cut) };

    const firstHalf: FootprintActivity = {
        ...before,
        endAt: atTime,
        updatedAt: new Date().toISOString(),
    };
    const secondHalf: FootprintActivity = {
        ...after,
        id: `fa_${generateId()}`,
        startAt: atTime,
        order: activity.order + 0.5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, ACTIVITIES_COLLECTION, firstHalf.id), removeUndefined(firstHalf));
    batch.set(doc(db, ACTIVITIES_COLLECTION, secondHalf.id), removeUndefined(secondHalf));
    await batch.commit();
    return [firstHalf, secondHalf];
}

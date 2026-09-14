import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { RegionVisit, VisitCategory } from "@regionevel/types";
import type { VisitDataStore } from "./types";
import { getFirestoreDb } from "./firebase-app";

function docToVisit(data: Record<string, unknown>): RegionVisit {
  const visit: RegionVisit = {
    regionId: data.regionId as string,
    category: data.category as VisitCategory,
    count: data.count as number,
  };
  if (data.notes) visit.notes = data.notes as string;
  if (Array.isArray(data.dates)) {
    visit.dates = data.dates as string[];
  }
  // Convert Firestore Timestamp → ms for cross-device conflict resolution.
  if (data.updatedAt instanceof Timestamp) {
    visit.updatedAt = data.updatedAt.toMillis();
  }
  return visit;
}

export function createFirestoreVisitStore(uid: string): VisitDataStore {
  const db = getFirestoreDb();
  const visitsRef = () => collection(db, "users", uid, "visits");
  const bundleDocRef = () => doc(db, "users", uid, "meta", "visits_bundle");

  return {
    async getVisits() {
      // 1. Fast path: load from aggregated snapshot bundle (1 single read instead of thousands)
      try {
        const bundleSnap = await getDoc(bundleDocRef());
        if (bundleSnap.exists()) {
          const data = bundleSnap.data();
          if (Array.isArray(data?.visits)) {
            return data.visits.map((raw: any) => ({
              regionId: String(raw.regionId),
              category: raw.category as VisitCategory,
              count: Number(raw.count),
              ...(raw.notes ? { notes: String(raw.notes) } : {}),
              ...(Array.isArray(raw.dates) ? { dates: raw.dates as string[] } : {}),
              ...(raw.updatedAt ? { updatedAt: Number(raw.updatedAt) } : {}),
            }));
          }
        }
      } catch (err) {
        console.warn("[firestore-visits] Fast bundle read failed, falling back to collection:", err);
      }

      // 2. Slow fallback: read individual documents from collection
      const snap = await getDocs(visitsRef());
      const visits = snap.docs.map((d) => docToVisit(d.data() as Record<string, unknown>));

      // 3. Auto-seed bundle for subsequent instant loads if visits exist
      if (visits.length > 0) {
        setDoc(bundleDocRef(), {
          visits: visits.map((v) => ({
            regionId: v.regionId,
            category: v.category,
            count: v.count,
            ...(v.notes ? { notes: v.notes } : {}),
            ...(v.dates && v.dates.length > 0 ? { dates: v.dates } : {}),
            ...(v.updatedAt ? { updatedAt: v.updatedAt } : {}),
          })),
          count: visits.length,
          updatedAt: serverTimestamp(),
        }).catch((e) => console.warn("[firestore-visits] Auto-bundle seed failed:", e));
      }

      return visits;
    },

    async upsertVisit(regionId, category, count, notes) {
      const id = `${regionId}__${category}`;
      await setDoc(doc(db, "users", uid, "visits", id), {
        regionId,
        category,
        count,
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: serverTimestamp(),
      });
    },

    async removeVisit(regionId, category) {
      const id = `${regionId}__${category}`;
      await deleteDoc(doc(db, "users", uid, "visits", id));
    },

    async saveVisitsBundle(visits: RegionVisit[]) {
      try {
        await setDoc(bundleDocRef(), {
          visits: visits.map((v) => ({
            regionId: v.regionId,
            category: v.category,
            count: v.count,
            ...(v.notes ? { notes: v.notes } : {}),
            ...(v.dates && v.dates.length > 0 ? { dates: v.dates } : {}),
            ...(v.updatedAt ? { updatedAt: v.updatedAt } : {}),
          })),
          count: visits.length,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("[firestore-visits] Failed to commit visits bundle:", err);
      }
    },

    subscribe(callback) {
      return onSnapshot(visitsRef(), (snap) => {
        callback(snap.docs.map((d) => docToVisit(d.data() as Record<string, unknown>)));
      });
    },
  };
}

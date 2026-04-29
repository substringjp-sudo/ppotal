import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { RegionVisit, VisitCategory } from "@regionevel/types";
import type { VisitDataStore } from "./types.js";
import { getFirebaseApp } from "./firebase-app.js";

function docToVisit(data: Record<string, unknown>): RegionVisit {
  const visit: RegionVisit = {
    regionId: data.regionId as string,
    category: data.category as VisitCategory,
    count: data.count as number,
  };
  if (data.notes) visit.notes = data.notes as string;
  // Convert Firestore Timestamp → ms for cross-device conflict resolution.
  if (data.updatedAt instanceof Timestamp) {
    visit.updatedAt = data.updatedAt.toMillis();
  }
  return visit;
}

export function createFirestoreVisitStore(uid: string): VisitDataStore {
  const db = getFirestore(getFirebaseApp());
  const visitsRef = () => collection(db, "users", uid, "visits");

  return {
    async getVisits() {
      const snap = await getDocs(visitsRef());
      return snap.docs.map((d) => docToVisit(d.data() as Record<string, unknown>));
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

    subscribe(callback) {
      return onSnapshot(visitsRef(), (snap) => {
        callback(snap.docs.map((d) => docToVisit(d.data() as Record<string, unknown>)));
      });
    },
  };
}

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import type { RegionVisit, VisitCategory } from "@regionevel/types";
import type { VisitDataStore } from "./types.js";
import { getFirebaseApp } from "./firebase-app.js";

export function createFirestoreVisitStore(uid: string): VisitDataStore {
  const db = getFirestore(getFirebaseApp());
  const visitsRef = () => collection(db, "users", uid, "visits");

  return {
    async getVisits() {
      const snap = await getDocs(visitsRef());
      return snap.docs.map((d) => d.data() as RegionVisit);
    },

    async upsertVisit(regionId, category, count, notes) {
      const id = `${regionId}__${category}`;
      await setDoc(doc(db, "users", uid, "visits", id), {
        regionId,
        category,
        count,
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: serverTimestamp(),
      } satisfies Partial<RegionVisit> & { updatedAt: unknown });
    },

    async removeVisit(regionId, category) {
      const id = `${regionId}__${category}`;
      await deleteDoc(doc(db, "users", uid, "visits", id));
    },

    subscribe(callback) {
      return onSnapshot(visitsRef(), (snap) => {
        callback(snap.docs.map((d) => d.data() as RegionVisit));
      });
    },
  };
}

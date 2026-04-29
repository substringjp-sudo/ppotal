import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Region } from "@regionevel/types";
import type { RegionDataStore } from "./types.js";
import { getFirebaseApp } from "./firebase-app.js";

export function createFirestoreRegionStore(): RegionDataStore {
  const db = getFirestore(getFirebaseApp());
  const regionsRef = collection(db, "regions");

  return {
    async getRegions(iso3) {
      const q = query(regionsRef, where("iso3", "==", iso3));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Region);
    },

    async seedRegions(regions) {
      // Batch writes: Firestore max 500 per batch
      const BATCH_SIZE = 499;
      for (let i = 0; i < regions.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        for (const region of regions.slice(i, i + BATCH_SIZE)) {
          batch.set(doc(regionsRef, region.id), region);
        }
        await batch.commit();
      }
    },
  };
}

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

    async getChildren(parentId) {
      const q = query(regionsRef, where("parentId", "==", parentId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Region);
    },
    
    async getAllRegions() {
      const snap = await getDocs(regionsRef);
      return snap.docs.map((d) => d.data() as Region);
    },

    async getRegion(id) {
      const { getDoc, doc } = await import("firebase/firestore");
      const snap = await getDoc(doc(regionsRef, id));
      if (!snap.exists()) return null;
      return snap.data() as Region;
    },

    async getGeometries(ids) {
      if (ids.length === 0) return [];
      // Use documentId() in query if needed, but for now placeholder
      return [];
    },

    async getGeometriesByParent(parentId) {
      const geometriesRef = collection(db, "geometries");
      const q = query(geometriesRef, where("parentId", "==", parentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
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

    async seedGeometries(geometries) {
      const geometriesRef = collection(db, "geometries");
      const BATCH_SIZE = 499;
      for (let i = 0; i < geometries.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        for (const geo of geometries.slice(i, i + BATCH_SIZE)) {
          // Use shapeID or regionId from properties
          const id = geo.properties.id || geo.properties.shapeID;
          if (id) {
            batch.set(doc(geometriesRef, id), geo);
          }
        }
        await batch.commit();
        console.log(`Seeded ${i + geometries.slice(i, i + BATCH_SIZE).length} geometries...`);
      }
    },
  };
}

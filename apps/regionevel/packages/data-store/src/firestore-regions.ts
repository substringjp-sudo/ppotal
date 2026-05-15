import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
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

    async getRegionsByIds(ids) {
      if (ids.length === 0) return [];
      const { documentId } = await import("firebase/firestore");
      
      const results: Region[] = [];
      // Firestore 'in' query limit is 30
      const CHUNK_SIZE = 30;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const q = query(regionsRef, where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        results.push(...snap.docs.map(d => d.data() as Region));
      }
      return results;
    },

    async getGeometries(ids) {
      if (!ids || ids.length === 0) return [];
      const { documentId } = await import("firebase/firestore");
      const geometriesRef = collection(db, "geometries");
      const chunks = [];
      const CHUNK_SIZE = 30;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + CHUNK_SIZE));
      }

      const results = [];
      for (const chunk of chunks) {
        const q = query(geometriesRef, where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        results.push(...snap.docs.map(d => d.data()));
      }
      return results;
    },

    async getGeometriesByParent(parentId) {
      const geometriesRef = collection(db, "geometries");
      // Use root-level parentId for better performance
      const q = query(geometriesRef, where("parentId", "==", parentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    },
    
    async getGeometriesByCountry(iso3, admLevel) {
      console.log(`[FirestoreRegionStore] getGeometriesByCountry: ${iso3}, level: ${admLevel}`);
      const levelMap: Record<number, string> = {
        0: "country",
        1: "prefecture",
        2: "city"
      };
      const level = levelMap[admLevel] || "prefecture";

      // Try to get from bundle first
      const bundle = await this.getGeometryBundle(iso3, admLevel);
      if (bundle && bundle.data) {
        console.log(`[FirestoreRegionStore] Using bundle for ${iso3}_ADM${admLevel}`);
        try {
          const { feature } = await import("topojson-client");
          const topoData = typeof bundle.data === 'string' ? JSON.parse(bundle.data) : bundle.data;
          const firstKey = Object.keys(topoData.objects)[0];
          if (!firstKey) return [];
          const geojson = feature(topoData, topoData.objects[firstKey] as any) as any;
          return geojson.features;
        } catch (e) {
          console.error(`Failed to parse bundle for ${iso3}_ADM${admLevel}`, e);
        }
      }

      // Get country internal ID from regions collection
      const qRegion = query(regionsRef, where("iso3", "==", iso3), where("admLevel", "==", 0));
      const regionSnap = await getDocs(qRegion);
      const countryDoc = regionSnap.docs[0];
      if (!countryDoc) {
        console.warn(`[FirestoreRegionStore] Country doc not found for iso3: ${iso3}`);
        return [];
      }
      const countryId = countryDoc.id;
      console.log(`[FirestoreRegionStore] Resolved countryId: ${countryId} for iso3: ${iso3}`);

      const geometriesRef = collection(db, "geometries");
      let q;
      
      if (admLevel === 0) {
        // For country level, query by document ID
        const { documentId } = await import("firebase/firestore");
        q = query(geometriesRef, where(documentId(), "==", countryId));
      } else if (admLevel === 1) {
        // For level 1, query by parentId (which is countryId)
        q = query(geometriesRef, where("parentId", "==", countryId));
      } else {
        // For level 2 (city), query by properties.countryId and level
        console.log(`[FirestoreRegionStore] Fetching cities for countryId: ${countryId}`);
        q = query(geometriesRef, 
          where("properties.countryId", "==", countryId), 
          where("properties.level", "==", "city")
        );
      }
      
      const snap = await getDocs(q);
      console.log(`[FirestoreRegionStore] Fetched ${snap.docs.length} geometries`);
      return snap.docs.map(d => d.data());
    },

    async getSimplifiedGeometries(iso3) {
      console.log(`[FirestoreRegionStore] getSimplifiedGeometries: ${iso3}`);
      // Use level 2 (cities) geometries for simplified view, 
      // which also leverages bundling if available.
      return this.getGeometriesByCountry(iso3, 2);
    },

    async getGeometryBundle(iso3, admLevel) {
      const bundlesRef = collection(db, "geometries_bundles");
      const bundleId = `${iso3}_ADM${admLevel}`;
      const snap = await getDoc(doc(bundlesRef, bundleId));
      if (!snap.exists()) return null;
      return snap.data();
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

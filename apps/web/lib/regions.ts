import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { createFirestoreRegionStore, createLocalRegionStore, type RegionDataStore } from "@regionevel/data-store";
import { initializeFirebase } from "./firebase";

let storePromise: Promise<RegionDataStore> | null = null;

async function getStore(): Promise<RegionDataStore> {
  if (storePromise) return storePromise;

  storePromise = (async () => {
    try {
      // In browser, use relative path. In server, this might fail unless full URL is provided.
      // But since this app is mostly client-side for these functions, it should work.
      const [regionsRes, geometriesRes] = await Promise.all([
        fetch("/data/regions.json"),
        fetch("/data/geometries.json"),
      ]);
      
      if (!regionsRes.ok || !geometriesRes.ok) {
        throw new Error("Failed to fetch local data files");
      }

      const regions = await regionsRes.json();
      const geometries = await geometriesRes.json();
      console.log(`Loaded ${regions.length} regions and ${geometries.length} geometries from local files.`);
      return createLocalRegionStore(regions, geometries);
    } catch (e) {
      console.error("Failed to load local data, falling back to Firestore", e);
      initializeFirebase();
      return createFirestoreRegionStore();
    }
  })();

  return storePromise;
}

export async function fetchRegion(id: string): Promise<Region | null> {
  try {
    const store = await getStore();
    return await store.getRegion(id);
  } catch (e) {
    console.error(`Failed to fetch region ${id}`, e);
    return null;
  }
}

export async function fetchChildren(parentId: string | null): Promise<Region[]> {
  try {
    const store = await getStore();
    return await store.getChildren(parentId);
  } catch (e) {
    console.error("Failed to fetch regions, falling back to empty", e);
    return [];
  }
}

export async function fetchAllRegions(): Promise<Region[]> {
  try {
    const store = await getStore();
    return await store.getAllRegions();
  } catch (e) {
    console.error("Failed to fetch all regions", e);
    return [];
  }
}

export async function fetchRegionsByIds(ids: string[]): Promise<Region[]> {
  try {
    const store = await getStore();
    return await store.getRegionsByIds(ids);
  } catch (e) {
    console.error("Failed to fetch regions by IDs", e);
    return [];
  }
}

export async function fetchAncestors(regionId: string): Promise<Region[]> {
  const store = await getStore();
  const result: Region[] = [];
  let currentId: string | null = padId(regionId);
  const visited = new Set<string>();

  while (currentId) {
    const region = await store.getRegion(currentId);
    if (!region || !region.parentId) break;
    
    const pId = padId(region.parentId);
    if (visited.has(pId)) break;
    visited.add(pId);

    const parent = await store.getRegion(pId);
    if (!parent) break;
    result.unshift(parent);
    currentId = pId;
  }
  return result;
}

export async function fetchAncestorsBulk(regionIds: string[]): Promise<Region[]> {
  const store = await getStore();
  const allAncestors = new Map<string, Region>();
  
  // If we have a lot of regions, it's actually faster to just get all regions 
  // if we're using a local store.
  if (regionIds.length > 50) {
    return await store.getAllRegions();
  }

  for (const id of regionIds) {
    let currentId: string | null = padId(id);
    const visited = new Set<string>();

    while (currentId) {
      const region = await store.getRegion(currentId);
      if (!region || !region.parentId) break;
      
      const pId = padId(region.parentId);
      if (visited.has(pId)) break;
      visited.add(pId);

      const parent = await store.getRegion(pId);
      if (!parent) break;
      allAncestors.set(padId(parent.id), parent);
      currentId = pId;
    }
  }
  
  return Array.from(allAncestors.values());
}

let firestoreStore: RegionDataStore | null = null;

async function getFirestoreStore(): Promise<RegionDataStore> {
  if (firestoreStore) return firestoreStore;
  initializeFirebase();
  firestoreStore = createFirestoreRegionStore();
  return firestoreStore;
}

export async function fetchGeometries(parentId: string | null): Promise<any[]> {
  try {
    const store = await getStore();
    let rawFeatures: any[] = [];
    
    // If parentId is null, empty, or 'world', we want the top-level features
    const isRoot = !parentId || parentId === "world" || parentId === "ROOT" || parentId === "root" || parentId === "";
    
    if (isRoot) {
      console.log(`[fetchGeometries] Fetching root geometries (world map)...`);
      // Try multiple common root identifiers to ensure we get data
      const rootIdentifers = ["world", null, "ROOT", "root", ""];
      
      for (const id of rootIdentifers) {
        rawFeatures = await store.getGeometriesByParent(id as any);
        if (rawFeatures.length > 0) {
          console.log(`[fetchGeometries] Successfully found ${rawFeatures.length} root geometries using identifier: "${id}"`);
          break;
        }
      }
      
      if (rawFeatures.length === 0) {
        console.warn("[fetchGeometries] All root identifier attempts failed. Map will be empty.");
      }
    } else {
      rawFeatures = await store.getGeometriesByParent(parentId);
      console.log(`[fetchGeometries] Fetched ${rawFeatures.length} geometries for parentId: ${parentId}`);
    }

    // Fallback to Firestore if local store has no results
    if (rawFeatures.length === 0) {
      console.log(`[fetchGeometries] No local geometries for parent ${parentId}, falling back to Firestore...`);
      const fsStore = await getFirestoreStore();
      
      if (isRoot) {
        rawFeatures = await fsStore.getGeometriesByParent("world");
        if (rawFeatures.length === 0) rawFeatures = await fsStore.getGeometriesByParent(null);
      } else {
        rawFeatures = await fsStore.getGeometriesByParent(parentId);
      }
      
      console.log(`[fetchGeometries] Firestore features found: ${rawFeatures.length}`);
    }

    return rawFeatures.map(f => {
      const props = f.properties || {};
      const id = props.id || props.shapeID || props.ID;
      return {
        ...f,
        properties: { ...props, id },
        geometry: typeof f.geometry === "string" ? JSON.parse(f.geometry) : f.geometry
      };
    });
  } catch (e) {
    console.error(`Failed to fetch geometries for parent ${parentId}`, e);
    return [];
  }
}

export async function fetchCountryGeometries(iso3: string, admLevel: number): Promise<any[]> {
  try {
    const store = await getStore();
    let rawFeatures = await store.getGeometriesByCountry(iso3, admLevel);

    // Fallback to Firestore if local store has no results for subdivisions
    if (rawFeatures.length === 0 && admLevel > 0) {
      console.log(`No local geometries for ${iso3} level ${admLevel}, falling back to Firestore`);
      const fsStore = await getFirestoreStore();
      rawFeatures = await fsStore.getGeometriesByCountry(iso3, admLevel);
    }

    return rawFeatures.map(f => {
      const props = f.properties || {};
      const id = props.id || props.shapeID || props.ID;
      return {
        ...f,
        properties: { ...props, id },
        geometry: typeof f.geometry === "string" ? JSON.parse(f.geometry) : f.geometry
      };
    });
  } catch (e) {
    console.error(`Failed to fetch geometries for country ${iso3} level ${admLevel}`, e);
    return [];
  }
}

// Keep the utility functions
export function getChildren(regions: Region[], parentId: string | null): Region[] {
  const paddedParentId = padId(parentId);
  return regions.filter((r) => padId(r.parentId) === paddedParentId);
}

export function getAncestors(regions: Region[], regionId: string): Region[] {
  const result: Region[] = [];
  const paddedId = padId(regionId);
  let current = regions.find((r) => padId(r.id) === paddedId);
  while (current && current.parentId) {
    const pId = padId(current.parentId);
    const parent = regions.find((r) => padId(r.id) === pId);
    if (!parent) break;
    result.unshift(parent);
    current = parent;
  }
  return result;
}

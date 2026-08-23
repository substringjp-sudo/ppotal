import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { createFirestoreRegionStore, createLocalRegionStore, type RegionDataStore } from "@regionevel/data-store";
import { initializeFirebase } from "./firebase";

let storePromise: Promise<RegionDataStore> | null = null;

/**
 * Whether to serve regions and geometries from static files under `/data`
 * instead of Firestore.
 *
 * This is a build-time flag rather than a runtime probe on purpose. The app is
 * a static export, so a missing file cannot be detected without actually
 * requesting it — and speculatively requesting two files that are usually not
 * deployed cost every visitor two 404 round-trips before the real Firestore
 * load could even start. Set `NEXT_PUBLIC_USE_LOCAL_REGION_DATA=1` in the
 * environment once `/data/regions.json` and `/data/geometries.json` ship.
 */
const USE_LOCAL_REGION_DATA = process.env.NEXT_PUBLIC_USE_LOCAL_REGION_DATA === "1";

async function getStore(): Promise<RegionDataStore> {
  if (storePromise) return storePromise;

  storePromise = (async () => {
    if (USE_LOCAL_REGION_DATA) {
      try {
        const [regionsRes, geometriesRes] = await Promise.all([
          fetch("/data/regions.json"),
          fetch("/data/geometries.json"),
        ]);

        if (!regionsRes.ok || !geometriesRes.ok) {
          throw new Error("Failed to fetch local data files");
        }

        const [regions, geometries] = await Promise.all([
          regionsRes.json(),
          geometriesRes.json(),
        ]);
        return createLocalRegionStore(regions, geometries);
      } catch (e) {
        console.error("Failed to load local region data, falling back to Firestore", e);
      }
    }

    initializeFirebase();
    return createFirestoreRegionStore();
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

const CACHE_VERSION = "v1";
const ALL_REGIONS_CACHE_KEY = `regionevel_all_regions_${CACHE_VERSION}`;
const GEOMETRY_CACHE_PREFIX = `regionevel_geom_${CACHE_VERSION}_`;

function getLocalCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("[regions cache] Failed to set localStorage cache", e);
  }
}

export async function fetchAllRegions(): Promise<Region[]> {
  const cached = getLocalCache<Region[]>(ALL_REGIONS_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 50) {
    return cached;
  }

  try {
    const store = await getStore();
    const list = await store.getAllRegions();
    if (list && list.length > 0) {
      setLocalCache(ALL_REGIONS_CACHE_KEY, list);
    }
    return list;
  } catch (e) {
    console.error("Failed to fetch all regions", e);
    return cached || [];
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
  
  const fetchedRegions = new Map<string, Region>();
  let currentIds = new Set<string>(regionIds.map(id => padId(id)));
  const visited = new Set<string>();

  while (currentIds.size > 0) {
    const idsToFetch = Array.from(currentIds).filter(id => !fetchedRegions.has(id) && !visited.has(id));
    if (idsToFetch.length === 0) break;

    idsToFetch.forEach(id => visited.add(id));

    // Fetch regions in bulk
    const regions = await store.getRegionsByIds(idsToFetch);
    
    const nextParentIds = new Set<string>();
    for (const r of regions) {
      const paddedId = padId(r.id);
      fetchedRegions.set(paddedId, r);
      
      const isOriginal = regionIds.some(origId => padId(origId) === paddedId);
      if (!isOriginal) {
        allAncestors.set(paddedId, r);
      }

      if (r.parentId) {
        nextParentIds.add(padId(r.parentId));
      }
    }

    currentIds = nextParentIds;
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

/** True when `getStore()` already resolves to Firestore, so falling back to it is a repeat of the same query. */
function primaryStoreIsFirestore(): boolean {
  return !USE_LOCAL_REGION_DATA;
}

export function isStandardBoundaryFeature(f: any): boolean {
  if (!f) return false;
  const props = f.properties || {};
  const id = String(props.id || props.shapeID || props.ID || f.id || "");
  // Filter out OpenStreetMap patch features that include territorial waters / sea areas
  if (id.startsWith("osm_") || props.source === "osm" || props.osmRelationId != null) {
    return false;
  }
  return true;
}

export function normalizeFeatures(rawFeatures: any[]): any[] {
  return rawFeatures
    .filter(isStandardBoundaryFeature)
    .map(f => {
      const props = f.properties || {};
      const id = props.id || props.shapeID || props.ID || f.id;
      return {
        ...f,
        properties: { ...props, id },
        geometry: typeof f.geometry === "string" ? JSON.parse(f.geometry) : f.geometry
      };
    });
}

/**
 * Geometry is immutable reference data and each fetch is expensive — a country
 * at city level is thousands of documents. Drilling into a region and back out
 * is a normal thing to do, so the second visit should not pay for it again.
 *
 * Keyed on the request, holding the in-flight promise so two callers racing for
 * the same geometry share one fetch.
 */
const geometryCache = new Map<string, Promise<any[]>>();

/** Root can be spelled several ways in the data; try the likeliest first and stop at the first hit. */
const ROOT_IDENTIFIERS = ["world", null, "ROOT", "root", ""];

function isRootId(parentId: string | null): boolean {
  return !parentId || parentId === "world" || parentId === "ROOT" || parentId === "root";
}

async function getGeometriesByParentResolvingRoot(
  store: RegionDataStore,
  parentId: string | null,
): Promise<any[]> {
  if (!isRootId(parentId)) {
    return store.getGeometriesByParent(parentId);
  }
  // Sequential with early exit: the first identifier almost always hits, so
  // this is one query where the previous parallel fan-out cost five.
  for (const id of ROOT_IDENTIFIERS) {
    const res = await store.getGeometriesByParent(id as any);
    if (res && res.length > 0) return res;
  }
  return [];
}

export async function fetchGeometries(parentId: string | null): Promise<any[]> {
  const cacheKey = `parent:${isRootId(parentId) ? "__root__" : parentId}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const storageKey = `${GEOMETRY_CACHE_PREFIX}${cacheKey}`;
  const localCached = getLocalCache<any[]>(storageKey);

  const request = (async () => {
    if (localCached && Array.isArray(localCached) && localCached.length > 0) {
      return localCached;
    }

    try {
      const store = await getStore();
      let rawFeatures = await getGeometriesByParentResolvingRoot(store, parentId);

      // Only worth retrying against Firestore when the primary store is something else.
      if (rawFeatures.length === 0 && !primaryStoreIsFirestore()) {
        const fsStore = await getFirestoreStore();
        rawFeatures = await getGeometriesByParentResolvingRoot(fsStore, parentId);
      }

      if (rawFeatures.length === 0) {
        console.warn(`[fetchGeometries] No geometries found for parent ${parentId ?? "root"}`);
      }

      const normalized = normalizeFeatures(rawFeatures);
      if (normalized.length > 0) {
        setLocalCache(storageKey, normalized);
      }
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch geometries for parent ${parentId}`, e);
      geometryCache.delete(cacheKey); // a failure should not be cached
      return localCached || [];
    }
  })();

  geometryCache.set(cacheKey, request);
  return request;
}

export async function fetchCountryGeometries(iso3: string, admLevel: number): Promise<any[]> {
  const cacheKey = `country:${iso3}:${admLevel}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const storageKey = `${GEOMETRY_CACHE_PREFIX}${cacheKey}`;
  const localCached = getLocalCache<any[]>(storageKey);

  const request = (async () => {
    if (localCached && Array.isArray(localCached) && localCached.length > 0) {
      return localCached;
    }

    try {
      const store = await getStore();
      let rawFeatures = await store.getGeometriesByCountry(iso3, admLevel);

      // Only worth retrying against Firestore when the primary store is something else.
      if (rawFeatures.length === 0 && admLevel > 0 && !primaryStoreIsFirestore()) {
        const fsStore = await getFirestoreStore();
        rawFeatures = await fsStore.getGeometriesByCountry(iso3, admLevel);
      }

      const normalized = normalizeFeatures(rawFeatures);
      if (normalized.length > 0) {
        setLocalCache(storageKey, normalized);
      }
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch geometries for ${iso3}/${admLevel}`, e);
      geometryCache.delete(cacheKey);
      return localCached || [];
    }
  })();

  geometryCache.set(cacheKey, request);
  return request;
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

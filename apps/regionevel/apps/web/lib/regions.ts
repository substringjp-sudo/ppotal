import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";
import { createFirestoreRegionStore, createLocalRegionStore, type RegionDataStore } from "@regionevel/data-store";
import { initializeFirebase } from "./firebase";
import { bigCacheGet, bigCacheSet, bigCacheEvictExcept } from "./bigCache";

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

// Bump this whenever the geometry or region data behind the cache changes.
// The cache has no expiry: once a viewer holds a key they keep that copy, so
// seeding new cities left every returning viewer looking at the pre-seed array
// and concluding the holes were still there. A bump drops the old entries.
// v2: the Japanese city seed of 2026-09-24.
const CACHE_VERSION = "v2";
const ALL_REGIONS_CACHE_KEY = `regionevel_all_regions_${CACHE_VERSION}`;
const GEOMETRY_CACHE_PREFIX = `regionevel_geom_${CACHE_VERSION}_`;

/**
 * These payloads outgrew localStorage, so they live in IndexedDB.
 *
 * The region table alone is ~55,000 documents and about 9 MB of JSON against an
 * origin budget of roughly 5 MB: the write threw every time, the throw was
 * swallowed, and the cache stayed permanently empty. Every visit re-downloaded
 * all 55,000 documents. See `bigCache` for the rest.
 */
async function getCached<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  return bigCacheGet<T>(key);
}

async function setCached<T>(key: string, data: T): Promise<void> {
  if (typeof window === "undefined") return;
  await bigCacheSet(key, data);
}

let evicted = false;
function evictOldVersionsOnce(): void {
  if (evicted || typeof window === "undefined") return;
  evicted = true;
  void bigCacheEvictExcept("regionevel_", CACHE_VERSION);
}

export async function fetchAllRegions(): Promise<Region[]> {
  evictOldVersionsOnce();
  const cached = await getCached<Region[]>(ALL_REGIONS_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 50) {
    return cached;
  }

  try {
    const store = await getStore();
    const list = await store.getAllRegions();
    if (list && list.length > 0) {
      await setCached(ALL_REGIONS_CACHE_KEY, list);
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

  const request = (async () => {
    const localCached = await getCached<any[]>(storageKey);
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
        await setCached(storageKey, normalized);
      }
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch geometries for parent ${parentId}`, e);
      geometryCache.delete(cacheKey); // a failure should not be cached
      return [];
    }
  })();

  geometryCache.set(cacheKey, request);
  return request;
}

/**
 * The internal border network of a country's bundle, as one MultiLineString.
 *
 * Adjacent polygons drawn separately on a canvas leave a hairline between them
 * even when their shared edge is coordinate-identical: each one's anti-aliased
 * edge pixels blend with the background rather than with its neighbour, and a
 * translucent fill lets that show through. Stroking each polygon does not fix
 * it — it makes the seam worse, because both neighbours draw the same border and
 * the line comes out double width.
 *
 * A topojson bundle stores each shared border once, as an arc, so `mesh` can
 * hand back the whole network with every border in it exactly once. Drawn as a
 * single layer over unstroked fills, borders are one line wide and the fills
 * meet each other directly.
 *
 * Returns null when the country has no bundle, which is the signal to fall back
 * to stroking each polygon.
 */
export async function fetchCountryBorderMesh(
  iso3: string,
  admLevel: number,
): Promise<any | null> {
  const cacheKey = `mesh:${iso3}:${admLevel}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const storageKey = `${GEOMETRY_CACHE_PREFIX}${cacheKey}`;

  const request = (async () => {
    const local = await getCached<any>(storageKey);
    if (local) return local;

    try {
      const store = await getStore();
      const bundle = await store.getGeometryBundle(iso3, admLevel);
      if (!bundle?.data) return null;

      const topo = typeof bundle.data === "string" ? JSON.parse(bundle.data) : bundle.data;
      const key = Object.keys(topo?.objects ?? {})[0];
      if (!key) return null;

      const { mesh } = await import("topojson-client");
      // The two-argument form gives every arc; passing a filter would drop the
      // country's outline, which the map still wants drawn.
      const lines = mesh(topo, topo.objects[key]);
      if (!lines?.coordinates?.length) return null;

      await setCached(storageKey, lines);
      return lines;
    } catch (e) {
      console.error(`Failed to build a border mesh for ${iso3}/${admLevel}`, e);
      geometryCache.delete(cacheKey);
      return null;
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

  const request = (async () => {
    const localCached = await getCached<any[]>(storageKey);
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
        await setCached(storageKey, normalized);
      }
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch geometries for ${iso3}/${admLevel}`, e);
      geometryCache.delete(cacheKey);
      return [];
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

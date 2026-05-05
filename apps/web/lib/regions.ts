import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";

const cache = new Map<string, Region[]>();



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
import { createFirestoreRegionStore } from "@regionevel/data-store";

import { initializeFirebase } from "./firebase";

let regionStore: ReturnType<typeof createFirestoreRegionStore> | null = null;

function getStore() {
  if (!regionStore) {
    initializeFirebase();
    regionStore = createFirestoreRegionStore();
  }
  return regionStore;
}

export async function fetchRegion(id: string): Promise<Region | null> {
  try {
    return await getStore().getRegion(id);
  } catch (e) {
    console.error(`Failed to fetch region ${id}`, e);
    return null;
  }
}

export async function fetchChildren(parentId: string | null): Promise<Region[]> {
  try {
    return await getStore().getChildren(parentId);
  } catch (e) {
    console.error("Failed to fetch regions from Firestore, falling back to empty", e);
    return [];
  }
}

export async function fetchAllRegions(): Promise<Region[]> {
  try {
    return await getStore().getAllRegions();
  } catch (e) {
    console.error("Failed to fetch all regions from Firestore", e);
    return [];
  }
}

export async function fetchRegionsByIds(ids: string[]): Promise<Region[]> {
  try {
    return await getStore().getRegionsByIds(ids);
  } catch (e) {
    console.error("Failed to fetch regions by IDs", e);
    return [];
  }
}

export async function fetchAncestors(regionId: string): Promise<Region[]> {
  const result: Region[] = [];
  let currentId: string | null = padId(regionId);
  const store = getStore();

  // Keep track of IDs we need to fetch
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
export async function fetchGeometries(parentId: string | null): Promise<any[]> {
  try {
    const rawFeatures = await getStore().getGeometriesByParent(parentId);
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

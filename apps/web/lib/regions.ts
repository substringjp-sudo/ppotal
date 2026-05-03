import type { Region } from "@regionevel/types";

const cache = new Map<string, Region[]>();

export async function loadRegions(iso3: string): Promise<Region[]> {
  if (cache.has(iso3)) return cache.get(iso3)!;
  const res = await fetch(`/data/meta/${iso3}.json`);
  if (!res.ok) throw new Error(`Failed to load regions for ${iso3}`);
  const data = (await res.json()) as Region[];
  cache.set(iso3, data);
  return data;
}

export function flattenTree(tree: any[]): Region[] {
  if (!Array.isArray(tree)) return [];
  const regions: Region[] = [];
  for (const country of tree) {
    if (!country || typeof country !== "object") continue;
    regions.push({
      id: country.id || "",
      parentId: null,
      name: country.name || "Unknown",
      iso3: country.code || "",
      admLevel: 0,
    });
    if (Array.isArray(country.prefectures)) {
      for (const pref of country.prefectures) {
        regions.push({
          id: pref.id || "",
          parentId: country.id || "",
          name: pref.name || "Unknown",
          iso3: country.code || "",
          admLevel: 1,
        });
        if (Array.isArray(pref.cities)) {
          for (const city of pref.cities) {
            regions.push({
              id: city.id || "",
              parentId: pref.id || "",
              name: city.name || "Unknown",
              iso3: country.code || "",
              admLevel: 2,
            });
          }
        }
      }
    }
  }
  return regions;
}

export function getChildren(regions: Region[], parentId: string | null): Region[] {
  return regions.filter((r) => (r.parentId || "") === (parentId || ""));
}

export function getAncestors(regions: Region[], regionId: string): Region[] {
  const result: Region[] = [];
  let current = regions.find((r) => r.id === regionId);
  while (current && current.parentId) {
    const pId: string = current.parentId;
    const parent = regions.find((r) => r.id === pId);
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

export async function fetchAncestors(regionId: string): Promise<Region[]> {
  const result: Region[] = [];
  let currentId: string | null = regionId;

  while (currentId) {
    const region = await getStore().getRegion(currentId);
    if (!region || !region.parentId) break;
    const parent = await getStore().getRegion(region.parentId);
    if (!parent) break;
    result.unshift(parent);
    currentId = parent.id;
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

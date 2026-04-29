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

export function getChildren(regions: Region[], parentId: string): Region[] {
  return regions.filter((r) => r.parentId === parentId);
}

export function getAncestors(regions: Region[], regionId: string): Region[] {
  const result: Region[] = [];
  let current = regions.find((r) => r.id === regionId);
  while (current?.parentId) {
    const parent = regions.find((r) => r.id === current!.parentId);
    if (!parent) break;
    result.unshift(parent);
    current = parent;
  }
  return result;
}

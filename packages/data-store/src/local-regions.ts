import type { Region } from "@regionevel/types";
import type { RegionDataStore } from "./types.js";

export function createLocalRegionStore(
  regions: Region[],
  geometries: any[]
): RegionDataStore {
  // Pre-index for O(1) lookup
  const regionMap = new Map<string, Region>();
  const childMap = new Map<string | null, Region[]>();
  
  for (const r of regions) {
    regionMap.set(r.id, r);
    const pId = r.parentId || null;
    if (!childMap.has(pId)) {
      childMap.set(pId, []);
    }
    childMap.get(pId)!.push(r);
  }

  const geometryMap = new Map<string, any[]>();
  const geometryByParentMap = new Map<string | null, any[]>();

  for (const g of geometries) {
    const props = g.properties || {};
    const id = props.id || props.shapeID || g.id;
    if (id) {
      if (!geometryMap.has(id)) geometryMap.set(id, []);
      geometryMap.get(id)!.push(g);
    }
    
    const pId = g.parentId === "" ? null : (g.parentId || null);
    if (!geometryByParentMap.has(pId)) {
      geometryByParentMap.set(pId, []);
    }
    geometryByParentMap.get(pId)!.push(g);
  }

  return {
    async getRegions(iso3) {
      return regions.filter((r) => r.iso3 === iso3);
    },

    async getChildren(parentId) {
      return childMap.get(parentId) || [];
    },

    async getAllRegions() {
      return regions;
    },

    async getRegion(id) {
      return regionMap.get(id) || null;
    },

    async getRegionsByIds(ids) {
      return ids.map(id => regionMap.get(id)).filter((r): r is Region => !!r);
    },

    async getGeometries(ids) {
      return ids.flatMap(id => geometryMap.get(id) || []);
    },

    async getGeometriesByParent(parentId) {
      const targetId = parentId === "" ? null : (parentId || null);
      return geometryByParentMap.get(targetId) || [];
    },
    
    async getGeometriesByCountry(iso3, admLevel) {
      // This is still O(N) for now as it's less frequent, 
      // but we could index this too if needed.
      return geometries.filter((g) => {
        const props = g.properties || {};
        return (g.iso3 === iso3 || props.countryId === iso3) && (g.admLevel === admLevel || props.admLevel === admLevel);
      });
    },

    async getSimplifiedGeometries(iso3) {
      return geometries.filter((g) => {
        const props = g.properties || {};
        return (g.iso3 === iso3 || props.countryId === iso3) && (props.level === 'city');
      });
    },

    async getGeometryBundle() {
      return null;
    },

    async seedRegions() {
      console.warn("seedRegions is not supported in LocalRegionStore");
    },

    async seedGeometries() {
      console.warn("seedGeometries is not supported in LocalRegionStore");
    },
  };
}

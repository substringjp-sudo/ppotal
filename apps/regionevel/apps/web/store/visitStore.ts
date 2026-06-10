"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import {
  getNextIncrement,
  getRegionScore,
  padId,
} from "@regionevel/utils";
import { db, getRegionevelShapeId } from "@ppotal/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";

interface VisitStore {
  visits: RegionVisit[];
  scores: Record<string, RegionScore>;
  allRegions: Region[];
  _hasHydrated: boolean;
  stats: {
    visitedCountries: number;
    visitedPrefectures: number;
    visitedCities: number;
    pass: number;
    transit: number;
    visit: number;
    stay: number;
    residence: number;
  };
  upsertVisit: (regionId: string, category: VisitCategory, count: number) => void;
  removeVisit: (regionId: string, category: VisitCategory) => void;
  quickIncrement: (regionId: string) => void;
  getScore: (regionId: string) => RegionScore | undefined;
  setRegions: (regions: Region[]) => void;
  recalculateScores: (regions?: Region[]) => void;
  getRegionScoreById: (id: string, includeStats?: boolean) => RegionScore | null;
  setHasHydrated: (val: boolean) => void;
  importTripsFromJprail: (uid: string) => Promise<{ success: boolean; importedShapeIds: string[] }>;
}

// Helper function to calculate scores and stats atomically
const calculateScoresAndStats = (
  visits: RegionVisit[],
  allRegions: Region[],
  currentScores: Record<string, RegionScore>,
  forceAll: boolean = false
) => {
  if (allRegions.length === 0) {
    return {
      scores: currentScores,
      stats: {
        visitedCountries: 0,
        visitedPrefectures: 0,
        visitedCities: 0,
        pass: 0,
        transit: 0,
        visit: 0,
        stay: 0,
        residence: 0,
      },
    };
  }

  const regionMap = new Map<string, Region>();
  const parentIdMap = new Map<string | null, Region[]>();
  
  for (const r of allRegions) {
    const id = padId(r.id);
    const pId = padId(r.parentId);
    regionMap.set(id, r);
    const children = parentIdMap.get(pId) || [];
    children.push(r);
    parentIdMap.set(pId, children);
  }

  const vMap = new Map<string, RegionVisit[]>();
  const affectedIds = new Set<string>();
  
  for (const v of visits) {
    const rid = padId(v.regionId);
    const list = vMap.get(rid) || [];
    list.push(v);
    vMap.set(rid, list);
    
    let currId: string | null = rid;
    while (currId && !affectedIds.has(currId)) {
      affectedIds.add(currId);
      const reg = regionMap.get(currId);
      currId = reg ? padId(reg.parentId) : null;
    }
  }

  const newScores: Record<string, RegionScore> = { ...currentScores };
  const scoreMemo = new Map<string, RegionScore>();
  for (const [id, score] of Object.entries(currentScores)) {
    scoreMemo.set(id, score);
  }

  const countMemo = new Map<string, Record<VisitCategory, number>>();

  const targets = Array.from(affectedIds)
    .map((id) => regionMap.get(id))
    .filter((r): r is Region => !!r);
  
  const finalTargets = (Object.keys(currentScores).length === 0 || forceAll) ? allRegions : targets;

  for (const r of finalTargets) {
    const id = padId(r.id);
    if (affectedIds.has(id)) {
      scoreMemo.delete(id);
      countMemo.delete(id);
    }
    const score = getRegionScore(id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, true);
    newScores[id] = score;
  }

  const stats = {
    visitedCountries: 0,
    visitedPrefectures: 0,
    visitedCities: 0,
    pass: 0,
    transit: 0,
    visit: 0,
    stay: 0,
    residence: 0,
  };

  for (const [rid] of vMap) {
    const r = regionMap.get(rid);
    if (r) {
      if (r.admLevel === 0) stats.visitedCountries++;
      else if (r.admLevel === 1) stats.visitedPrefectures++;
      else if (r.admLevel === 2) stats.visitedCities++;
    }
  }

  for (const v of visits) {
    if (v.category in stats) {
      (stats as any)[v.category] += v.count;
    }
  }

  return { scores: newScores, stats };
};

export const useVisitStore = create<VisitStore>()(
  persist(
    (set, get) => ({
      visits: [],
      scores: {},
      allRegions: [],
      stats: {
        visitedCountries: 0,
        visitedPrefectures: 0,
        visitedCities: 0,
        pass: 0,
        transit: 0,
        visit: 0,
        stay: 0,
        residence: 0,
      },
      _hasHydrated: false,

      setHasHydrated(val) {
        set({ _hasHydrated: val });
      },

      setRegions(regions) {
        const currentRegions = get().allRegions;
        const currentScores = get().scores;
        const regionMap = new Map<string, Region>();
        currentRegions.forEach(r => regionMap.set(padId(r.id), r));
        let changed = false;
        regions.forEach(r => {
          const id = padId(r.id);
          if (!regionMap.has(id)) {
            regionMap.set(id, r);
            changed = true;
          }
        });
        
        const hasNoScores = Object.keys(currentScores).length === 0;

        if (changed || (hasNoScores && regions.length > 0)) {
          const newRegions = Array.from(regionMap.values());
          set({ allRegions: newRegions });
          get().recalculateScores(newRegions);
        }
      },

      upsertVisit(regionId, category, count) {
        if (!VISIT_CONFIG[category]) {
          console.error(`[visitStore] Invalid category: ${category}`);
          return;
        }
        const id = padId(regionId);
        const { visits, allRegions, scores: currentScores } = get();

        const getPrevCount = (cat: VisitCategory) => {
          const found = visits.find(v => padId(v.regionId) === id && v.category === cat);
          return found ? found.count : 0;
        };

        const prevCount = getPrevCount(category);
        const diff = count - prevCount;

        let updatedVisits = [...visits];

        const applyChange = (cat: VisitCategory, targetCount: number) => {
          const cfg = VISIT_CONFIG[cat];
          const finalCount = Math.max(0, Math.min(cfg.maxCount, targetCount));
          
          updatedVisits = updatedVisits.filter(v => !(padId(v.regionId) === id && v.category === cat));
          if (finalCount > 0) {
            updatedVisits.push({ regionId: id, category: cat, count: finalCount, updatedAt: Date.now() });
          }
        };

        applyChange(category, count);

        if (diff > 0) {
          if (category === "transit") {
            applyChange("pass", getPrevCount("pass") + diff);
          } else if (category === "visit") {
            applyChange("transit", getPrevCount("transit") + diff);
            applyChange("pass", getPrevCount("pass") + diff);
          } else if (category === "stay") {
            applyChange("visit", getPrevCount("visit") + diff);
            applyChange("transit", getPrevCount("transit") + diff);
            applyChange("pass", getPrevCount("pass") + diff);
          }
        }

        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        set({ visits: updatedVisits, scores: newScores, stats });
      },

      removeVisit(regionId, category) {
        const id = padId(regionId);
        const { visits, allRegions, scores: currentScores } = get();
        const updatedVisits = visits.filter(
          (v) => !(padId(v.regionId) === id && v.category === category),
        );
        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        set({ visits: updatedVisits, scores: newScores, stats });
      },

      quickIncrement(regionId) {
        const id = padId(regionId);
        const { visits, upsertVisit } = get();
        const next = getNextIncrement(visits, id);
        if (next) upsertVisit(id, next.category, next.newCount);
      },

      getScore(regionId: string) {
        const id = padId(regionId);
        return get().scores[id];
      },

      getRegionScoreById(id, includeStats = false) {
        const { visits, allRegions } = get();
        if (allRegions.length === 0) return null;
        
        const rid = padId(id);
        const regionMap = new Map<string, Region>();
        const parentIdMap = new Map<string | null, Region[]>();
        const vMap = new Map<string, RegionVisit[]>();
        const affectedIds = new Set<string>();

        for (const r of allRegions) {
          const regionId = padId(r.id);
          const pId = padId(r.parentId);
          regionMap.set(regionId, r);
          const children = parentIdMap.get(pId) || [];
          children.push(r);
          parentIdMap.set(pId, children);
        }

        for (const v of visits) {
          const vrid = padId(v.regionId);
          const list = vMap.get(vrid) || [];
          list.push(v);
          vMap.set(vrid, list);
          
          let currId: string | null = vrid;
          while (currId && !affectedIds.has(currId)) {
            affectedIds.add(currId);
            const reg = regionMap.get(currId);
            currId = reg ? padId(reg.parentId) : null;
          }
        }

        return getRegionScore(rid, vMap, regionMap, parentIdMap, new Map(), new Map(), affectedIds, includeStats);
      },

      recalculateScores(regions) {
        const allRegions = regions || get().allRegions;
        const { visits, scores: currentScores } = get();
        if (allRegions.length === 0) return;

        const { scores: newScores, stats } = calculateScoresAndStats(visits, allRegions, currentScores, !!regions);
        set({ scores: newScores, stats });
      },

      async importTripsFromJprail(uid: string) {
        try {
          const tripsRef = collection(db, "users", uid, "trips");
          const querySnapshot = await getDocs(tripsRef);
          const uniqueCityIds = new Set<string>();
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.cityIds && Array.isArray(data.cityIds)) {
              data.cityIds.forEach((cid: string) => uniqueCityIds.add(cid));
            }
          });

          if (uniqueCityIds.size === 0) return { success: false, importedShapeIds: [] };

          const currentVisits = [...get().visits];
          const shapeIds = new Set<string>();
          uniqueCityIds.forEach((cityId) => {
            const shapeId = getRegionevelShapeId(cityId);
            if (shapeId) {
              shapeIds.add(shapeId);
            }
          });

          if (shapeIds.size === 0) return { success: false, importedShapeIds: [] };

          let changed = false;
          shapeIds.forEach((shapeId) => {
            const paddedShapeId = padId(shapeId);
            const existingIdx = currentVisits.findIndex(
              (v) => padId(v.regionId) === paddedShapeId && v.category === "pass"
            );

            if (existingIdx >= 0) {
              const existingVisit = currentVisits[existingIdx];
              if (existingVisit) {
                const currentCount = existingVisit.count || 0;
                if (currentCount < 5) {
                  currentVisits[existingIdx] = {
                    ...existingVisit,
                    count: Math.min(5, currentCount + 1),
                    updatedAt: Date.now(),
                  };
                  changed = true;
                }
              }
            } else {
              currentVisits.push({
                regionId: paddedShapeId,
                category: "pass",
                count: 1,
                updatedAt: Date.now(),
              });
              changed = true;
            }
          });

          if (changed) {
            const { allRegions, scores: currentScores } = get();
            const { scores: newScores, stats } = calculateScoresAndStats(
              currentVisits,
              allRegions,
              currentScores
            );
            set({ visits: currentVisits, scores: newScores, stats });

            // Firestore에 직접 백업 진행
            try {
              await Promise.all(
                Array.from(shapeIds).map(async (shapeId) => {
                  const paddedShapeId = padId(shapeId);
                  const matchedVisit = currentVisits.find(
                    (v) => padId(v.regionId) === paddedShapeId && v.category === "pass"
                  );
                  if (matchedVisit) {
                    const docId = `${paddedShapeId}__pass`;
                    await setDoc(doc(db, "users", uid, "visits", docId), {
                      regionId: paddedShapeId,
                      category: "pass",
                      count: matchedVisit.count,
                      updatedAt: serverTimestamp(),
                    });
                  }
                })
              );
            } catch (err) {
              console.error("Failed to batch write imported visits to Firestore:", err);
            }
          }
          return { success: true, importedShapeIds: Array.from(shapeIds) };
        } catch (e) {
          console.error("Failed to import trips from JPRAIL:", e);
          return { success: false, importedShapeIds: [] };
        }
      },
    }),
    {
      name: "regionevel-visits",
      version: 3,
      partialize: (state) => ({ visits: state.visits }),
 // Only persist visits, not derived scores
      onRehydrateStorage: (state) => {
        return () => {
          state?.setHasHydrated(true);
        };
      },
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as any;
        
        // Version 1 -> 2: Standardize regionId to padded 5-digit format
        if (version < 2 && state && state.visits) {
          state.visits = state.visits.map((v: any) => ({
            ...v,
            regionId: padId(v.regionId),
          }));
        }

        // Version 2 -> 3: Rename 'live' category to 'residence'
        if (version < 3 && state && state.visits) {
          state.visits = state.visits.map((v: any) => ({
            ...v,
            category: v.category === "live" ? "residence" : v.category,
          }));
        }

        // Always ensure only valid categories are kept
        if (state && state.visits) {
          state.visits = state.visits.filter((v: any) => !!VISIT_CONFIG[v.category as VisitCategory]);
        }

        return state;
      },
    },
  ),
);

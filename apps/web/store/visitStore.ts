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
}

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
        // Merge regions if they are different
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
        
        if (changed) {
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
        set((s) => {
          const filtered = s.visits.filter(
            (v) => !(padId(v.regionId) === id && v.category === category),
          );
          const newVisits = count <= 0 
            ? filtered 
            : [...filtered, { regionId: id, category, count, updatedAt: Date.now() }];
          
          return { visits: newVisits };
        });
        // Recalculate scores after visit update
        get().recalculateScores();
      },

      removeVisit(regionId, category) {
        const id = padId(regionId);
        set((s) => ({
          visits: s.visits.filter(
            (v) => !(padId(v.regionId) === id && v.category === category),
          ),
        }));
        get().recalculateScores();
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
        const { visits } = get();
        if (allRegions.length === 0) return;

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

        const newScores: Record<string, RegionScore> = {};
        const scoreMemo = new Map<string, RegionScore>();
        const countMemo = new Map<string, Record<VisitCategory, number>>();

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

        // Instead of calculating for ALL regions, we can be smarter.
        // But for the initial map load, we do need most of them.
        // Optimization: Only loop through regions that ARE in the current viewport or are countries.
        for (const r of allRegions) {
          const id = padId(r.id);
          // Only calculate if it's affected OR it's a country (for global stats)
          if (affectedIds.has(id) || r.admLevel === 0) {
            const score = getRegionScore(id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, true);
            newScores[id] = score;

            if (score.hasVisit) {
              if (r.admLevel === 0) stats.visitedCountries++;
              else if (r.admLevel === 1) stats.visitedPrefectures++;
              else if (r.admLevel === 2) stats.visitedCities++;
            }
          } else {
            // Provide a default empty score for non-affected regions to keep the Record complete
            newScores[id] = {
              regionId: id,
              directScore: 0,
              rateScore: 0,
              childSum: 0,
              childMax: (r.childrenCount ?? 0) * 50,
              totalScore: 0,
              scoreType: r.admLevel < 2 ? "orange" : "blue",
              hasVisit: false,
              breakdown: {} as any, // Minimal
            };
          }
        }

        // Aggregate category counts from visits
        for (const v of visits) {
          if (v.category in stats) {
            (stats as any)[v.category] += v.count;
          }
        }

        set({ scores: newScores, stats });
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

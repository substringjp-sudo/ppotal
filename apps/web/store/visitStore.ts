"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import {
  getNextIncrement,
  getRegionScore,
  padId,
} from "@regionevel/utils";

interface VisitStore {
  visits: RegionVisit[];
  scores: Record<string, RegionScore>; // Cache for calculated scores
  _hasHydrated: boolean;
  upsertVisit: (regionId: string, category: VisitCategory, count: number) => void;
  removeVisit: (regionId: string, category: VisitCategory) => void;
  quickIncrement: (regionId: string) => void;
  getScore: (regionId: string) => RegionScore | undefined;
  recalculateScores: (allRegions: Region[]) => void;
  setHasHydrated: (val: boolean) => void;
}

export const useVisitStore = create<VisitStore>()(
  persist(
    (set, get) => ({
      visits: [],
      scores: {},
      _hasHydrated: false,

      setHasHydrated(val) {
        set({ _hasHydrated: val });
      },

      upsertVisit(regionId, category, count) {
        const id = padId(regionId);
        set((s) => {
          const filtered = s.visits.filter(
            (v) => !(v.regionId === id && v.category === category),
          );
          const newVisits = count <= 0 
            ? filtered 
            : [...filtered, { regionId: id, category, count, updatedAt: Date.now() }];
          
          return { visits: newVisits };
        });
      },

      removeVisit(regionId, category) {
        const id = padId(regionId);
        set((s) => ({
          visits: s.visits.filter(
            (v) => !(v.regionId === id && v.category === category),
          ),
        }));
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

      recalculateScores(allRegions) {
        const { visits } = get();
        if (allRegions.length === 0) return;

        const regionMap = new Map<string, Region>();
        const parentIdMap = new Map<string | null, Region[]>();
        
        for (const r of allRegions) {
          const id = padId(r.id);
          const pId = padId(r.parentId);
          
          regionMap.set(id, r);
          
          if (!parentIdMap.has(pId)) parentIdMap.set(pId, []);
          parentIdMap.get(pId)!.push(r);
        }

        const newScores: Record<string, RegionScore> = {};
        const scoreMemo = new Map<string, RegionScore>();
        const memo = new Map<string, Record<VisitCategory, number>>();

        for (const r of allRegions) {
          const id = padId(r.id);
          newScores[id] = getRegionScore(id, visits, regionMap, parentIdMap, memo, scoreMemo);
        }

        set({ scores: newScores });
      },
    }),
    {
      name: "regionevel-visits",
      version: 3,
      partialize: (state) => ({ visits: state.visits }), // Only persist visits, not derived scores
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

        return state;
      },
    },
  ),
);

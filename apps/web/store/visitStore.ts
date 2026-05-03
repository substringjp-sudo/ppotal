"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import {
  getAggregatedChildScore,
  getNextIncrement,
  getRegionScore,
  padId,
} from "@regionevel/utils";

interface VisitStore {
  visits: RegionVisit[];
  upsertVisit: (regionId: string, category: VisitCategory, count: number) => void;
  removeVisit: (regionId: string, category: VisitCategory) => void;
  quickIncrement: (regionId: string) => void;
  scoringMode: "individual" | "cumulative";
  setScoringMode: (mode: "individual" | "cumulative") => void;
  getScore: (regionId: string) => RegionScore;
  getFullScore: (regionId: string, allRegions: Region[], parentIdMap?: Map<string | null, Region[]>, memo?: Map<string, any>, overrideVisits?: RegionVisit[] | Map<string, RegionVisit[]>) => RegionScore;
}

export const useVisitStore = create<VisitStore>()(
  persist(
    (set, get) => ({
      visits: [],
      scoringMode: "individual",

      setScoringMode(mode) {
        set({ scoringMode: mode });
      },

      upsertVisit(regionId, category, count) {
        const id = padId(regionId);
        set((s) => {
          const filtered = s.visits.filter(
            (v) => !(v.regionId === id && v.category === category),
          );
          if (count <= 0) return { visits: filtered };
          return {
            visits: [
              ...filtered,
              { regionId: id, category, count, updatedAt: Date.now() },
            ],
          };
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

      getScore(regionId) {
        const id = padId(regionId);
        const { visits } = get();
        return getRegionScore(id, visits);
      },

      getFullScore(regionId, allRegions, parentIdMap, memo, overrideVisits) {
        const id = padId(regionId);
        const visits = overrideVisits ?? get().visits;
        return getRegionScore(id, visits, allRegions, parentIdMap, memo);
      },
    }),
    {
      name: "regionevel-visits",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as any;
        if (version < 2 && state && state.visits) {
          state.visits = state.visits.map((v: any) => ({
            ...v,
            regionId: padId(v.regionId),
          }));
        }
        return state;
      },
    },
  ),
);

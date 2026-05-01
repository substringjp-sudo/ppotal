"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import {
  getAggregatedChildScore,
  getNextIncrement,
  getRegionScore,
} from "@regionevel/utils";

interface VisitStore {
  visits: RegionVisit[];
  upsertVisit: (regionId: string, category: VisitCategory, count: number) => void;
  removeVisit: (regionId: string, category: VisitCategory) => void;
  quickIncrement: (regionId: string) => void;
  getScore: (regionId: string) => RegionScore;
  getFullScore: (regionId: string, allRegions: Region[], parentIdMap?: Map<string | null, Region[]>, memo?: Map<string, any>, overrideVisits?: RegionVisit[] | Map<string, RegionVisit[]>) => RegionScore;
}

export const useVisitStore = create<VisitStore>()(
  persist(
    (set, get) => ({
      visits: [],

      upsertVisit(regionId, category, count) {
        set((s) => {
          const filtered = s.visits.filter(
            (v) => !(v.regionId === regionId && v.category === category),
          );
          if (count <= 0) return { visits: filtered };
          return {
            visits: [
              ...filtered,
              { regionId, category, count, updatedAt: Date.now() },
            ],
          };
        });
      },

      removeVisit(regionId, category) {
        set((s) => ({
          visits: s.visits.filter(
            (v) => !(v.regionId === regionId && v.category === category),
          ),
        }));
      },

      quickIncrement(regionId) {
        const { visits, upsertVisit } = get();
        const next = getNextIncrement(visits, regionId);
        if (next) upsertVisit(regionId, next.category, next.newCount);
      },

      getScore(regionId) {
        const { visits } = get();
        return getRegionScore(regionId, visits);
      },

      getFullScore(regionId, allRegions, parentIdMap, memo, overrideVisits) {
        const visits = overrideVisits ?? get().visits;
        return getRegionScore(regionId, visits, allRegions, parentIdMap, memo);
      },
    }),
    {
      name: "regionevel-visits",
      version: 1,
    },
  ),
);

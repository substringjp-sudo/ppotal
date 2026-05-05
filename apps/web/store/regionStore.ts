"use client";

import { create } from "zustand";
import type { Region } from "@regionevel/types";
import { padId } from "@regionevel/utils";

interface RegionState {
  regions: Record<string, Region>;
  addRegions: (newRegions: Region[]) => void;
  getRegionById: (id: string) => Region | undefined;
  getRegionsList: () => Region[];
}

export const useRegionStore = create<RegionState>((set, get) => ({
  regions: {},

  addRegions: (newRegions) => {
    set((state) => {
      const updatedRegions = { ...state.regions };
      let hasChange = false;

      for (const r of newRegions) {
        const id = padId(r.id);
        if (!updatedRegions[id]) {
          updatedRegions[id] = r;
          hasChange = true;
        }
      }

      return hasChange ? { regions: updatedRegions } : state;
    });
  },

  getRegionById: (id) => {
    return get().regions[padId(id)];
  },

  getRegionsList: () => {
    return Object.values(get().regions);
  },
}));

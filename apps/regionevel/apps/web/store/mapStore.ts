"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { padId } from "@regionevel/utils";

type MapLevel = "world" | "country" | "prefecture";

interface MapState {
  level: MapLevel;
  currentId: string | null;
  history: Array<{ level: MapLevel; currentId: string | null }>;
  /** Bumped to ask the map to open the share card, which owns the boundary data. */
  shareRequested: number;
  viewLevel: 1 | 2;
  selectedId: string | null;
  isDrawMode: boolean;
}

interface MapActions {
  setLevel: (level: MapLevel) => void;
  setCurrentId: (id: string | null) => void;
  setHistory: (history: Array<{ level: MapLevel; currentId: string | null }>) => void;
  setViewLevel: (viewLevel: 1 | 2) => void;
  setSelectedId: (id: string | null) => void;
  setIsDrawMode: (isDrawMode: boolean) => void;
  toggleDrawMode: () => void;
  drillDown: (level: MapLevel, id: string) => void;
  drillUp: () => void;
  reset: () => void;
  requestShare: () => void;
  jumpToRegion: (id: string, allRegions: any[]) => void;
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set, get) => ({
      level: "world",
      currentId: null,
      history: [],
      shareRequested: 0,
      viewLevel: 1,
      selectedId: null,
      isDrawMode: false,

      setLevel: (level) => set({ level }),
      setCurrentId: (currentId) => set({ currentId }),
      setHistory: (history) => set({ history }),
      setViewLevel: (viewLevel) => set({ viewLevel }),
      setSelectedId: (selectedId) => set({ selectedId }),
      setIsDrawMode: (isDrawMode) => set({ isDrawMode }),
      toggleDrawMode: () => set((state) => ({ isDrawMode: !state.isDrawMode })),

      drillDown: (newLevel, id) => {
        const { level, currentId, history } = get();
        set({
          level: newLevel,
          currentId: id,
          history: [...history, { level, currentId }],
        });
      },

      drillUp: () => {
        const { history } = get();
        if (history.length === 0) return;
        const last = history[history.length - 1];
        if (!last) return;
        set({
          level: last.level,
          currentId: last.currentId,
          history: history.slice(0, -1),
          viewLevel: 1, // Reset viewLevel to 1 when moving up
          selectedId: null,
        });
      },

      reset: () => set({ level: "world", currentId: null, history: [], viewLevel: 1, selectedId: null }),
      requestShare: () => set((state) => ({ shareRequested: state.shareRequested + 1 })),

      jumpToRegion: (id, allRegions) => {
        // padId from @regionevel/utils, not a local one. This used to pad to
        // 6 digits while the rest of the app pads to 3/7/12, so the key it
        // built for a region did not match the key anything else used.
        const targetId = padId(id);
        const region = allRegions.find(r => padId(r.id) === targetId);
        if (!region) return;

        if (region.admLevel === 0) {
          set({
            level: "country",
            currentId: region.id,
            history: [{ level: "world", currentId: null }],
            viewLevel: 1,
            selectedId: null
          });
        } else if (region.admLevel === 1) {
          const parentId = region.parentId;
          set({
            level: "prefecture",
            currentId: region.id,
            history: [
              { level: "world", currentId: null },
              { level: "country", currentId: parentId }
            ],
            viewLevel: 1,
            selectedId: region.id
          });
        } else if (region.admLevel === 2) {
          const prefectureId = region.parentId;
          const prefecture = allRegions.find(r => padId(r.id) === padId(prefectureId));
          const countryId = prefecture ? prefecture.parentId : null;
          
          set({
            level: "prefecture",
            currentId: prefectureId,
            history: [
              { level: "world", currentId: null },
              { level: "country", currentId: countryId }
            ],
            viewLevel: 2,
            selectedId: region.id
          });
        }
      },
    }),
    {
      name: "regionevel-map-state",
      /**
       * Where the user was, but not what they were in the middle of doing.
       * Transient counters or active modes are omitted so reloads start fresh.
       */
      partialize: (state) => ({
        level: state.level,
        currentId: state.currentId,
        history: state.history,
        viewLevel: state.viewLevel,
        selectedId: state.selectedId,
      }),
    },
  ),
);

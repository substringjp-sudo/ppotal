"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type MapLevel = "world" | "country" | "prefecture";

interface MapState {
  level: MapLevel;
  currentId: string | null;
  history: Array<{ level: MapLevel; currentId: string | null }>;
  exportRequested: number;
  viewLevel: 1 | 2;
  selectedId: string | null;
}

interface MapActions {
  setLevel: (level: MapLevel) => void;
  setCurrentId: (id: string | null) => void;
  setHistory: (history: Array<{ level: MapLevel; currentId: string | null }>) => void;
  setViewLevel: (viewLevel: 1 | 2) => void;
  setSelectedId: (id: string | null) => void;
  drillDown: (level: MapLevel, id: string) => void;
  drillUp: () => void;
  reset: () => void;
  requestExport: () => void;
  jumpToRegion: (id: string, allRegions: any[]) => void;
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set, get) => ({
      level: "world",
      currentId: null,
      history: [],
      exportRequested: 0,
      viewLevel: 1,
      selectedId: null,

      setLevel: (level) => set({ level }),
      setCurrentId: (currentId) => set({ currentId }),
      setHistory: (history) => set({ history }),
      setViewLevel: (viewLevel) => set({ viewLevel }),
      setSelectedId: (selectedId) => set({ selectedId }),

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
      requestExport: () => set((state) => ({ exportRequested: state.exportRequested + 1 })),

      jumpToRegion: (id, allRegions) => {
        const padId = (val: any) => {
          if (!val) return "";
          return String(val).padStart(6, '0');
        };
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
    },
  ),
);

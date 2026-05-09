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
}

interface MapActions {
  setLevel: (level: MapLevel) => void;
  setCurrentId: (id: string | null) => void;
  setHistory: (history: Array<{ level: MapLevel; currentId: string | null }>) => void;
  setViewLevel: (viewLevel: 1 | 2) => void;
  drillDown: (level: MapLevel, id: string) => void;
  drillUp: () => void;
  reset: () => void;
  requestExport: () => void;
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set, get) => ({
      level: "world",
      currentId: null,
      history: [],
      exportRequested: 0,
      viewLevel: 1,

      setLevel: (level) => set({ level }),
      setCurrentId: (currentId) => set({ currentId }),
      setHistory: (history) => set({ history }),
      setViewLevel: (viewLevel) => set({ viewLevel }),

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
        });
      },

      reset: () => set({ level: "world", currentId: null, history: [], viewLevel: 1 }),
      requestExport: () => set((state) => ({ exportRequested: state.exportRequested + 1 })),
    }),
    {
      name: "regionevel-map-state",
    },
  ),
);

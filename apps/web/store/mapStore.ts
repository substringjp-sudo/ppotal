"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type MapLevel = "world" | "country" | "prefecture";

interface MapState {
  level: MapLevel;
  currentId: string | null;
  history: Array<{ level: MapLevel; currentId: string | null }>;
}

interface MapActions {
  setLevel: (level: MapLevel) => void;
  setCurrentId: (id: string | null) => void;
  setHistory: (history: Array<{ level: MapLevel; currentId: string | null }>) => void;
  drillDown: (level: MapLevel, id: string) => void;
  drillUp: () => void;
  reset: () => void;
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set, get) => ({
      level: "world",
      currentId: null,
      history: [],

      setLevel: (level) => set({ level }),
      setCurrentId: (currentId) => set({ currentId }),
      setHistory: (history) => set({ history }),

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
        });
      },

      reset: () => set({ level: "world", currentId: null, history: [] }),
    }),
    {
      name: "regionevel-map-state",
    },
  ),
);

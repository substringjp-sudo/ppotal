import { create } from 'zustand';
import { TripEvent } from '../types/trip';

interface UIState {
    editingEvent: { dayIdx: number; event?: Partial<TripEvent> } | null;
    isWishlistOpen: boolean;
    viewMode: 'timeline' | 'map' | 'gantt';
    showOnlyBooked: boolean;
    activeDayIdx: number;
    isMapPlanningMode: boolean;
    mapInsertAfterIndex: number | null;
    
    setEditingEvent: (value: { dayIdx: number; event?: Partial<TripEvent> } | null) => void;
    setIsWishlistOpen: (value: boolean) => void;
    setViewMode: (mode: 'timeline' | 'map' | 'gantt') => void;
    setShowOnlyBooked: (show: boolean) => void;
    setActiveDayIdx: (idx: number) => void;
    setIsMapPlanningMode: (value: boolean) => void;
    setMapInsertAfterIndex: (idx: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    editingEvent: null,
    isWishlistOpen: false,
    viewMode: 'timeline',
    showOnlyBooked: false,
    activeDayIdx: 0,
    isMapPlanningMode: false,
    mapInsertAfterIndex: null,
    
    setEditingEvent: (value) => set({ editingEvent: value }),
    setIsWishlistOpen: (value) => set({ isWishlistOpen: value }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setShowOnlyBooked: (show) => set({ showOnlyBooked: show }),
    setActiveDayIdx: (idx) => set({ activeDayIdx: idx }),
    setIsMapPlanningMode: (value) => set({ isMapPlanningMode: value, mapInsertAfterIndex: null }), // Reset insert index when toggling mode
    setMapInsertAfterIndex: (idx) => set({ mapInsertAfterIndex: idx }),
}));

import { TripEvent } from '../types/trip';
interface UIState {
    editingEvent: {
        dayIdx: number;
        event?: Partial<TripEvent>;
    } | null;
    isWishlistOpen: boolean;
    viewMode: 'timeline' | 'map' | 'gantt';
    showOnlyBooked: boolean;
    activeDayIdx: number;
    isMapPlanningMode: boolean;
    mapInsertAfterIndex: number | null;
    setEditingEvent: (value: {
        dayIdx: number;
        event?: Partial<TripEvent>;
    } | null) => void;
    setIsWishlistOpen: (value: boolean) => void;
    setViewMode: (mode: 'timeline' | 'map' | 'gantt') => void;
    setShowOnlyBooked: (show: boolean) => void;
    setActiveDayIdx: (idx: number) => void;
    setIsMapPlanningMode: (value: boolean) => void;
    setMapInsertAfterIndex: (idx: number | null) => void;
}
export declare const useUIStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UIState>>;
export {};

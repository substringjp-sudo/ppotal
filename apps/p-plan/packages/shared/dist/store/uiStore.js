"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUIStore = void 0;
const zustand_1 = require("zustand");
exports.useUIStore = (0, zustand_1.create)((set) => ({
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

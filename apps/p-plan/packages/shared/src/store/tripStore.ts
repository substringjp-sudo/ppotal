import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TripState } from './types';
import { createTripInfoSlice } from './slices/tripInfoSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createTransportSlice } from './slices/transportSlice';
import { createAccommodationSlice } from './slices/accommodationSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createReservationSlice } from './slices/reservationSlice';
import { createCommentSlice } from './slices/commentSlice';

// 플랫폼에 따른 스토리지 엔진 선택 (웹: localStorage, 모바일: AsyncStorage)
const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        // Obfuscate module name to prevent static build-time resolution by Webpack/Turbopack
        const moduleName = '@react-native-async-storage/' + 'async-storage';
        const AsyncStorage = require(moduleName).default;
        return AsyncStorage;
    } catch (e) {
        return undefined;
    }
};

export const useTripStore = create<TripState>()(
    persist(
        (...a) => ({
            ...createTripInfoSlice(...a),
            ...createBudgetSlice(...a),
            ...createTransportSlice(...a),
            ...createAccommodationSlice(...a),
            ...createTimelineSlice(...a),
            ...createReservationSlice(...a),
            ...createCommentSlice(...a),
        }),
        { 
            name: 'trip-storage',
            storage: createJSONStorage(() => getStorage()),
            partialize: (state) => ({ 
                trips: state.trips,
                currentTrip: state.currentTrip 
            }),
        }
    )
);

// Helper for selectors if needed
export const useCurrentTrip = () => useTripStore((state) => state.currentTrip);

import { produce } from 'immer';
import { Trip } from '../types/trip';
import { TripState } from './types';
import { syncTripData } from './sync-utils';
import { validateTrip } from '../lib/trip-validator';
import { useUserStore } from './userStore';

/**
 * currentTrip의 상태를 업데이트하는 공통 유틸리티 함수입니다.
 * null 체크, 데이터 동기화(syncTripData), 및 자동 유효성 검사(validateTrip)를 통합하여 
 * 원자적이고 일관된 상태 업데이트를 보장합니다.
 */
export const updateTripState = (
    set: (fn: (state: TripState) => Partial<TripState>) => void,
    get: () => TripState,
    updateFn: (trip: Trip) => void | Partial<Trip>
) => {
    const state = get();
    const trip = state.currentTrip;
    // Immer Hardening: Ensure we don't pass a Promise to produce
    if (!trip || (trip as any) instanceof Promise || typeof (trip as any).then === 'function') {
        console.warn("[PPLANER] updateTripState: trip is null or a Promise. Skipping update.", trip);
        return;
    }

    // Use immer produce for safer nested updates
    const nextTrip = produce(trip, (draft) => {
        const result = updateFn(draft as Trip);

        // Immer Hardening: Detect if the recipe returned a Promise (async function passed to produce)
        if (result instanceof Promise || (result && typeof (result as any).then === 'function')) {
            console.error("[PPLANER] updateTripState: recipe returned a Promise. Immer recipes MUST be synchronous.");
            return;
        }
        
        // If the function returns an object, we merge it manually (classic behavior compatibility)
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            Object.assign(draft, result);
        }

        // Seamless Data Synchronization
        syncTripData(draft as Trip);

        // Atomic Validation: Update warnings alongside data changes
        const travelStyle = useUserStore.getState().profile?.travelStyle;
        const warnings = validateTrip(draft as Trip, state.geometries, travelStyle);
        draft.warnings = warnings;
    });

    set((state) => ({
        currentTrip: nextTrip,
        trips: state.trips.map(t => t.id === nextTrip.id ? nextTrip : t)
    }));

    // Seamless Background Synchronization
    const userId = useUserStore.getState().profile?.userId;
    if (userId && nextTrip) {
        // dynamic import to avoid circular dependency
        import('../lib/tripService').then(({ updateTripInDb }) => {
            // Background call, do not await
            updateTripInDb(nextTrip.id, nextTrip)
                .catch(err => console.error("[PPLANER] Background sync failed:", err));
        }).catch(err => console.error("[PPLANER] Failed to load tripService for sync:", err));
    }
};

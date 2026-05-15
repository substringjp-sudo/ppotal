"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTripState = void 0;
const immer_1 = require("immer");
const sync_utils_1 = require("./sync-utils");
const trip_validator_1 = require("../lib/trip-validator");
const userStore_1 = require("./userStore");
/**
 * currentTrip의 상태를 업데이트하는 공통 유틸리티 함수입니다.
 * null 체크, 데이터 동기화(syncTripData), 및 자동 유효성 검사(validateTrip)를 통합하여
 * 원자적이고 일관된 상태 업데이트를 보장합니다.
 */
const updateTripState = (set, get, updateFn) => {
    const state = get();
    const trip = state.currentTrip;
    if (!trip)
        return;
    // Use immer produce for safer nested updates
    const nextTrip = (0, immer_1.produce)(trip, (draft) => {
        const result = updateFn(draft);
        // If the function returns an object, we merge it manually (classic behavior compatibility)
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            Object.assign(draft, result);
        }
        // Seamless Data Synchronization
        (0, sync_utils_1.syncTripData)(draft);
        // Atomic Validation: Update warnings alongside data changes
        const travelStyle = userStore_1.useUserStore.getState().profile?.travelStyle;
        const warnings = (0, trip_validator_1.validateTrip)(draft, state.geometries, travelStyle);
        draft.warnings = warnings;
    });
    set(() => ({
        currentTrip: nextTrip
    }));
};
exports.updateTripState = updateTripState;

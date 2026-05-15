"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCurrentTrip = exports.useTripStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const tripInfoSlice_1 = require("./slices/tripInfoSlice");
const budgetSlice_1 = require("./slices/budgetSlice");
const transportSlice_1 = require("./slices/transportSlice");
const accommodationSlice_1 = require("./slices/accommodationSlice");
const timelineSlice_1 = require("./slices/timelineSlice");
const reservationSlice_1 = require("./slices/reservationSlice");
const commentSlice_1 = require("./slices/commentSlice");
// 플랫폼에 따른 스토리지 엔진 선택 (웹: localStorage, 모바일: AsyncStorage)
const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        // React Native 환경에서는 호출 시점에 AsyncStorage를 가져옴 (호환성 유지)
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return AsyncStorage;
    }
    catch (e) {
        return undefined;
    }
};
exports.useTripStore = (0, zustand_1.create)()((0, middleware_1.persist)((...a) => ({
    ...(0, tripInfoSlice_1.createTripInfoSlice)(...a),
    ...(0, budgetSlice_1.createBudgetSlice)(...a),
    ...(0, transportSlice_1.createTransportSlice)(...a),
    ...(0, accommodationSlice_1.createAccommodationSlice)(...a),
    ...(0, timelineSlice_1.createTimelineSlice)(...a),
    ...(0, reservationSlice_1.createReservationSlice)(...a),
    ...(0, commentSlice_1.createCommentSlice)(...a),
}), {
    name: 'trip-storage',
    storage: (0, middleware_1.createJSONStorage)(() => getStorage()),
    partialize: (state) => ({
        trips: state.trips,
        currentTrip: state.currentTrip
    }),
}));
// Helper for selectors if needed
const useCurrentTrip = () => (0, exports.useTripStore)((state) => state.currentTrip);
exports.useCurrentTrip = useCurrentTrip;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservationSlice = void 0;
const common_1 = require("../../types/common");
const utils_1 = require("../utils");
const createReservationSlice = (set, get) => ({
    addReservation: (reservation) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const id = (0, common_1.generateId)();
        draft.reservations.push({ id, ...reservation });
        // Auto-create timeline event
        if (reservation.date) {
            const dayIndex = draft.dailyTimeline.findIndex(d => d.date === reservation.date);
            if (dayIndex !== -1) {
                draft.dailyTimeline[dayIndex].events.push({
                    id: (0, common_1.generateId)(),
                    title: reservation.title,
                    type: 'sightseeing',
                    startTime: reservation.time,
                    location: { name: reservation.location },
                    isFixedTime: !!reservation.time,
                    memo: `예약 관리자에서 자동 생성됨 (${reservation.status})`
                });
            }
        }
    }),
    updateReservation: (id, updates) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const reservation = draft.reservations.find(r => r.id === id);
        if (reservation) {
            Object.assign(reservation, updates);
        }
    }),
    removeReservation: (id) => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.reservations = draft.reservations.filter(r => r.id !== id);
    })
});
exports.createReservationSlice = createReservationSlice;

import { generateId } from '../../types/common';
import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { updateTripState } from '../utils';

export interface ReservationSlice {
    addReservation: (reservation: Omit<import('../../types/trip').Reservation, 'id'>) => void;
    updateReservation: (id: string, updates: Partial<import('../../types/trip').Reservation>) => void;
    removeReservation: (id: string) => void;
}

export const createReservationSlice: StateCreator<TripState, [], [], ReservationSlice> = (set, get) => ({
    addReservation: (reservation) => updateTripState(set, get, (draft) => {
        const id = generateId();
        draft.reservations.push({ id, ...reservation } as import('../../types/trip').Reservation);

        // Auto-create timeline event
        if (reservation.date) {
            const dayIndex = draft.dailyTimeline.findIndex(d => d.date === reservation.date);
            if (dayIndex !== -1) {
                draft.dailyTimeline[dayIndex].events.push({
                    id: generateId(),
                    title: reservation.title,
                    type: 'sightseeing',
                    startTime: reservation.time,
                    location: { name: reservation.location },
                    isFixedTime: !!reservation.time,
                    memo: `예약 관리자에서 자동 생성됨 (${reservation.status})`
                } as import('../../types/trip').TripEvent);
            }
        }
    }),

    updateReservation: (id, updates) => updateTripState(set, get, (draft) => {
        const reservation = draft.reservations.find(r => r.id === id);
        if (reservation) {
            Object.assign(reservation, updates);
        }
    }),

    removeReservation: (id) => updateTripState(set, get, (draft) => {
        draft.reservations = draft.reservations.filter(r => r.id !== id);
    })
});

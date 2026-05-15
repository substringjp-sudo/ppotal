import { StateCreator } from 'zustand';
import { TripState } from '../types';
export interface ReservationSlice {
    addReservation: (reservation: Omit<import('../../types/trip').Reservation, 'id'>) => void;
    updateReservation: (id: string, updates: Partial<import('../../types/trip').Reservation>) => void;
    removeReservation: (id: string) => void;
}
export declare const createReservationSlice: StateCreator<TripState, [], [], ReservationSlice>;

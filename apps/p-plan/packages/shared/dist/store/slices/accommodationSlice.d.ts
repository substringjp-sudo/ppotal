import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { AccommodationSegment } from '../../types/trip';
export interface AccommodationSlice {
    addAccommodation: (data: Partial<AccommodationSegment>) => Promise<void>;
    updateAccommodation: (id: string, updates: Partial<AccommodationSegment>) => Promise<void>;
    removeAccommodation: (id: string) => void;
}
export declare const createAccommodationSlice: StateCreator<TripState, [], [], AccommodationSlice>;

import { generateId } from '../../types/common';
import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { AccommodationSegment } from '../../types/trip';
import { resolveRegionIdsFromLocation } from '../../lib/region-service';
import { updateTripState } from '../utils';

export interface AccommodationSlice {
    addAccommodation: (data: Partial<AccommodationSegment>) => Promise<void>;
    updateAccommodation: (id: string, updates: Partial<AccommodationSegment>) => Promise<void>;
    removeAccommodation: (id: string) => void;
}

export const createAccommodationSlice: StateCreator<TripState, [], [], AccommodationSlice> = (set, get) => ({
    addAccommodation: async (data) => {
        const ids = await resolveRegionIdsFromLocation(data.location, data.lat, data.lng);
        
        updateTripState(set, get, (draft) => {
            const newAcc: AccommodationSegment = {
                id: generateId(),
                name: '',
                location: '',
                startDate: draft.dates.startDate,
                endDate: draft.dates.endDate,
                color: 'primary',
                status: 'tentative',
                type: 'hotel',
                ...data,
                ...ids
            } as AccommodationSegment;
            
            draft.accommodation.push(newAcc);
        });
    },

    updateAccommodation: async (id, updates) => {
        // Prepare resolved IDs if relevant fields updated
        const ids = (updates.location || (updates.lat !== undefined && updates.lng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.location, updates.lat, updates.lng)
            : null;

        updateTripState(set, get, (draft) => {
            const acc = draft.accommodation.find(a => a.id === id);
            if (!acc) return;

            Object.assign(acc, updates);
            if (ids) {
                Object.assign(acc, ids);
            }
        });
    },

    removeAccommodation: (id) => updateTripState(set, get, (draft) => {
        draft.accommodation = draft.accommodation.filter(a => a.id !== id);
    })
});

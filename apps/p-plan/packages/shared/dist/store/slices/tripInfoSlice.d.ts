import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { Trip } from '../../types/trip';
import { WizardState } from '../wizardStore';
import { type GeoJSONGeometry } from '../../lib/geometry-service';
export interface TripInfoSlice {
    trips: Trip[];
    currentTrip: Trip | null;
    isSaving: boolean;
    geometries: Record<string, GeoJSONGeometry>;
    setTrips: (trips: Trip[]) => void;
    setCurrentTrip: (trip: Trip | null) => void;
    setIsSaving: (isSaving: boolean) => void;
    addTrip: (trip: Trip) => void;
    deleteTrip: (id: string) => void;
    createTrip: (wizardData: WizardState, userId?: string, userProfile?: import('../../types/user').UserProfile | null) => Promise<string | void>;
    updateTrip: (updates: Partial<Trip>) => Promise<void>;
    updateChecklistItem: (id: string, updates: Partial<import('../../types/trip').ChecklistItem>) => void;
    addChecklistItem: (item: {
        title: string;
        tags?: string[];
    }) => void;
    removeChecklistItem: (id: string) => void;
    addBucketListItem: (item: Omit<import('../../types/trip').BucketListItem, 'id'>) => void;
    updateBucketListItem: (id: string, updates: Partial<import('../../types/trip').BucketListItem>) => void;
    removeBucketListItem: (id: string) => void;
    addParticipant: (participant: Omit<import('../../types/trip').Participant, 'id'>) => void;
    removeParticipant: (id: string) => void;
    updateParticipant: (id: string, updates: Partial<import('../../types/trip').Participant>) => void;
    validateTrip: () => void;
    loadGeometries: () => Promise<void>;
    fetchTrip: (id: string) => Promise<void>;
}
export declare const createTripInfoSlice: StateCreator<TripState, [], [], TripInfoSlice>;

import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { FlightSegment, DrivingSegment, PublicTransportSegment, TransportReservation, Trip } from '../../types/trip';
export interface TransportSlice {
    updateTransportSettings: (settings: Partial<Trip['transportSettings']>) => void;
    addFlight: (type: 'outbound' | 'inbound' | 'other') => void;
    updateFlight: (id: string, updates: Partial<FlightSegment>) => Promise<void>;
    removeFlight: (id: string) => void;
    addDriving: () => void;
    updateDriving: (id: string, updates: Partial<DrivingSegment>) => Promise<void>;
    removeDriving: (id: string) => void;
    addPublicTransport: () => void;
    updatePublicTransport: (id: string, updates: Partial<PublicTransportSegment>) => Promise<void>;
    removePublicTransport: (id: string) => void;
    addTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string) => void;
    updateTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string, resId: string, updates: Partial<TransportReservation>) => void;
    removeTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string, resId: string) => void;
}
export declare const createTransportSlice: StateCreator<TripState, [], [], TransportSlice>;

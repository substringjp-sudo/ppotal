import { create } from 'zustand';
import { produce } from 'immer';
import { RegionIds } from '../types/common';

export type WizardStep = 'DATES' | 'LOCATION' | 'PREFERENCES' | 'REVIEW';

export interface WizardState {
    isOpen: boolean;
    currentStep: WizardStep;
    steps: WizardStep[];
    mode: 'PLAN' | 'RECORD';

    // Form values
    startDate: string;
    endDate: string;
    flexibility: number;
    isDateUndecided: boolean;
    durationDays: number;
    isFlexDays: boolean;

    locations: string[];
    locationDetails: { name: string; regionIds?: RegionIds }[];
    isLocationUndecided: boolean;

    participants: { type: string; count: number }[];
    isParticipantsUndecided: boolean;


    theme: string;
    titleSuggestion: string;
    tripId?: string;

    // Budget & Preferences
    isBudgetUnlimited: boolean;
    budgetType: 'TOTAL' | 'PER_PERSON';
    amount: number;
    excludeFlight: boolean;
    excludeHotel: boolean;


    // Actions
    open: (mode?: 'PLAN' | 'RECORD') => void;
    close: () => void;
    next: () => void;
    prev: () => void;
    setDates: (start: string, end: string, flex?: number) => void;
    setDateUndecided: (undecided: boolean) => void;
    setDuration: (days: number) => void;
    setFlexDays: (flex: boolean) => void;
    setLocations: (locs: string[]) => void;
    setLocationUndecided: (undecided: boolean) => void;
    updateParticipant: (type: string, count: number) => void;
    setParticipantsUndecided: (undecided: boolean) => void;
    addLocation: (location: string, regionIds?: RegionIds) => void;
    removeLocation: (location: string) => void;
    clearLocations: () => void;
    setTheme: (theme: string) => void;
    setTitleSuggestion: (title: string) => void;
    setBudgetData: (data: { isUnlimited: boolean; type: 'TOTAL' | 'PER_PERSON'; amount: number }) => void;
    setTransportPreferences: (prefs: { excludeFlight: boolean; excludeHotel: boolean }) => void;
    setTripId: (id: string | undefined) => void;
    reset: () => void;
}

import { persist } from 'zustand/middleware';

export const useWizardStore = create<WizardState>()(
    persist(
        (set, get) => ({
            isOpen: false,
            currentStep: 'DATES',
            steps: ['DATES', 'LOCATION', 'PREFERENCES', 'REVIEW'],
            mode: 'PLAN',

            startDate: '',
            endDate: '',
            flexibility: 2,
            isDateUndecided: false,
            durationDays: 3,
            isFlexDays: false,

            locations: [],
            locationDetails: [],
            isLocationUndecided: false,

            participants: [{ type: '나', count: 1 }],
            isParticipantsUndecided: false,


            theme: '관광',
            titleSuggestion: '',
            tripId: undefined,

            isBudgetUnlimited: true,
            budgetType: 'TOTAL',
            amount: 0,
            excludeFlight: false,
            excludeHotel: false,


            open: (mode = 'PLAN') => {
                get().reset();
                set({ isOpen: true, mode });
            },
            close: () => set({ isOpen: false }),
            reset: () => set({
                currentStep: 'DATES',
                startDate: '',
                endDate: '',
                flexibility: 2,
                isDateUndecided: false,
                durationDays: 3,
                isFlexDays: false,
                locations: [],
                locationDetails: [],
                isLocationUndecided: false,
                participants: [{ type: '나', count: 1 }],
                isParticipantsUndecided: false,
                theme: '관광',
                titleSuggestion: '',
                tripId: undefined,
                isBudgetUnlimited: true,
                budgetType: 'TOTAL',
                amount: 0,
                excludeFlight: false,
                excludeHotel: false,
                mode: 'PLAN',
            }),
            next: () => set(produce((state: WizardState) => {
                const currentIndex = state.steps.indexOf(state.currentStep);
                if (currentIndex < state.steps.length - 1) {
                    state.currentStep = state.steps[currentIndex + 1];
                }
            })),
            prev: () => set(produce((state: WizardState) => {
                const currentIndex = state.steps.indexOf(state.currentStep);
                if (currentIndex > 0) {
                    state.currentStep = state.steps[currentIndex - 1];
                }
            })),
            setDates: (start, end, flex) => set((state) => ({ 
                startDate: start, 
                endDate: end, 
                flexibility: flex !== undefined ? flex : state.flexibility 
            })),
            setDateUndecided: (undecided) => set({ isDateUndecided: undecided }),
            setDuration: (days) => set({ durationDays: days }),
            setFlexDays: (flex) => set({ isFlexDays: flex, ...(flex ? { flexibility: 3 } : { flexibility: 0 }) }),
            setLocations: (locs) => set({ locations: locs, locationDetails: locs.map(l => ({ name: l })) }),
            setLocationUndecided: (undecided) => set({ isLocationUndecided: undecided }),
            updateParticipant: (type, count) => set(produce((state: WizardState) => {
                const participant = state.participants.find(p => p.type === type);
                if (participant) {
                    participant.count = count;
                } else {
                    state.participants.push({ type, count });
                }
            })),
            setParticipantsUndecided: (undecided) => set({ isParticipantsUndecided: undecided }),
            addLocation: (location, regionIds) => set(produce((state: WizardState) => {
                if (state.locations.length < 5 && !state.locations.includes(location)) {
                    state.locations.push(location);
                    state.locationDetails.push({ name: location, regionIds });
                }
            })),
            removeLocation: (location) => set((state) => ({
                locations: state.locations.filter(l => l !== location),
                locationDetails: state.locationDetails.filter(ld => ld.name !== location)
            })),
            clearLocations: () => set({ locations: [], locationDetails: [] }),
            setTheme: (theme) => set({ theme }),
            setTitleSuggestion: (title) => set({ titleSuggestion: title }),
            setBudgetData: (data) => set({ 
                isBudgetUnlimited: data.isUnlimited, 
                budgetType: data.type, 
                amount: data.amount 
            }),
            setTransportPreferences: (prefs) => set({ 
                excludeFlight: prefs.excludeFlight, 
                excludeHotel: prefs.excludeHotel 
            }),
            setTripId: (id) => set({ tripId: id }),
        }),
        {
            name: 'pplaner-wizard-storage',
            partialize: (state) => {
                const { isOpen, ...rest } = state;
                return rest;
            },
        }
    )
);




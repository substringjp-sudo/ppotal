import { RegionIds } from '../types/common';
export type WizardStep = 'DATES' | 'LOCATION' | 'PREFERENCES' | 'REVIEW';
export interface WizardState {
    isOpen: boolean;
    currentStep: WizardStep;
    steps: WizardStep[];
    mode: 'PLAN' | 'RECORD';
    startDate: string;
    endDate: string;
    flexibility: number;
    isDateUndecided: boolean;
    durationDays: number;
    isFlexDays: boolean;
    locations: string[];
    locationDetails: {
        name: string;
        regionIds?: RegionIds;
    }[];
    isLocationUndecided: boolean;
    participants: {
        type: string;
        count: number;
    }[];
    isParticipantsUndecided: boolean;
    theme: string;
    titleSuggestion: string;
    tripId?: string;
    isBudgetUnlimited: boolean;
    budgetType: 'TOTAL' | 'PER_PERSON';
    amount: number;
    excludeFlight: boolean;
    excludeHotel: boolean;
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
    setBudgetData: (data: {
        isUnlimited: boolean;
        type: 'TOTAL' | 'PER_PERSON';
        amount: number;
    }) => void;
    setTransportPreferences: (prefs: {
        excludeFlight: boolean;
        excludeHotel: boolean;
    }) => void;
    setTripId: (id: string | undefined) => void;
    reset: () => void;
}
export declare const useWizardStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WizardState>, "setState" | "persist"> & {
    setState(partial: WizardState | Partial<WizardState> | ((state: WizardState) => WizardState | Partial<WizardState>), replace?: false | undefined): unknown;
    setState(state: WizardState | ((state: WizardState) => WizardState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WizardState, {
            currentStep: WizardStep;
            steps: WizardStep[];
            mode: "PLAN" | "RECORD";
            startDate: string;
            endDate: string;
            flexibility: number;
            isDateUndecided: boolean;
            durationDays: number;
            isFlexDays: boolean;
            locations: string[];
            locationDetails: {
                name: string;
                regionIds?: RegionIds;
            }[];
            isLocationUndecided: boolean;
            participants: {
                type: string;
                count: number;
            }[];
            isParticipantsUndecided: boolean;
            theme: string;
            titleSuggestion: string;
            tripId?: string;
            isBudgetUnlimited: boolean;
            budgetType: "TOTAL" | "PER_PERSON";
            amount: number;
            excludeFlight: boolean;
            excludeHotel: boolean;
            open: (mode?: "PLAN" | "RECORD") => void;
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
            setBudgetData: (data: {
                isUnlimited: boolean;
                type: "TOTAL" | "PER_PERSON";
                amount: number;
            }) => void;
            setTransportPreferences: (prefs: {
                excludeFlight: boolean;
                excludeHotel: boolean;
            }) => void;
            setTripId: (id: string | undefined) => void;
            reset: () => void;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WizardState) => void) => () => void;
        onFinishHydration: (fn: (state: WizardState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WizardState, {
            currentStep: WizardStep;
            steps: WizardStep[];
            mode: "PLAN" | "RECORD";
            startDate: string;
            endDate: string;
            flexibility: number;
            isDateUndecided: boolean;
            durationDays: number;
            isFlexDays: boolean;
            locations: string[];
            locationDetails: {
                name: string;
                regionIds?: RegionIds;
            }[];
            isLocationUndecided: boolean;
            participants: {
                type: string;
                count: number;
            }[];
            isParticipantsUndecided: boolean;
            theme: string;
            titleSuggestion: string;
            tripId?: string;
            isBudgetUnlimited: boolean;
            budgetType: "TOTAL" | "PER_PERSON";
            amount: number;
            excludeFlight: boolean;
            excludeHotel: boolean;
            open: (mode?: "PLAN" | "RECORD") => void;
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
            setBudgetData: (data: {
                isUnlimited: boolean;
                type: "TOTAL" | "PER_PERSON";
                amount: number;
            }) => void;
            setTransportPreferences: (prefs: {
                excludeFlight: boolean;
                excludeHotel: boolean;
            }) => void;
            setTripId: (id: string | undefined) => void;
            reset: () => void;
        }, unknown>>;
    };
}>;

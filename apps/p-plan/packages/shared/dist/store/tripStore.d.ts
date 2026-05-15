import { TripState } from './types';
export declare const useTripStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<TripState>, "setState" | "persist"> & {
    setState(partial: TripState | Partial<TripState> | ((state: TripState) => TripState | Partial<TripState>), replace?: false | undefined): unknown;
    setState(state: TripState | ((state: TripState) => TripState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<TripState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: TripState) => void) => () => void;
        onFinishHydration: (fn: (state: TripState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<TripState, unknown, unknown>>;
    };
}>;
export declare const useCurrentTrip: () => import("..").Trip | null;

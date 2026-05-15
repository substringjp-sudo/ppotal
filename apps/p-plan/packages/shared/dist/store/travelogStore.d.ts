import { Travelog } from '../types/record';
interface TravelogState {
    travelogs: Travelog[];
    setTravelogs: (travelogs: Travelog[]) => void;
    addTravelog: (travelog: Travelog) => void;
    updateTravelog: (travelog: Travelog) => void;
    deleteTravelog: (id: string) => void;
    createTravelog: (wizardData: any, userId?: string, userProfile?: any) => Promise<string | void>;
}
export declare const useTravelogStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<TravelogState>, "setState" | "persist"> & {
    setState(partial: TravelogState | Partial<TravelogState> | ((state: TravelogState) => TravelogState | Partial<TravelogState>), replace?: false | undefined): unknown;
    setState(state: TravelogState | ((state: TravelogState) => TravelogState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<TravelogState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: TravelogState) => void) => () => void;
        onFinishHydration: (fn: (state: TravelogState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<TravelogState, unknown, unknown>>;
    };
}>;
export {};

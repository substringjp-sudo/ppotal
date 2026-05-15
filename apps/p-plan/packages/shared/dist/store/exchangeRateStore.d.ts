interface ExchangeRateState {
    rates: Record<string, number>;
    lastUpdated: string | null;
    isLoading: boolean;
    error: string | null;
    fetchRates: () => Promise<void>;
    getRate: (code: string) => number;
}
export declare const useExchangeRateStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ExchangeRateState>, "setState" | "persist"> & {
    setState(partial: ExchangeRateState | Partial<ExchangeRateState> | ((state: ExchangeRateState) => ExchangeRateState | Partial<ExchangeRateState>), replace?: false | undefined): unknown;
    setState(state: ExchangeRateState | ((state: ExchangeRateState) => ExchangeRateState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<ExchangeRateState, {
            rates: Record<string, number>;
            lastUpdated: string | null;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: ExchangeRateState) => void) => () => void;
        onFinishHydration: (fn: (state: ExchangeRateState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<ExchangeRateState, {
            rates: Record<string, number>;
            lastUpdated: string | null;
        }, unknown>>;
    };
}>;
export {};

export type WidgetId = 'summary' | 'action_items' | 'stats' | 'transportation' | 'accommodation' | 'budget' | 'checklist' | 'reservations' | 'map' | 'wishlist' | 'warnings';
export interface WidgetConfig {
    id: WidgetId;
    visible: boolean;
    colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    rowSpan: 1 | 2 | 3 | 4;
    order: number;
}
interface DashboardState {
    widgets: WidgetConfig[];
    isEditMode: boolean;
    setEditMode: (isEditMode: boolean) => void;
    updateWidget: (id: WidgetId, updates: Partial<WidgetConfig>) => void;
    reorderWidgets: (fromId: WidgetId, toId: WidgetId) => void;
    resetLayout: () => void;
}
export declare const useDashboardStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<DashboardState>, "setState" | "persist"> & {
    setState(partial: DashboardState | Partial<DashboardState> | ((state: DashboardState) => DashboardState | Partial<DashboardState>), replace?: false | undefined): unknown;
    setState(state: DashboardState | ((state: DashboardState) => DashboardState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<DashboardState, DashboardState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: DashboardState) => void) => () => void;
        onFinishHydration: (fn: (state: DashboardState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<DashboardState, DashboardState, unknown>>;
    };
}>;
export {};

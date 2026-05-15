import { WishlistItem } from '../types/wishlist';
interface WishlistState {
    items: WishlistItem[];
    addItem: (item: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
    addItems: (items: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
    updateItem: (id: string, updates: Partial<WishlistItem>) => void;
    updateItems: (ids: string[], updates: Partial<WishlistItem>) => void;
    deleteItem: (id: string) => void;
    deleteItems: (ids: string[]) => void;
    getItem: (id: string) => WishlistItem | undefined;
}
export declare const useWishlistStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WishlistState>, "setState" | "persist"> & {
    setState(partial: WishlistState | Partial<WishlistState> | ((state: WishlistState) => WishlistState | Partial<WishlistState>), replace?: false | undefined): unknown;
    setState(state: WishlistState | ((state: WishlistState) => WishlistState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WishlistState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WishlistState) => void) => () => void;
        onFinishHydration: (fn: (state: WishlistState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WishlistState, unknown, unknown>>;
    };
}>;
export {};

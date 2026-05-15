import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (itemData) => {
                const newItem: WishlistItem = {
                    ...itemData,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({
                    items: [newItem, ...state.items],
                }));
            },
            addItems: (itemsData) => {
                const now = new Date().toISOString();
                const newItems: WishlistItem[] = itemsData.map(item => ({
                    ...item,
                    id: crypto.randomUUID(),
                    createdAt: now,
                    updatedAt: now,
                }));
                set((state) => ({
                    items: [...newItems, ...state.items],
                }));
            },
            updateItem: (id, updates) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id
                            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                            : item
                    ),
                }));
            },
            updateItems: (ids, updates) => {
                const now = new Date().toISOString();
                set((state) => ({
                    items: state.items.map((item) =>
                        ids.includes(item.id)
                            ? { ...item, ...updates, updatedAt: now }
                            : item
                    ),
                }));
            },
            deleteItem: (id) => {
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                }));
            },
            deleteItems: (ids) => {
                set((state) => ({
                    items: state.items.filter((item) => !ids.includes(item.id)),
                }));
            },
            getItem: (id) => {
                return get().items.find((item) => item.id === id);
            },
        }),
        {
            name: 'pplan-wishlist-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

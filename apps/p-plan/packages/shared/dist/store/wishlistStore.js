"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWishlistStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useWishlistStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    items: [],
    addItem: (itemData) => {
        const newItem = {
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
        const newItems = itemsData.map(item => ({
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
            items: state.items.map((item) => item.id === id
                ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                : item),
        }));
    },
    updateItems: (ids, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
            items: state.items.map((item) => ids.includes(item.id)
                ? { ...item, ...updates, updatedAt: now }
                : item),
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
}), {
    name: 'pplan-wishlist-storage',
    storage: (0, middleware_1.createJSONStorage)(() => localStorage),
}));

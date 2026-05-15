"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePageActionStore = void 0;
const zustand_1 = require("zustand");
exports.usePageActionStore = (0, zustand_1.create)((set) => ({
    action: null,
    icon: 'add',
    label: '추가',
    setPageAction: (action, icon, label) => set({ action, icon, label }),
    clearPageAction: () => set({ action: null, icon: 'add', label: '추가' }),
}));

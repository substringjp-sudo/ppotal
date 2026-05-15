import { create } from 'zustand';

interface PageActionState {
    action: (() => void) | null;
    icon: string;
    label: string;
    setPageAction: (action: () => void, icon: string, label: string) => void;
    clearPageAction: () => void;
}

export const usePageActionStore = create<PageActionState>((set) => ({
    action: null,
    icon: 'add',
    label: '추가',
    setPageAction: (action, icon, label) => set({ action, icon, label }),
    clearPageAction: () => set({ action: null, icon: 'add', label: '추가' }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 배열 내 아이템 위치를 이동시키는 유틸리티 */
function arrayMove<T>(array: T[], from: number, to: number): T[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(from, 1);
    newArray.splice(to, 0, movedItem);
    return newArray;
}

export type WidgetId =
    | 'summary'
    | 'action_items'
    | 'stats'
    | 'transportation'
    | 'accommodation'
    | 'budget'
    | 'checklist'
    | 'reservations'
    | 'map'
    | 'wishlist'
    | 'warnings';

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

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'map', visible: true, colSpan: 8, rowSpan: 2, order: 0 },
    { id: 'stats', visible: true, colSpan: 4, rowSpan: 2, order: 1 },
    { id: 'warnings', visible: true, colSpan: 12, rowSpan: 1, order: 2 },
    { id: 'accommodation', visible: true, colSpan: 6, rowSpan: 2, order: 3 },
    { id: 'transportation', visible: true, colSpan: 6, rowSpan: 2, order: 4 },
    { id: 'checklist', visible: true, colSpan: 4, rowSpan: 2, order: 5 },
    { id: 'reservations', visible: true, colSpan: 4, rowSpan: 1, order: 7 },
    { id: 'wishlist', visible: true, colSpan: 4, rowSpan: 1, order: 8 },
];

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            widgets: DEFAULT_WIDGETS,
            isEditMode: false,
            setEditMode: (isEditMode) => set({ isEditMode }),
            updateWidget: (id, updates) =>
                set((state) => ({
                    widgets: state.widgets.map((w) =>
                        w.id === id ? { ...w, ...updates } : w
                    ),
                })),
            /** 드래그 앤 드롭으로 위젯 순서를 바꿉니다 */
            reorderWidgets: (fromId, toId) =>
                set((state) => {
                    const oldIndex = state.widgets.findIndex((w) => w.id === fromId);
                    const newIndex = state.widgets.findIndex((w) => w.id === toId);
                    if (oldIndex === -1 || newIndex === -1) return state;
                    const reordered = arrayMove(state.widgets, oldIndex, newIndex).map(
                        (w, idx) => ({ ...w, order: idx })
                    );
                    return { widgets: reordered };
                }),
            resetLayout: () => set({ widgets: DEFAULT_WIDGETS }),
        }),
        {
            name: 'dashboard-storage-v3', // v3 to force reset for budget removal
        }
    )
);

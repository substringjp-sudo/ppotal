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

/** 6열 그리드 — 위젯 폭은 2(1/3) · 3(1/2) · 6(전체) 세 가지만 허용한다. */
export interface WidgetConfig {
    id: WidgetId;
    visible: boolean;
    colSpan: 2 | 3 | 6;
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

// 'map'과 'warnings'는 여기 없다 — 지도는 우측 고정 맥락 패널로, 경고는 히어로
// 위에 상시 스트립으로 옮겨서 둘 다 드래그 대상(=이 목록)에서 빠졌다.
const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'stats', visible: true, colSpan: 2, rowSpan: 2, order: 0 },
    { id: 'accommodation', visible: true, colSpan: 3, rowSpan: 2, order: 1 },
    { id: 'transportation', visible: true, colSpan: 3, rowSpan: 2, order: 2 },
    { id: 'checklist', visible: true, colSpan: 2, rowSpan: 2, order: 3 },
    { id: 'reservations', visible: true, colSpan: 2, rowSpan: 1, order: 4 },
    { id: 'wishlist', visible: true, colSpan: 2, rowSpan: 1, order: 5 },
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
            name: 'dashboard-storage-v4', // v4: 6-col grid (colSpan 2/3/6), map+warnings pulled out of the widget list
        }
    )
);

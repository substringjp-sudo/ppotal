'use client';
import { ReactNode } from 'react';
import { useDashboardStore, WidgetId } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { WidgetErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardWidgetProps {
    id: WidgetId;
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
}

export default function DashboardWidget({ id, children, className = '', noPadding = false }: DashboardWidgetProps) {
    const isEditMode = useDashboardStore((state) => state.isEditMode);
    const widget = useDashboardStore((state) =>
        state.widgets.find((w) => w.id === id)
    );
    const updateWidget = useDashboardStore((state) => state.updateWidget);

    const WIDGET_NAMES: Partial<Record<WidgetId, string>> = {
        'summary': '여행 요약',
        'action_items': '추천 할 일',
        'stats': '여행 통계',
        'transportation': '교통',
        'accommodation': '숙소',
        'budget': '예산 깊이보기',
        'checklist': '체크리스트',
        'reservations': '예약 보관함',
        'map': '지도',
        'wishlist': '위시리스트',
        'warnings': '알림 및 경고',
    };

    // DnD 정렬 훅 (편집 모드에서만 활성)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled: !isEditMode,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    if (!widget?.visible && !isEditMode) return null;

    const isHidden = !widget?.visible;

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: isHidden && isEditMode ? 0.4 : 1,
                scale: 1,
            }}
            className={`relative group h-full ${className} ${isHidden ? 'border-dashed border-2 border-slate-300 dark:border-slate-700 rounded-[32px]' : ''}`}
            role="region"
            aria-label={`${id} 위젯${isHidden ? ' (숨김됨)' : ''}`}
        >
            {isEditMode && (
                <div className="absolute inset-x-0 top-0 z-20 flex justify-center -translate-y-1/2 pointer-events-none">
                    <div className="flex items-center gap-1.5 pointer-events-auto bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full shadow-2xl border-2 border-primary/30 dark:border-primary/50 backdrop-blur-md">
                        {/* 위젯 이름 배지 */}
                        <div className="px-2 py-0.5 bg-primary/10 rounded-md text-[10px] font-black text-primary whitespace-nowrap border border-primary/20 shrink-0">
                            {WIDGET_NAMES[id] || id}
                        </div>
                        
                        {/* 크기 정보 배지 */}
                        <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter mr-1 border border-slate-200 dark:border-slate-700 shrink-0">
                            {widget?.colSpan}/12 × {widget?.rowSpan}
                        </div>

                        {/* 드래그 핸들 */}
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 cursor-grab active:cursor-grabbing hover:text-primary"
                            title="드래그하여 순서 변경"
                        >
                            <span className="material-symbols-rounded text-sm">drag_indicator</span>
                        </button>
                        
                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                        {/* 너비 조절 */}
                        <button
                            onClick={() => {
                                const sizes: (3 | 4 | 6 | 8 | 12)[] = [3, 4, 6, 8, 12];
                                const currentSize = widget?.colSpan || 12;
                                const currentIndex = sizes.indexOf(currentSize as any);
                                const nextIndex = (currentIndex + 1) % sizes.length;
                                updateWidget(id, { colSpan: sizes[nextIndex] });
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-500"
                            title={`너비 조절 (현재: ${widget?.colSpan}/12)`}
                        >
                            <span className="material-symbols-rounded text-sm">
                                swap_horiz
                            </span>
                        </button>

                        {/* 높이 조절 */}
                        <button
                            onClick={() => {
                                const sizes: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
                                const currentSize = widget?.rowSpan || 1;
                                const currentIndex = sizes.indexOf(currentSize as any);
                                const nextIndex = (currentIndex + 1) % sizes.length;
                                updateWidget(id, { rowSpan: sizes[nextIndex] });
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-500"
                            title={`높이 조절 (현재: ${widget?.rowSpan})`}
                        >
                            <span className="material-symbols-rounded text-sm">
                                swap_vert
                            </span>
                        </button>

                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                        <button
                            onClick={() => updateWidget(id, { visible: !widget?.visible })}
                            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!isHidden ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-400 hover:text-emerald-500'
                                }`}
                            title={isHidden ? "위젯 보이기" : "위젯 숨기기"}
                        >
                            <span className="material-symbols-rounded text-sm">
                                {isHidden ? 'visibility' : 'visibility_off'}
                            </span>
                        </button>
                    </div>
                </div>
            )}
            <div className={`h-full ${isHidden ? 'filter grayscale opacity-50' : ''}`}>
                <div className={`h-full bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 overflow-hidden ${noPadding ? '' : 'p-4 md:p-5'} ${!isEditMode ? 'hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1' : ''}`}>
                    <WidgetErrorBoundary widgetName={id}>
                        {children}
                    </WidgetErrorBoundary>
                </div>
            </div>
        </motion.div>
    );
}

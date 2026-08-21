'use client';

import StatsSection from '@/components/dashboard/StatsSection';
import TransportationCard from '@/components/dashboard/TransportationCard';
import AccommodationTimeline from '@/components/dashboard/AccommodationTimeline';
import BudgetDeepDive from '@/components/dashboard/BudgetDeepDive';
import ChecklistWidget from '@/components/dashboard/ChecklistWidget';
import ReservationsWidget from '@/components/dashboard/ReservationsWidget';
import WishlistWidget from '@/components/dashboard/WishlistWidget';
import OnlineAdvisories from '@/components/dashboard/OnlineAdvisories';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import IntegratedOverview from '@/components/dashboard/IntegratedOverview';
import SmartInsightHub from '@/components/dashboard/SmartInsightHub';
import { useDashboardStore, WidgetId, cn } from '@pplaner/shared';
import { motion } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

/**
 * '한눈에' 섹션 — 여행 전체를 훑어보는 자리.
 *
 * 예전 /dashboard 페이지의 위젯 그리드가 그대로 들어왔다. 대시보드는 위젯 대부분이
 * 편집기 섹션과 같은 데이터를 보여주면서, 정작 고치려면 링크를 눌러 편집기로 넘어가야
 * 했다 — 보는 화면과 고치는 화면이 갈려 왕복만 생겼다. 편집기의 첫 섹션으로 들어오면
 * 사이드바만 오가면 되고 페이지 전환이 사라진다.
 *
 * 페이지였을 때 갖고 있던 것 중 여기서 빠진 것:
 *   · 지도 · 인사이트 사이드 패널 → EditContextPanel이 이미 같은 자리에 띄운다
 *   · 경고 스트립(TripWarnings) → 같은 이유로 맥락 패널이 담당한다
 *   · 페이지 크롬(min-h-screen · 최대 폭 · 푸터) → 편집기 레이아웃이 감싼다
 * 온라인 주의보만 여기 남는다 — 맥락 패널에 자리가 없고, 이 섹션이 유일한 노출 지점이다.
 */

const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    stats: <StatsSection />,
    accommodation: <AccommodationTimeline />,
    transportation: <TransportationCard />,
    budget: <BudgetDeepDive />,
    checklist: <ChecklistWidget />,
    reservations: <ReservationsWidget />,
    wishlist: <WishlistWidget />,
};

const COL_SPAN = {
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    6: 'col-span-1 md:col-span-6',
};

const ROW_SPAN = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
};

export default function TripOverview() {
    const isEditMode = useDashboardStore((state) => state.isEditMode);
    const setEditMode = useDashboardStore((state) => state.setEditMode);
    const resetLayout = useDashboardStore((state) => state.resetLayout);
    const widgets = useDashboardStore((state) => state.widgets);
    const reorderWidgets = useDashboardStore((state) => state.reorderWidgets);

    // 5px 이상 끌어야 드래그로 친다 — 위젯 안의 버튼 클릭과 구분하기 위해서.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            reorderWidgets(active.id as WidgetId, over.id as WidgetId);
        }
    };

    // 컴포넌트가 없는 id(예전 저장 상태에 남은 'map' · 'warnings')는 걸러 빈 카드가 뜨지 않게 한다.
    const sortedWidgets = [...widgets]
        .filter((w) => WIDGET_COMPONENTS[w.id])
        .sort((a, b) => a.order - b.order);
    const widgetIds = sortedWidgets.map((w) => w.id);

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
            <OnlineAdvisories />

            <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="mb-8"
            >
                <IntegratedOverview />
            </motion.div>

            <motion.div
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-wrap gap-3 justify-between items-center mb-6"
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                        나의 여행 현황
                        {isEditMode && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full tracking-widest font-semibold leading-none">
                                편집 모드
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {isEditMode ? '위젯 크기를 조절하거나 드래그해 배치하세요' : '원하는 항목을 배치해 나만의 현황판을 만들어보세요'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {isEditMode ? (
                        <>
                            <button
                                onClick={() => resetLayout()}
                                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-rounded text-sm">restart_alt</span>
                                초기화
                            </button>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[10px] hover:opacity-90 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                완료
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                        >
                            <span className="material-symbols-rounded text-sm">tune</span>
                            현황판 편집
                        </button>
                    )}
                </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-6 grid-flow-row-dense gap-4 auto-rows-[minmax(160px,auto)]">
                            {sortedWidgets.map((widget) => (
                                <motion.div
                                    key={widget.id}
                                    variants={{ hidden: { opacity: 0, scale: 0.95, y: 12 }, visible: { opacity: 1, scale: 1, y: 0 } }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                                    className={cn(
                                        COL_SPAN[widget.colSpan as keyof typeof COL_SPAN] || 'col-span-1 md:col-span-6',
                                        ROW_SPAN[widget.rowSpan as keyof typeof ROW_SPAN] || 'row-span-1',
                                    )}
                                >
                                    <DashboardWidget id={widget.id}>
                                        {WIDGET_COMPONENTS[widget.id]}
                                    </DashboardWidget>
                                </motion.div>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </motion.div>

            {/* 인사이트 — 대시보드 시절 우측 패널에 있었다. 맥락 패널로 옮기면 모든 섹션에서
                따라다니게 되는데, 훑어볼 때 보는 것이지 편집 중에 계속 볼 것은 아니라
                예전과 같은 노출 범위(이 화면에서만)를 유지한다. */}
            <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                className="mt-6"
            >
                <SmartInsightHub />
            </motion.div>
        </motion.div>
    );
}

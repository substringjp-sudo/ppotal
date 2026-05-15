'use client';

import TripHeader from '@/components/dashboard/TripHeader';
import StatsSection from '@/components/dashboard/StatsSection';
import TransportationCard from '@/components/dashboard/TransportationCard';
import AccommodationTimeline from '@/components/dashboard/AccommodationTimeline';
import BudgetDeepDive from '@/components/dashboard/BudgetDeepDive';
import ChecklistWidget from '@/components/dashboard/ChecklistWidget';
import ReservationsWidget from '@/components/dashboard/ReservationsWidget';
import WishlistWidget from '@/components/dashboard/WishlistWidget';
import MapWidget from '@/components/dashboard/MapWidget';
import TripWarnings from '@/components/dashboard/TripWarnings';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import IntegratedOverview from '@/components/dashboard/IntegratedOverview';
import SmartInsightHub from '@/components/dashboard/SmartInsightHub';
import { useDashboardStore, WidgetId } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@pplaner/shared';
import Link from 'next/link';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

/** 위젯 ID → 컴포넌트 매핑 (warnings는 상단 고정으로 분리) */
const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    stats: <StatsSection />,
    map: <MapWidget />,
    accommodation: <AccommodationTimeline />,
    transportation: <TransportationCard />,
    budget: <BudgetDeepDive />,
    checklist: <ChecklistWidget />,
    reservations: <ReservationsWidget />,
    wishlist: <WishlistWidget />,
};

import { getTrip } from '@pplaner/shared';

export default function PreparationDashboard({ tripId }: { tripId?: string }) {
    const { user, loading: authLoading } = useAuth();
    const isEditMode = useDashboardStore((state) => state.isEditMode);
    const setEditMode = useDashboardStore((state) => state.setEditMode);
    const resetLayout = useDashboardStore((state) => state.resetLayout);
    const widgets = useDashboardStore((state) => state.widgets);
    const reorderWidgets = useDashboardStore((state) => state.reorderWidgets);
    const validateTrip = useTripStore((state) => state.validateTrip);
    const setCurrentTrip = useTripStore((state) => state.setCurrentTrip);
    const currentTrip = useTripStore((state) => state.currentTrip);
    const trips = useTripStore((state) => state.trips);
    const [isLoadingTrip, setIsLoadingTrip] = useState(false);
    const [tripLoadError, setTripLoadError] = useState<string | null>(null);

    // dnd-kit 센서 — 5px 이상 드래그해야 시작 (버튼 클릭과 구분)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        if (!tripId) return;
        // 이미 올바른 여행이 로드됨
        if (currentTrip?.id === tripId) return;

        // 인증 상태 로딩 중이면 대기
        if (authLoading) return;
        // 로그인 안 된 경우 auth 오류 표시
        if (!user) {
            setTripLoadError('auth');
            return;
        }

        // 1순위: 로컬 스토어(trips 목록)에서 찾기
        const localTrip = trips.find((t) => t.id === tripId);
        if (localTrip) {
            setCurrentTrip(localTrip);
            return;
        }

        // 2순위: Firestore에서 fetch
        setIsLoadingTrip(true);
        setTripLoadError(null);
        getTrip(tripId)
            .then((trip) => {
                if (trip) setCurrentTrip(trip);
                else setTripLoadError('trip_not_found');
            })
            .catch((err) => {
                console.error('Failed to load trip:', err);
                const code = err?.code || '';
                if (code === 'permission-denied' || code === 'unauthenticated') {
                    setTripLoadError('auth');
                } else {
                    setTripLoadError('network');
                }
            })
            .finally(() => setIsLoadingTrip(false));
    // currentTrip.id 변경에만 반응 (validateTrip이 만드는 새 객체 참조 무시)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, currentTrip?.id, authLoading, user]);

    useEffect(() => {
        validateTrip();
    }, [validateTrip]);

    const trip = currentTrip;

    useEffect(() => {
        if (trip?.title) {
            document.title = `${trip.title} - PPLANER`;
        } else {
            document.title = 'PPLANER - 스마트한 여행 플래너';
        }
    }, [trip?.title]);

    // 여행 로딩 중 (인증 확인 중이거나 Firestore fetch 중이고 currentTrip이 없을 때)
    if ((authLoading || isLoadingTrip) && !currentTrip) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                
                <div className="flex flex-col items-center gap-4 mt-20">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse">여행 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 여행 로드 실패 (Firestore 오류, currentTrip도 없을 때)
    if (tripLoadError && !currentTrip) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
                
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full">
                        <span className="material-symbols-rounded text-6xl text-slate-300 mb-4 block">
                            {tripLoadError === 'auth' ? 'lock' : 'cloud_off'}
                        </span>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg mb-2">
                            {tripLoadError === 'auth' ? '로그인이 필요해요' : '여행을 불러오지 못했어요'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {tripLoadError === 'auth'
                                ? '이 여행을 보려면 로그인이 필요합니다.'
                                : '네트워크 연결을 확인하고 다시 시도해주세요.'}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setTripLoadError(null);
                                    setIsLoadingTrip(true);
                                    getTrip(tripId!)
                                        .then((trip) => { if (trip) setCurrentTrip(trip); else setTripLoadError('trip_not_found'); })
                                        .catch((err) => setTripLoadError(err?.code === 'permission-denied' ? 'auth' : 'network'))
                                        .finally(() => setIsLoadingTrip(false));
                                }}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all"
                            >
                                다시 시도
                            </button>
                            <Link href="/trips" className="w-full py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center text-sm">
                                내 여행 목록으로
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            reorderWidgets(active.id as WidgetId, over.id as WidgetId);
        }
    };

    // order 기준으로 정렬된 위젯 목록
    const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
    const widgetIds = sortedWidgets.map((w) => w.id);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            

            <motion.main 
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
                id="main-content" 
                className="max-w-[2400px] mx-auto px-4 lg:px-6 xl:px-8 py-6"
            >
                {/* 경고: 항상 최상단 고정 (경고 있을 때만 렌더) */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: -10 },
                        visible: { opacity: 1, y: 0 }
                    }}
                    className="mb-4"
                >
                    <TripWarnings />
                </motion.div>

                {/* Integrated Dashboard Overview & Smart Hub */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6 mb-8 items-stretch">
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 }
                        }}
                        className="xl:col-span-9"
                    >
                        <IntegratedOverview />
                    </motion.div>
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 }
                        }}
                        className="xl:col-span-3 hover:scale-[1.02] transition-transform duration-300"
                    >
                        <SmartInsightHub />
                    </motion.div>
                </div>

                {/* Dashboard Controls */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                    }}
                    className="flex justify-between items-center mb-6 px-2"
                >
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3 italic">
                            나의 여행 현황
                            {isEditMode && (
                                <span className="text-[9px] not-italic bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse font-black leading-none">
                                    편집 모드
                                </span>
                            )}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {isEditMode ? '위젯 크기를 조절하거나 드래그하여 배치하세요' : '원하는 항목을 배치해 나만의 현황판을 만들어보세요'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isEditMode ? (
                            <>
                                <button
                                    onClick={() => resetLayout()}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-xs">restart_alt</span>
                                    초기화
                                </button>
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-black/10"
                                >
                                    <span className="material-symbols-rounded text-xs">check_circle</span>
                                    변경사항 저장
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-rounded text-xs">tune</span>
                                대시보드 편집
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* DnD 위젯 그리드 */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.05 }
                        }
                    }}
                >
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 grid-flow-row-dense gap-4 xl:gap-6 pb-20 auto-rows-[minmax(160px,auto)]">
                                {sortedWidgets.map((widget) => {
                                    const colSpanMappings = {
                                        1: 'col-span-12 md:col-span-1',
                                        2: 'col-span-12 md:col-span-2',
                                        3: 'col-span-12 md:col-span-3',
                                        4: 'col-span-12 md:col-span-4',
                                        6: 'col-span-12 md:col-span-6',
                                        8: 'col-span-12 md:col-span-8',
                                        12: 'col-span-12',
                                    };

                                    const rowSpanMappings = {
                                        1: 'row-span-1',
                                        2: 'row-span-2',
                                        3: 'row-span-3',
                                        4: 'row-span-4',
                                    };

                                    return (
                                        <motion.div
                                            key={widget.id}
                                            variants={{
                                                hidden: { opacity: 0, scale: 0.9, y: 20 },
                                                visible: { opacity: 1, scale: 1, y: 0 }
                                            }}
                                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                            className={cn(
                                                colSpanMappings[widget.colSpan as keyof typeof colSpanMappings] || 'col-span-12',
                                                rowSpanMappings[widget.rowSpan as keyof typeof rowSpanMappings] || 'row-span-1'
                                            )}
                                        >
                                            <DashboardWidget
                                                id={widget.id}
                                                noPadding={widget.id === 'map'}
                                            >
                                                {WIDGET_COMPONENTS[widget.id]}
                                            </DashboardWidget>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                </motion.div>
            </motion.main>

            <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800 px-4 lg:px-20 text-center">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
                    <p>© 2025 PPLANER. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-primary transition-colors">고객 지원</a>
                        <a href="#" className="hover:text-primary transition-colors">개인정보 처리방침</a>
                        <a href="#" className="hover:text-primary transition-colors">이용약관</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

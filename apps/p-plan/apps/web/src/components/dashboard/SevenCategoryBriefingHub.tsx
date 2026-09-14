'use client';

import React, { useMemo, useState } from 'react';
import { 
    useTripStore, 
    generateTripCategoryBriefing, 
    TripCategoryBriefing,
    SectionId,
    cn
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_TO_SECTION_MAP: Record<string, SectionId> = {
    basic: 'basics',
    transport: 'transport',
    accommodation: 'accommodation',
    reservation: 'reservations',
    itinerary: 'timeline',
    budget: 'budget',
    checklist: 'checklist',
};

interface SevenCategoryBriefingHubProps {
    onNavigateSection?: (sectionId: SectionId) => void;
}

export default function SevenCategoryBriefingHub({ onNavigateSection }: SevenCategoryBriefingHubProps) {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const updateChecklistItem = useTripStore((state) => state.updateChecklistItem);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);

    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // ── 7대 카테고리 브리핑 계산 ──────────────────────────────────────────
    const briefings = useMemo(() => {
        if (!currentTrip) return [];

        const regions = currentTrip.locations?.regions || [];
        const destKey = regions[0]?.countryId || regions[0]?.name || (currentTrip.locations?.regionNames?.[0]) || 'KR';
        const originKey = currentTrip.isOverseas ? 'KR' : destKey;

        const totalGuests = currentTrip.participants?.length || 1;

        return generateTripCategoryBriefing({
            originCountry: originKey,
            destinationCountry: destKey,
            destinationRegionNames: currentTrip.locations?.regionNames || regions.map(r => r.name),
            startDate: currentTrip.dates?.startDate,
            endDate: currentTrip.dates?.endDate,
            durationDays: currentTrip.dates?.durationDays,
            guestCount: totalGuests,
            theme: currentTrip.theme,
            useFlight: currentTrip.transportSettings?.useFlight !== false,
            isRental: (currentTrip.driving?.length || 0) > 0,
            hasAccommodations: (currentTrip.accommodation?.length || 0) > 0
        });
    }, [currentTrip]);

    // ── 실시간 여행 데이터와 체크리스트 진행률 매핑 ──────────────────────────
    const categoryStatusList = useMemo(() => {
        if (!currentTrip) return [];

        const checklist = currentTrip.checklist || [];
        const flights = currentTrip.flights || [];
        const driving = currentTrip.driving || [];
        const accs = currentTrip.accommodation || [];
        const reservations = currentTrip.reservations || [];
        const dailyTimeline = currentTrip.dailyTimeline || [];
        const hasBudget = (currentTrip.budget?.expenses?.length || 0) > 0 || (currentTrip.budget?.totalAllocated || 0) > 0;

        const totalPlannedEvents = dailyTimeline.reduce((sum, d) => sum + (d.events?.length || 0), 0);

        return briefings.map((b) => {
            // 카테고리별 체크리스트 아이템들 매칭
            const matchedChecklist = checklist.filter((c) => {
                const titleLower = c.title.toLowerCase();
                if (b.category === 'basic') {
                    return titleLower.includes('여권') || titleLower.includes('신분증') || titleLower.includes('비자') || titleLower.includes('qr') || titleLower.includes('esta') || titleLower.includes('visit japan');
                }
                if (b.category === 'transport') {
                    return titleLower.includes('항공') || titleLower.includes('면허') || titleLower.includes('인승') || titleLower.includes('교통') || titleLower.includes('패스');
                }
                if (b.category === 'accommodation') {
                    return titleLower.includes('침대') || titleLower.includes('숙소') || titleLower.includes('객실') || titleLower.includes('체크인');
                }
                if (b.category === 'reservation') {
                    return titleLower.includes('예약') || titleLower.includes('티켓') || titleLower.includes('바우처') || titleLower.includes('입장권');
                }
                if (b.category === 'itinerary') {
                    return titleLower.includes('날씨') || titleLower.includes('옷차림') || titleLower.includes('동선') || titleLower.includes('공휴일');
                }
                if (b.category === 'budget') {
                    return titleLower.includes('환율') || titleLower.includes('환전') || titleLower.includes('트래블') || titleLower.includes('팁') || titleLower.includes('카드');
                }
                if (b.category === 'checklist') {
                    return titleLower.includes('어댑터') || titleLower.includes('돼지코') || titleLower.includes('esim') || titleLower.includes('유심') || titleLower.includes('필터') || titleLower.includes('보험') || titleLower.includes('상비약');
                }
                return false;
            });

            // 카테고리별 실질적 준비 상태 판정
            let isComplete = false;
            let statusText = '준비 시작';

            if (b.category === 'basic') {
                const doneCount = matchedChecklist.filter(c => c.isDone).length;
                isComplete = matchedChecklist.length > 0 && doneCount === matchedChecklist.length;
                statusText = isComplete ? '확인 완료' : matchedChecklist.length > 0 ? `${doneCount}/${matchedChecklist.length} 완료` : '점검 필요';
            } else if (b.category === 'transport') {
                const hasFlights = flights.length > 0;
                const hasDriving = driving.length > 0;
                isComplete = hasFlights || hasDriving;
                statusText = isComplete ? `${flights.length + driving.length}건 등록됨` : '미등록';
            } else if (b.category === 'accommodation') {
                isComplete = accs.length > 0;
                statusText = isComplete ? `${accs.length}개 숙소 등록됨` : '미등록';
            } else if (b.category === 'reservation') {
                isComplete = reservations.length > 0;
                statusText = isComplete ? `${reservations.length}건 예약 완료` : '예약 없음';
            } else if (b.category === 'itinerary') {
                isComplete = totalPlannedEvents > 0;
                statusText = isComplete ? `${totalPlannedEvents}개 일정 등록됨` : '일정 비어있음';
            } else if (b.category === 'budget') {
                isComplete = hasBudget;
                statusText = isComplete ? '예산 설정됨' : '예산 미설정';
            } else if (b.category === 'checklist') {
                const totalItems = matchedChecklist.length;
                const doneItems = matchedChecklist.filter(c => c.isDone).length;
                isComplete = totalItems > 0 && doneItems === totalItems;
                statusText = totalItems > 0 ? `${doneItems}/${totalItems} 챙김` : '체크리스트 준비 중';
            }

            return {
                ...b,
                matchedChecklist,
                isComplete,
                statusText,
                sectionId: CATEGORY_TO_SECTION_MAP[b.category] || 'basics'
            };
        });
    }, [briefings, currentTrip]);

    if (!currentTrip || briefings.length === 0) return null;

    const handleNavigate = (sectionId: SectionId) => {
        if (onNavigateSection) {
            onNavigateSection(sectionId);
        } else {
            // URL 해시/쿼리로 이동
            const url = new URL(window.location.href);
            url.searchParams.set('tab', sectionId);
            window.history.pushState({}, '', url.toString());
            window.dispatchEvent(new CustomEvent('pplaner:navigate-section', { detail: { sectionId } }));
        }
    };

    const handleToggleChecklist = (checkId: string, currentDone: boolean) => {
        updateChecklistItem(checkId, { isDone: !currentDone });
    };

    const handleAddMissingBriefingItem = (item: { title: string; category: string; isEssential: boolean }) => {
        addChecklistItem({
            title: item.title,
            cardId: item.category === 'basic' ? 'documents' : item.category === 'budget' ? 'money' : item.category === 'transport' ? 'transport' : item.category === 'checklist' ? 'power' : 'custom',
            priority: item.isEssential ? 'essential' : 'recommended'
        });
    };

    return (
        <section className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 sm:mb-6 pb-4 sm:pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="material-symbols-rounded text-primary text-xl shrink-0">verified_user</span>
                        <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight break-keep">
                            여행 준비 7대 핵심 브리핑 & 체크포인트
                        </h2>
                        <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full shrink-0">
                            스마트 점검
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-keep">
                        목적지 국가, 여행 시기, 인원, 테마에 맞춘 핵심 필수 영역을 점검하고 놓치지 마세요.
                    </p>
                </div>
            </div>

            {/* 7-Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {categoryStatusList.map((cat) => {
                    const isExpanded = expandedCategory === cat.category;

                    return (
                        <div
                            key={cat.category}
                            className={cn(
                                "rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group",
                                cat.isComplete
                                    ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:shadow-md"
                            )}
                        >
                            {/* Card Top / Header */}
                            <div className="p-3.5 sm:p-5 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div 
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            <span className="material-symbols-rounded text-base">{cat.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate break-keep">
                                                {cat.title}
                                            </h3>
                                            <span className="text-[10px] font-semibold text-slate-400 truncate block">
                                                {cat.badgeKo}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0",
                                        cat.isComplete
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    )}>
                                        {cat.statusText}
                                    </span>
                                </div>

                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 mb-2">
                                    {cat.highlightKo}
                                </p>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {cat.summaryKo}
                                </p>
                            </div>

                            {/* Inline Expandable Checklist */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs"
                                    >
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            핵심 체크리스트
                                        </p>
                                        {cat.items.map((item) => {
                                            const registered = (currentTrip.checklist || []).find(c => c.title.trim() === item.title.trim());
                                            const isDone = !!registered?.isDone;

                                            return (
                                                <div 
                                                    key={item.id}
                                                    className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
                                                >
                                                    {registered ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleChecklist(registered.id, isDone)}
                                                            className={cn(
                                                                "w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors shrink-0",
                                                                isDone ? "bg-primary text-white" : "border border-slate-300 dark:border-slate-600 hover:border-primary"
                                                            )}
                                                        >
                                                            {isDone && <span className="material-symbols-rounded text-xs">check</span>}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddMissingBriefingItem({ title: item.title, category: cat.category, isEssential: item.isEssential })}
                                                            title="내 체크리스트에 추가하기"
                                                            className="w-4 h-4 rounded mt-0.5 flex items-center justify-center border border-dashed border-primary text-primary hover:bg-primary/10 transition-colors shrink-0"
                                                        >
                                                            <span className="material-symbols-rounded text-xs">add</span>
                                                        </button>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn("text-[11px] font-semibold leading-tight", isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200")}>
                                                            {item.title}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Card Footer Actions */}
                            <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <span>체크포인트 {cat.items.length}개</span>
                                    <span className={cn("material-symbols-rounded text-sm transition-transform", isExpanded ? "rotate-180" : "")}>
                                        expand_more
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleNavigate(cat.sectionId)}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:border-primary hover:text-primary transition-all flex items-center gap-1 group-hover:shadow-xs"
                                >
                                    <span>설정</span>
                                    <span className="material-symbols-rounded text-xs">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

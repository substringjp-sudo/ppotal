'use client';
import { useMemo } from 'react';
import { useTripStore, useUserStore, useSettingsStore, buildPrepCards, cn } from '@pplaner/shared';

/**
 * 대시보드 준비 위젯 — 카드 단위 요약.
 *
 * 항목을 평평하게 나열하면 "12/30" 같은 숫자가 앞에 서고, 그 숫자는 담을수록 나빠진다.
 * 여기서는 카드별 진행과 "꼭 필요한데 아직 안 한 것"만 보여준다 — 지금 뭘 해야 하는지는
 * 전체 완료율이 아니라 그 두 가지로 결정된다.
 */
export default function ChecklistWidget() {
    const trip = useTripStore((state) => state.currentTrip);
    const profileHomeCountry = useUserStore((state) => state.profile?.residence?.country);
    const homeCountryOverride = useSettingsStore((state) => state.homeCountryOverride);
    const homeCountry = profileHomeCountry || homeCountryOverride;

    const { active, suggested } = useMemo(
        () => (trip ? buildPrepCards(trip, { homeCountryName: homeCountry }) : { active: [], suggested: [] }),
        [trip, homeCountry],
    );

    if (!trip) return (
        <div className="flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
        </div>
    );

    const pendingEssential = active.reduce((sum, c) => sum + c.pendingEssentialCount, 0);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                <h3 className="font-bold flex items-center gap-2 text-sm leading-none">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">fact_check</span>
                    여행 준비
                </h3>
                {pendingEssential > 0 ? (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 leading-none">
                        꼭 필요 {pendingEssential}개 남음
                    </span>
                ) : (
                    <span className="text-xs font-semibold text-slate-500 leading-none">
                        카드 {active.length}장
                    </span>
                )}
            </div>

            <div className="p-4 space-y-2" role="list">
                {active.length === 0 ? (
                    <div className="text-center py-8 text-slate-400" role="status">
                        <p className="text-xs font-semibold">담아 둔 준비 카드가 없어요</p>
                        {suggested.length > 0 && (
                            <p className="text-xs mt-1">제안된 카드 {suggested.length}장이 기다리고 있어요</p>
                        )}
                    </div>
                ) : (
                    active.map((card) => {
                        const total = card.items.length;
                        const ratio = total > 0 ? card.doneCount / total : 0;
                        const allDone = total > 0 && card.doneCount === total;
                        return (
                            <div key={card.id} className="flex items-center gap-3" role="listitem">
                                <span className={cn(
                                    'material-symbols-rounded text-lg shrink-0',
                                    allDone ? 'text-emerald-500' : 'text-slate-400',
                                )}>
                                    {allDone ? 'task_alt' : card.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {card.title}
                                        </span>
                                        {card.pendingEssentialCount > 0 && (
                                            <span className="text-xs font-semibold text-red-500 shrink-0">
                                                필수 {card.pendingEssentialCount}
                                            </span>
                                        )}
                                        <span className="ml-auto text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                                            {card.doneCount}/{total}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-primary')}
                                            style={{ width: `${Math.round(ratio * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {active.length > 0 && suggested.length > 0 && (
                    <p className="pt-2 text-xs text-slate-400">
                        제안 {suggested.length}장 · 필요한 것만 담으면 돼요
                    </p>
                )}
            </div>
        </div>
    );
}

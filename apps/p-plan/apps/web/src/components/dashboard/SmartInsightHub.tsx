'use client';

import { useTripStore } from '@pplaner/shared';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExportModal } from '@/components/common/ExportModal';

interface TopAction {
    label: string;
    tab: string;
}

/**
 * 진행도(%)와 가장 급한 할 일 하나를 실제 여행 데이터에서 계산한다.
 * 예전엔 여기서 하드코딩된 문구를 그대로 보여줬다 — 계획이 다 채워져도
 * "정보를 입력하세요"만 반복해서, 잘 되고 있다는 확인이 되지 않았다.
 */
function useTripInsight() {
    const currentTrip = useTripStore((state) => state.currentTrip);

    return useMemo(() => {
        if (!currentTrip) return null;

        const regions = currentTrip.locations?.regions?.length || 0;
        const accommodations = currentTrip.accommodation?.length || 0;
        const transports = (currentTrip.flights?.length || 0) + (currentTrip.driving?.length || 0) + (currentTrip.publicTransport?.length || 0);
        const budgets = currentTrip.budget?.expenses?.length || 0;

        let progress = 0;
        if (regions > 0) progress += 20;
        if (accommodations > 0) progress += 30;
        if (transports > 0) progress += 30;
        if (budgets > 0) progress += 20;

        const status = progress >= 100 ? '준비 완료' : progress >= 50 ? '진행 중' : '준비 중';

        // 가장 급한 할 일 하나만 — 심각 경고 > 빠진 핵심 정보 순으로.
        const criticalWarning = (currentTrip.warnings || []).find((w) => w.severity === 'critical');
        let topAction: TopAction | null = null;
        if (criticalWarning) {
            topAction = { label: criticalWarning.message, tab: 'transport' };
        } else if (regions === 0) {
            topAction = { label: '여행 지역을 아직 정하지 않았어요', tab: 'basics' };
        } else if (transports === 0) {
            topAction = { label: '교통편이 등록되어 있지 않아요', tab: 'transport' };
        } else if (accommodations === 0) {
            topAction = { label: '숙소가 아직 없어요', tab: 'accommodation' };
        } else if (budgets === 0) {
            topAction = { label: '예산 항목을 기록해보세요', tab: 'budget' };
        }

        const statusMessage = progress >= 100
            ? '준비가 거의 다 됐어요! 🎉'
            : topAction
                ? topAction.label
                : '여행 계획을 자유롭게 수정해보세요! 🗺️';

        return { progress, status, statusMessage, topAction };
    }, [currentTrip]);
}

export default function SmartInsightHub() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const router = useRouter();
    const [showExport, setShowExport] = useState(false);
    const insight = useTripInsight();

    if (!currentTrip || !insight) return null;

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Smart Voice Section */}
            <div className="flex-1 p-6 rounded-[32px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 shadow-xl relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-rounded text-[80px] rotate-12">auto_awesome</span>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">준비 상태</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{insight.status} · {insight.progress}%</span>
                    </div>

                    <div className="h-1.5 rounded-full bg-white/10 dark:bg-slate-900/10 overflow-hidden mb-5">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${insight.progress}%` }}
                        />
                    </div>

                    <h3 className="text-xl font-black mb-2 tracking-tight italic leading-tight">
                        {insight.statusMessage}
                    </h3>

                    {insight.topAction && (
                        <button
                            onClick={() => router.push(`/edit-trip/${currentTrip.id}?tab=${insight.topAction!.tab}`)}
                            className="mt-4 flex items-center gap-1.5 text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                        >
                            바로 가서 채우기
                            <span className="material-symbols-rounded text-base">arrow_forward</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Actions / Export */}
            <button
                onClick={() => setShowExport(true)}
                className="w-full py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[32px] border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl active:scale-[0.98] group"
            >
                <span className="material-symbols-rounded text-lg group-hover:rotate-12 transition-transform">ios_share</span>
                계획 내보내기
            </button>
            
            {showExport && <ExportModal onClose={() => setShowExport(false)} />}
        </div>
    );
}

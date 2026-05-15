'use client';
import { useTripStore } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function SummaryWidget() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const router = useRouter();
    
    const summary = useMemo(() => {
        if (!currentTrip) return null;
        
        const days = currentTrip.dates?.startDate && currentTrip.dates?.endDate 
            ? Math.ceil((new Date(currentTrip.dates.endDate).getTime() - new Date(currentTrip.dates.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0;
            
        const regions = currentTrip.locations?.regions?.length || 0;
        const accommodations = currentTrip.accommodation?.length || 0;
        const transports = (currentTrip.flights?.length || 0) + (currentTrip.driving?.length || 0) + (currentTrip.publicTransport?.length || 0);
        const budgets = currentTrip.budget?.expenses?.length || 0;
        
        // 간단한 분석 로직
        let status = "준비 중";
        let progress = 0;
        if (regions > 0) progress += 20;
        if (accommodations > 0) progress += 30;
        if (transports > 0) progress += 30;
        if (budgets > 0) progress += 20;
        
        if (progress >= 100) status = "준비 완료";
        else if (progress >= 50) status = "진행 중";
        
        return {
            days,
            regions: currentTrip.locations?.regions?.map(r => r.name).join(', ') || '지역 미정',
            accommodations,
            transports,
            status,
            progress
        };
    }, [currentTrip]);

    if (!currentTrip || !summary) return null;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                        {currentTrip.title}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                        {summary.regions} · {summary.days}일간의 여정
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        summary.status === '준비 완료' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                    }`}>
                        {summary.status}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 font-bold">
                         준비도 {summary.progress}%
                    </span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-primary mb-2 opacity-80">calendar_today</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{summary.days}일</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">여행 기간</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-amber-500 mb-2 opacity-80">hotel</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{summary.accommodations}개소</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">예약된 숙소</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-rounded text-blue-500 mb-2 opacity-80">direction_bus</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{summary.transports}개</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">교통편 정보</div>
                </div>
                <button 
                    onClick={() => router.push(`/edit-trip/${currentTrip.id}`)}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-left hover:border-primary/50 transition-colors group/edit"
                >
                    <span className="material-symbols-rounded text-emerald-500 mb-2 opacity-80 group-hover/edit:animate-bounce">analytics</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
                        상세 정보
                        <span className="material-symbols-rounded text-xs">arrow_forward</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">상세 분석 & 입력</div>
                </button>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-rounded text-6xl">auto_awesome</span>
                </div>
                <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-sm">magic_button</span>
                    스마트 요약 & 분석
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {summary.progress < 50 
                        ? "여행의 기초적인 정보가 아직 부족합니다. 숙소와 교통편을 먼저 추가하여 계획을 구체화해보세요."
                        : summary.progress < 100
                        ? "계획이 순조롭게 진행 중입니다! 누락된 예약 정보를 확인하고 체크리스트를 점검하면 완벽한 여행이 될 거예요."
                        : "모든 준비가 완료되었습니다. 이제 즐거운 여행 되세요!"
                    }
                </p>
            </div>
        </div>
    );
}

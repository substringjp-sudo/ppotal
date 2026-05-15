'use client';

import { useTripStore } from '@pplaner/shared';
import { useMemo, useState } from 'react';
import { ExportModal } from '@/components/common/ExportModal';

export default function SmartInsightHub() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const [showExport, setShowExport] = useState(false);

    const insight = useMemo(() => {
        if (!currentTrip) return null;
        return { statusMessage: "여행 계획을 자유롭게 수정해보세요! 🗺️", nextAction: "일정, 숙소, 교통편 등 필요한 정보를 입력하세요." };
    }, [currentTrip]);

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
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">스마트 통찰 및 상태</span>
                    </div>

                    <h3 className="text-xl font-black mb-2 tracking-tight italic leading-tight">
                        {insight.statusMessage}
                    </h3>
                    
                    <p className="text-sm font-bold opacity-70 mb-6 max-w-[90%]">
                        {insight.nextAction}
                    </p>

                    {/* Progress and Status Selector Removed */}
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

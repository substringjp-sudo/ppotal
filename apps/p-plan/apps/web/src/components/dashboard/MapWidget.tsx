'use client';
import { useMemo } from 'react';
import TripMap from '@/components/common/TripMap';
import { useTripStore } from '@pplaner/shared';
import { AIRPORTS } from '@pplaner/shared';
import { useRouter } from 'next/navigation';

export default function MapWidget() {
    const trip = useTripStore((state) => state.currentTrip);
    const router = useRouter();

    if (!trip) return (
        <div className="w-full h-full min-h-[200px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
    );

    const handleNavigate = () => {
        router.push(`/edit-trip/${trip.id}?tab=schedule`);
    };

    return (
        <section 
            className="flex flex-col h-full min-h-[400px] overflow-hidden"
            aria-labelledby="map-widget-title"
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                <h3 id="map-widget-title" className="font-bold flex items-center gap-2 text-sm leading-none">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">map</span>
                    여행 지도
                </h3>
                <button 
                    onClick={handleNavigate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all group"
                >
                    일정 전체보기
                    <span className="material-symbols-rounded text-[12px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                </button>
            </div>
            <div className="flex-1 relative">
                <TripMap
                    trip={trip}
                    viewMode="dashboard"
                    aria-label={`여행 지도: ${trip.locations?.regions?.[0]?.name || '위치 미지정'}`}
                />

                {/* Floating Map Legend/Controls overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button 
                        className="w-8 h-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-600 dark:text-slate-300"
                        aria-label="현재 위치로 이동"
                    >
                        <span className="material-symbols-rounded text-sm" aria-hidden="true">my_location</span>
                    </button>
                </div>

                <div 
                    className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur p-2 rounded-lg shadow-xl border border-black/5 flex flex-col gap-1.5 min-w-[120px]"
                    aria-label="지도 범례"
                    role="list"
                >
                    <div className="flex items-center gap-2" role="listitem">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" aria-hidden="true"></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">공항/숙소</span>
                    </div>
                    <div className="flex items-center gap-2" role="listitem">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" aria-hidden="true"></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">일정 장소</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

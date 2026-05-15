import React from 'react';
import { ListIcon, MapIcon } from 'lucide-react';
import { cn } from '@pplaner/shared';
import { Trip } from '@pplaner/shared';
import { EnhancedTimelineDay } from '@/hooks/useTimelineProcessor';

interface TimelineHeaderProps {
    trip: Trip;
    timeline: EnhancedTimelineDay[];
    viewMode: 'timeline' | 'map';
    setViewMode: (mode: 'timeline' | 'map') => void;
    showOnlyBooked: boolean;
    setShowOnlyBooked: (show: boolean) => void;
    setIsWishlistOpen: (open: boolean) => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    trip,
    timeline,
    viewMode,
    setViewMode,
    showOnlyBooked,
    setShowOnlyBooked,
    setIsWishlistOpen,
}) => {
    return (
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="min-w-fit">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary text-2xl leading-none">route</span>
                    상세 일정
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {trip.dailyTimeline.length}일 간의 여행 • {timeline.reduce((acc, d) => acc + d.events.length, 0)}개 항목
                </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all",
                                viewMode === 'timeline' 
                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                            )}
                        >
                            <ListIcon size={12} />
                            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">타임라인</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all",
                                viewMode === 'map' 
                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                            )}
                        >
                            <MapIcon size={12} />
                            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">지도</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowOnlyBooked(!showOnlyBooked)}
                        className={cn(
                            "px-3 py-2 rounded-xl flex items-center gap-2 transition-all border",
                            showOnlyBooked 
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent"
                        )}
                        title={showOnlyBooked ? "전체 일정 보기" : "예약 완료된 일정만 보기"}
                    >
                        <span className="material-symbols-rounded text-[16px]">
                            {showOnlyBooked ? 'verified_user' : 'pending_actions'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider hidden lg:inline">
                            {showOnlyBooked ? '예약 완료만' : '전체 일정'}
                        </span>
                    </button>
                </div>

                <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 hidden sm:block mx-1"></div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {/* Analysis Logic */}}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black hover:bg-primary hover:text-white transition-all border border-primary/20"
                    >
                        <span className="material-symbols-rounded text-sm">analytics</span>
                        타임라인 분석
                    </button>
                    <button 
                        onClick={() => {/* Optimization Logic */}}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                    >
                        <span className="material-symbols-rounded text-sm">auto_fix_high</span>
                        경로 최적화
                    </button>
                    <button 
                        onClick={() => {
                            if (window.confirm('모든 일정을 삭제하시겠습니까?')) {
                                /* Clear Logic */
                            }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                        <span className="material-symbols-rounded text-sm">delete_sweep</span>
                        전체 삭제
                    </button>
                    <button
                        onClick={() => setIsWishlistOpen(true)}
                        className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-2 border border-primary/20"
                    >
                        <span className="material-symbols-rounded text-sm font-black">auto_awesome</span>
                        <span className="hidden sm:inline">위시리스트</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

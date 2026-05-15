'use client';

import { List as ListIcon, Map as MapIcon, LayoutPanelLeft as GanttIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelineControlBarProps {
    viewMode: 'timeline' | 'map' | 'gantt';
    onViewModeChange: (mode: 'timeline' | 'map' | 'gantt') => void;
    showOnlyBooked: boolean;
    onShowOnlyBookedChange: (show: boolean) => void;
}

export default function TimelineControlBar({
    viewMode,
    onViewModeChange,
    showOnlyBooked,
    onShowOnlyBookedChange
}: TimelineControlBarProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <button 
                    onClick={() => onViewModeChange('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                        viewMode === 'timeline' 
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                >
                    <ListIcon className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">타임라인</span>
                </button>
                <button 
                    onClick={() => onViewModeChange('map')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                        viewMode === 'map' 
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">지도</span>
                </button>
                <button 
                    onClick={() => onViewModeChange('gantt')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                        viewMode === 'gantt' 
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                >
                    <GanttIcon className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">간트차트</span>
                </button>
            </div>

                <button 
                    onClick={() => onShowOnlyBookedChange(!showOnlyBooked)}
                    title={showOnlyBooked ? '전체 일정 보기' : '예약 확정된 항목만 필터링'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 border shrink-0 ${
                        showOnlyBooked 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-sm ring-1 ring-amber-700/10' 
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <span className={`material-symbols-rounded text-sm shrink-0 ${showOnlyBooked ? 'text-white' : 'text-slate-400'}`}>
                        {showOnlyBooked ? 'verified' : 'filter_alt'}
                    </span>
                    <span className="whitespace-nowrap shrink-0">
                        {showOnlyBooked ? '확정만 보기' : '확정 필터'}
                    </span>
                </button>
        </div>
    );
}

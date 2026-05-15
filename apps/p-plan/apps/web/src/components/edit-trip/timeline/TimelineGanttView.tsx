'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TripEvent } from '@pplaner/shared';
import { EnhancedTimelineDay } from '@/hooks/useTimelineData';
import { cn, timeToMinutes } from '@pplaner/shared';

interface TimelineGanttViewProps {
    dailyTimeline: EnhancedTimelineDay[];
    onEditEvent: (dayIdx: number, event: Partial<TripEvent>) => void;
}

export default function TimelineGanttView({ dailyTimeline, onEditEvent }: TimelineGanttViewProps) {
    const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM
    const MINUTES_PER_HOUR = 60;
    const TOTAL_MINUTES = HOURS.length * MINUTES_PER_HOUR;

    const getXPosition = (timeStr: string | undefined) => {
        if (!timeStr) return 0;
        const mins = timeToMinutes(timeStr);
        const startMins = 8 * 60; // 8 AM
        const relMins = Math.max(0, mins - startMins);
        return (relMins / TOTAL_MINUTES) * 100;
    };

    const getWidth = (duration: number | undefined) => {
        const d = duration || 60;
        return (d / TOTAL_MINUTES) * 100;
    };

    return (
        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-auto custom-scrollbar">
            <div className="min-w-[1200px] p-8">
                {/* Time Header */}
                <div className="flex sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 pb-4 mb-2">
                    <div className="w-32 flex-shrink-0" /> {/* Day Label spacer */}
                    <div className="flex-1 relative h-6 border-b border-slate-200 dark:border-slate-800">
                        {HOURS.map((hour) => (
                            <div 
                                key={hour}
                                className="absolute text-[10px] font-black text-slate-400 -translate-x-1/2"
                                style={{ left: `${((hour - 8) / HOURS.length) * 100}%` }}
                            >
                                {hour > 12 ? `PM ${hour - 12}` : `AM ${hour}`}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day Rows */}
                <div className="space-y-4">
                    {dailyTimeline.map((day, dayIdx) => (
                        <div key={dayIdx} className="flex items-center group">
                            {/* Day Label */}
                            <div className="w-32 flex-shrink-0 flex flex-col">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{day.day}일차</span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {day.date ? format(parseISO(day.date), 'MM.dd (eee)', { locale: ko }) : '날짜 미정'}
                                </span>
                            </div>

                            {/* Timeline Track */}
                            <div className="flex-1 relative h-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group-hover:shadow-md transition-shadow">
                                {/* Hour markers (Vertical lines) */}
                                {HOURS.map((hour) => (
                                    <div 
                                        key={hour}
                                        className="absolute top-0 bottom-0 w-px bg-slate-50 dark:bg-slate-800/50"
                                        style={{ left: `${((hour - 8) / HOURS.length) * 100}%` }}
                                    />
                                ))}

                                {/* Events */}
                                {day.events.filter(e => e.startTime).map((event) => {
                                    const left = getXPosition(event.startTime);
                                    const width = getWidth(event.durationMinutes);
                                    
                                    return (
                                        <motion.button
                                            key={event.id}
                                            layoutId={event.id}
                                            onClick={() => onEditEvent(dayIdx, event)}
                                            className={cn(
                                                "absolute top-2 bottom-2 rounded-xl border px-3 py-1.5 flex flex-col justify-center overflow-hidden transition-all shadow-sm hover:shadow-lg hover:ring-2 hover:ring-offset-2",
                                                event.type === 'sightseeing' ? "bg-amber-500/10 border-amber-500/20 text-amber-700 hover:ring-amber-500" :
                                                event.type === 'meal' ? "bg-rose-500/10 border-rose-500/20 text-rose-700 hover:ring-rose-500" :
                                                event.type === 'transport' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 hover:ring-indigo-500" :
                                                "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:ring-emerald-500"
                                            )}
                                            style={{ 
                                                left: `${left}%`, 
                                                width: `${Math.max(2, width)}%` 
                                            }}
                                            whileHover={{ y: -2 }}
                                        >
                                            <span className="text-[10px] font-black truncate leading-tight">{event.title}</span>
                                            <span className="text-[8px] font-bold opacity-70">{event.startTime}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

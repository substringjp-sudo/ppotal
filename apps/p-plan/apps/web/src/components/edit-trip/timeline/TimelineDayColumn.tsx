'use client';

import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TripEvent } from '@pplaner/shared';
import SortableEventCard from './SortableEventCard';
import PendingEventCard from './PendingEventCard';
import { cn } from '@pplaner/shared';
import { motion } from 'framer-motion';

interface TimelineDayColumnProps {
    dayIdx: number;
    date: string;
    dayOfWeek: string;
    events: TripEvent[];
    visitSummary?: string;
    onAddEvent: (dayIdx: number, event?: Partial<TripEvent> | Partial<TripEvent>[]) => void;
    onEditEvent: (dayIdx: number, event: Partial<TripEvent>) => void;
    onRemoveEvent: (dayIdx: number, id: string) => void;
    onAddComment?: (eventId: string) => void;
    onNavigateToSection?: (section: string) => void;
    highlightedEventId?: string | null;
    pendingEvents?: TripEvent[];
    isLast: boolean;
    forwardRef?: (el: HTMLDivElement | null) => void;
}

export default function TimelineDayColumn({
    dayIdx,
    date,
    dayOfWeek,
    events,
    visitSummary,
    daySummary,
    onAddEvent,
    onEditEvent,
    onRemoveEvent,
    onAddComment,
    onNavigateToSection,
    highlightedEventId,
    pendingEvents = [],
    isLast,
    forwardRef
}: TimelineDayColumnProps & { daySummary?: any }) {
    let formattedDate = '';
    try {
        if (date) {
            formattedDate = format(parseISO(date), 'MM.dd');
        }
    } catch (e) {
        console.error('Error formatting date in TimelineDayColumn:', e);
    }

    const showDate = !!date && !!formattedDate;

    return (
        <div 
            ref={forwardRef} 
            className={cn(
                "relative pl-10 pb-16 pt-2 scroll-mt-32", // Increased scroll-mt
                !isLast && "border-l-2 border-dashed border-primary/20"
            )}
        >
            {/* Day Header - Sticky */}
            <div className="sticky top-0 z-30 -ml-10 mb-8 py-3 bg-white dark:bg-slate-900 flex items-center gap-6 group">
                {/* Marker */}
                <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-4 border-primary shadow-[0_0_20px_rgba(236,91,19,0.3)] z-10 flex items-center justify-center text-primary text-[10px] font-black">
                        {dayIdx + 1}
                    </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-primary/10 pb-2 gap-1">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white transition-colors group-hover:text-primary">{dayIdx + 1}일차</h3>
                            {showDate ? (
                                <span className="text-sm font-bold text-slate-400">{formattedDate} ({dayOfWeek})</span>
                            ) : (
                                <span className="text-sm font-bold text-slate-300 italic">날짜 미정</span>
                            )}
                        </div>
                        {visitSummary && (
                            <p className="text-[13px] text-primary/80 font-bold mt-0.5">
                                {visitSummary}
                            </p>
                        )}
                    </div>

                    {/* Daily Info Summary */}
                    {daySummary && (
                        <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                            {/* Weather */}
                            {daySummary.weather && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="material-symbols-rounded text-sm text-amber-500">{daySummary.weather.icon}</span>
                                    <span className="text-[11px] font-bold hidden sm:inline">{daySummary.weather.temp}° • {daySummary.weather.condition}</span>
                                    <span className="text-[11px] font-bold sm:hidden">{daySummary.weather.temp}°</span>
                                </div>
                            )}

                            {/* Summary Icons */}
                            <div className="flex items-center gap-2">
                                {daySummary.flights?.length > 0 && (
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                        <span className="material-symbols-rounded text-xs">flight</span>
                                        {daySummary.flights.length}
                                    </div>
                                )}
                                {daySummary.accommodations?.length > 0 && (
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 px-2 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                        <span className="material-symbols-rounded text-xs">hotel</span>
                                        {daySummary.accommodations.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Events Staging Area */}
            {pendingEvents.length > 0 && (
                <div className="mb-8 flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-2 px-1">
                        <span className="material-symbols-rounded text-[14px] text-amber-500 font-bold">pending_actions</span>
                        <span className="text-[11px] font-black text-amber-600/80 uppercase tracking-widest">일정 확정 대기</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-amber-200/50 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {pendingEvents.map(event => (
                            <PendingEventCard 
                                key={event.id}
                                event={event}
                                onConfirm={(time, extraData) => {
                                    if (event.autoGeneratedType === 'flight-bundle') {
                                        const parts = JSON.parse(event.memo || '[]');
                                        const updatedParts = parts.map((p: TripEvent) => {
                                            if (p.id.endsWith('-prep')) {
                                                return { ...p, startTime: time, isFixedTime: true, isAutoGenerated: true };
                                            }
                                            if (p.id.endsWith('-arr') && extraData?.entryTime) {
                                                // Calculate end time for entry procedure
                                                // Assuming entryTime is the end time picked by user
                                                return { ...p, endTime: extraData.entryTime, isFixedTime: true, isAutoGenerated: true };
                                            }
                                            return { ...p, isAutoGenerated: true };
                                        });
                                        onAddEvent(dayIdx, updatedParts);
                                    } else {
                                        onAddEvent(dayIdx, {
                                            ...event,
                                            startTime: time,
                                            isFixedTime: true,
                                            isAutoGenerated: true 
                                        });
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Sortable Context for Draggable Events */}
            <div className="space-y-4">
                <SortableContext 
                    items={events.map(e => e.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    {events.map((event) => (
                        <SortableEventCard 
                            key={event.id}
                            event={event}
                            dayIdx={dayIdx}
                            onEdit={(updates) => onEditEvent(dayIdx, updates)}
                            onRemove={(id) => onRemoveEvent(dayIdx, id)}
                            onAddComment={onAddComment}
                            onNavigateToSection={onNavigateToSection}
                            isHighlighted={highlightedEventId === event.id}
                        />
                    ))}
                </SortableContext>

                {/* Quick Add Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAddEvent(dayIdx)}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all group"
                >
                    <div className="p-1 rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">일정 추가</span>
                </motion.button>
            </div>
        </div>
    );
}

'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TimelineDayColumn from './TimelineDayColumn';
import TimelineEventCard from '../TimelineEventCard';
import { TripEvent } from '@pplaner/shared';
import { EnhancedTimelineDay } from '@/hooks/useTimelineData';
import { useTimelineDnd } from '@/hooks/useTimelineDnd';

interface TimelineDayListProps {
    dailyTimeline: EnhancedTimelineDay[];
    onAddEvent: (dayIdx: number, event?: Partial<TripEvent> | Partial<TripEvent>[]) => void;
    onEditEvent: (dayIdx: number, event: Partial<TripEvent>) => void;
    onRemoveEvent: (dayIdx: number, id: string) => void;
    onAddComment?: (eventId: string) => void;
    onNavigateToSection?: (section: string) => void;
    highlightedEventId?: string | null;
    onDayIdxChange?: (idx: number) => void;
}

export default function TimelineDayList({
    dailyTimeline,
    onAddEvent,
    onEditEvent,
    onRemoveEvent,
    onAddComment,
    onNavigateToSection,
    highlightedEventId,
    onDayIdxChange
}: TimelineDayListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const { handleDragStart, handleDragEnd } = useTimelineDnd({
        dailyTimeline,
        setActiveId
    });

    // Robust Scroll Sync with IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = dayRefs.current.indexOf(entry.target as HTMLDivElement);
                        if (idx !== -1) {
                            onDayIdxChange?.(idx);
                        }
                    }
                });
            },
            {
                threshold: 0,
                rootMargin: '-160px 0px -60% 0px' // Detect when the top of the day column enters the viewport near the top
            }
        );

        dayRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [dailyTimeline, onDayIdxChange]);

    const activeEvent = useMemo(() => {
        if (!activeId) return null;
        for (const day of dailyTimeline) {
            const event = day.events.find(e => e.id === activeId);
            if (event) return event;
        }
        return null;
    }, [activeId, dailyTimeline]);

    return (
        <div 
            ref={containerRef}
            className="flex-1 w-full h-0 min-h-full pb-20 overflow-y-auto custom-scrollbar"
        >
            <div className="max-w-4xl mx-auto px-6 py-8">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="space-y-12 pb-32">
                        {dailyTimeline.map((day, dayIdx) => (
                            <TimelineDayColumn 
                                key={`day-${day.day}-${day.date}`}
                                dayIdx={dayIdx}
                                date={day.date}
                                dayOfWeek={day.dayOfWeek || ''}
                                events={day.events}
                                pendingEvents={day.pendingEvents}
                                visitSummary={day.visitSummary}
                                daySummary={day.daySummary}
                                onAddEvent={(idx, event) => {
                                    if (event) {
                                        onAddEvent(idx, event);
                                    } else {
                                        onAddEvent(idx);
                                    }
                                }}
                                onEditEvent={onEditEvent}
                                onRemoveEvent={onRemoveEvent}
                                onAddComment={onAddComment}
                                onNavigateToSection={onNavigateToSection}
                                highlightedEventId={highlightedEventId}
                                isLast={dayIdx === dailyTimeline.length - 1}
                                forwardRef={(el) => dayRefs.current[dayIdx] = el}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeId && activeEvent ? (
                            <div className="w-[calc(100%-2rem)] max-w-lg shadow-2xl rounded-2xl overflow-hidden ring-4 ring-primary/20 opacity-90 scale-105 transition-transform">
                                <TimelineEventCard 
                                    event={activeEvent}
                                    onEdit={() => {}}
                                    onDelete={() => {}}
                                    onNavigateToSection={onNavigateToSection}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

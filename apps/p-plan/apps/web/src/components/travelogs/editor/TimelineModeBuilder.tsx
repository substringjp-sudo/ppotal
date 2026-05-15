'use client';

import { Travelog, TravelogEvent, cn, TravelogDailyPlan, generateId, TRAVELOG_ACTIVITY_CATEGORIES, TRAVELOG_EVENT_CATEGORIES } from '@pplaner/shared';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { LocationSelector } from '@/components/edit-trip/shared/LocationSelector';
import { useTripStore } from '@pplaner/shared';
import { EmotionTriangle } from './EmotionTriangle';
import { ScheduleItemModal } from './ScheduleItemModal';
import { toast } from 'sonner';

/**
 * TimelineModeBuilder - 마우스 중심의 타임라인 데이터 조립기
 */
interface TimelineModeBuilderProps {
    travelog: Travelog;
    onUpdateTimeline: (timeline: TravelogDailyPlan[]) => void;
    onAddDay?: () => void;
    onAddEventToEditor?: (type: 'event' | 'activity', eventData: TravelogEvent) => void;
    onUpdateEventInEditor?: (eventData: TravelogEvent) => void;
    usedIds?: string[];
    isMinimized?: boolean;
    isSimpleMode?: boolean;
    activeDayIndex?: number;
    highlightedEventId?: string | null;
    onEventHover?: (id: string | null) => void;
    onEventClick?: (id: string) => void;
}

export default function TimelineModeBuilder({ 
    travelog, 
    onUpdateTimeline, 
    onAddDay,
    onAddEventToEditor,
    onUpdateEventInEditor,
    usedIds = [],
    isMinimized = false,
    isSimpleMode = false,
    activeDayIndex = 0,
    highlightedEventId = null,
    onEventHover,
    onEventClick
}: TimelineModeBuilderProps) {
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // 하이라이트된 이벤트로 스크롤하는 로직 개선
    useEffect(() => {
        if (highlightedEventId) {
            const element = document.getElementById(`timeline-event-${highlightedEventId}`);
            if (element) {
                // 부모 컨테이너를 찾아 스크롤
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }
    }, [highlightedEventId]);
    
    // 활성화된 날짜로 스크롤하는 로직
    useEffect(() => {
        if (activeDayIndex !== undefined && travelog.timeline[activeDayIndex]) {
            const day = travelog.timeline[activeDayIndex];
            const element = document.getElementById(`timeline-day-${day.day}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [activeDayIndex]);

    const handleReorder = (dayIndex: number, newEvents: TravelogEvent[]) => {
        const newTimeline = [...travelog.timeline];
        // 단순 모드일 때는 시간 자동 정렬을 하지 않고 사용자가 드래그한 순서를 존중함
        // 만약 시간이 설정되어 있다면, 앞뒤 순서에 맞춰 시간을 살짝 조정해주는 로직을 넣을 수도 있으나
        // 여기서는 일단 순서만 바꿈
        newTimeline[dayIndex].events = newEvents;
        onUpdateTimeline(newTimeline);
    };
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        dayIndex: number;
        event: TravelogEvent | null;
        isAutoFilled: boolean;
        isNew: boolean;
    }>({
        isOpen: false,
        dayIndex: 0,
        event: null,
        isAutoFilled: false,
        isNew: false
    });

    const openEventModal = (dayIndex: number, eventData: TravelogEvent) => {
        let isAutoFilled = false;
        let finalEvent = { ...eventData };

        // 숙박 정보 자동 완성 로직
        if ((eventData.mainCategory as any) === '숙박' || (eventData.mainCategory as any) === 'Stay' || eventData.mainCategory === 'accommodation') {
            // 이전 날짜들 탐색
            for (let i = dayIndex; i >= 0; i--) {
                const dayEvents = travelog.timeline[i]?.events || [];
                const previousStay = dayEvents.find(e => 
                    ((e.mainCategory as any) === '숙박' || (e.mainCategory as any) === 'Hotel' || e.mainCategory === 'accommodation') && 
                    e.details?.hotelName && e.id !== eventData.id
                );

                if (previousStay) {
                    finalEvent = {
                        ...finalEvent,
                        title: previousStay.title,
                        location: previousStay.location,
                        details: {
                            ...finalEvent.details,
                            hotelName: previousStay.details?.hotelName,
                            checkInTime: previousStay.details?.checkInTime,
                            checkOutTime: previousStay.details?.checkOutTime,
                            nights: previousStay.details?.nights,
                            heads: previousStay.details?.heads,
                            roomCount: previousStay.details?.roomCount,
                            bedCount: previousStay.details?.bedCount,
                        }
                    };
                    isAutoFilled = true;
                    break;
                }
            }
        }

        setModalConfig({
            isOpen: true,
            dayIndex,
            event: finalEvent,
            isAutoFilled,
            isNew: false
        });
    };

    const getDayCapacityInfo = (dayIndex: number) => {
        const events = travelog.timeline[dayIndex]?.events || [];
        const activities = events
            .filter(e => e.type === 'activity' && e.startTime && e.endTime)
            .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));
        
        let totalBusyMinutes = 0;
        activities.forEach(a => {
            const [sh, sm] = a.startTime!.split(':').map(Number);
            const [eh, em] = a.endTime!.split(':').map(Number);
            totalBusyMinutes += (eh * 60 + em) - (sh * 60 + sm);
        });

        const isFull = totalBusyMinutes >= 1439; // 23:59
        
        const getBestTimes = (type: 'event' | 'activity') => {
            if (activities.length === 0) {
                return type === 'event' 
                    ? { time: '09:00' } 
                    : { startTime: '09:00', endTime: '10:00' };
            }

            const lastActivity = activities[activities.length - 1];
            if (lastActivity.endTime! < '23:59') {
                const start = lastActivity.endTime!;
                const [sh, sm] = start.split(':').map(Number);
                const endValue = Math.min(sh * 60 + sm + 60, 1439);
                const eh = Math.floor(endValue / 60).toString().padStart(2, '0');
                const em = (endValue % 60).toString().padStart(2, '0');
                
                return type === 'event' 
                    ? { time: start } 
                    : { startTime: start, endTime: `${eh}:${em}` };
            }

            // Find latest gap before the end of the day
            for (let i = activities.length - 1; i > 0; i--) {
                const curr = activities[i];
                const prev = activities[i-1];
                if (prev.endTime! < curr.startTime!) {
                    const start = prev.endTime!;
                    const [sh, sm] = start.split(':').map(Number);
                    const [csh, csm] = curr.startTime!.split(':').map(Number);
                    const gapMins = (csh * 60 + csm) - (sh * 60 + sm);
                    const endValue = sh * 60 + sm + Math.min(60, gapMins);
                    const eh = Math.floor(endValue / 60).toString().padStart(2, '0');
                    const em = (endValue % 60).toString().padStart(2, '0');
                    
                    return type === 'event' 
                        ? { time: start } 
                        : { startTime: start, endTime: `${eh}:${em}` };
                }
            }

            // Check before first activity
            if (activities[0].startTime! > '00:00') {
                const start = '00:00';
                const [csh, csm] = activities[0].startTime!.split(':').map(Number);
                const gapMins = (csh * 60 + csm);
                const endValue = Math.min(60, gapMins);
                const eh = Math.floor(endValue / 60).toString().padStart(2, '0');
                const em = (endValue % 60).toString().padStart(2, '0');
                
                return type === 'event' 
                    ? { time: start } 
                    : { startTime: start, endTime: `${eh}:${em}` };
            }

            return type === 'event' 
                ? { time: '12:00' } 
                : { startTime: '12:00', endTime: '13:00' };
        };

        return { isFull, getBestTimes };
    };

    const sortEventsByTime = (events: TravelogEvent[]) => {
        return [...events].sort((a, b) => {
            const timeA = a.type === 'activity' ? (a.startTime || '00:00') : (a.time || '00:00');
            const timeB = b.type === 'activity' ? (b.startTime || '00:00') : (b.time || '00:00');
            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;
            if (a.type === 'activity' && b.type === 'event') return -1;
            if (a.type === 'event' && b.type === 'activity') return 1;
            return 0;
        });
    };

    const addEvent = (dayIndex: number, type: 'event' | 'activity') => {
        const { isFull, getBestTimes } = getDayCapacityInfo(dayIndex);
        if (isFull) {
            toast.error('이날의 일정이 23:59까지 모두 차 있어 더 이상 추가할 수 없습니다.');
            return;
        }

        const defaultTimes = getBestTimes(type);
        const newEvent: TravelogEvent = {
            id: generateId(),
            type,
            title: '',
            ...defaultTimes,
            mainCategory: type === 'activity' ? '기타' : '행동' as any,
        };

        setModalConfig({
            isOpen: true,
            dayIndex,
            event: newEvent,
            isAutoFilled: false,
            isNew: true
        });
    };

    const deleteEvent = (dayIndex: number, eventId: string) => {
        const newTimeline = [...travelog.timeline];
        newTimeline[dayIndex].events = sortEventsByTime(newTimeline[dayIndex].events.filter(e => e.id !== eventId));
        onUpdateTimeline(newTimeline);
    };

    const updateEvent = (dayIndex: number, eventId: string, updates: Partial<TravelogEvent>) => {
        const newTimeline = [...travelog.timeline];
        
        // 활동 시간 중첩 검사 로직 (재귀적 탐색 지원)
        const checkOverlap = (events: TravelogEvent[], updatedEvent: Partial<TravelogEvent>, id: string): boolean => {
            if (updatedEvent.type !== 'activity' || !updatedEvent.startTime || !updatedEvent.endTime) return false;
            
            return events.some(e => {
                if (e.id === id || e.type !== 'activity') return false;
                const s1 = updatedEvent.startTime!;
                const s2 = e.startTime!;
                const e1 = updatedEvent.endTime!;
                const e2 = e.endTime!;
                return s1 < e2 && e1 > s2;
            });
        };

        if (updates.type === 'activity' && (updates.startTime || updates.endTime)) {
            const currentEvent = newTimeline[dayIndex].events.find(e => e.id === eventId);
            const fullEvent = { ...currentEvent, ...updates };
            if (checkOverlap(newTimeline[dayIndex].events, fullEvent, eventId)) {
                toast.error('활동 시간이 다른 활동과 겹칠 수 없습니다.');
                return;
            }
        }

        newTimeline[dayIndex].events = sortEventsByTime(newTimeline[dayIndex].events.map(e => {
            if (e.id === eventId) return { ...e, ...updates };
            // 하위 이벤트 업데이트 지원
            if (e.subEvents) {
                return {
                    ...e,
                    subEvents: sortEventsByTime(e.subEvents.map(se => se.id === eventId ? { ...se, ...updates } : se))
                };
            }
            return e;
        }));
        onUpdateTimeline(newTimeline);
    };

    const addSubEvent = (dayIndex: number, parentId: string) => {
        const newTimeline = [...travelog.timeline];
        const parent = newTimeline[dayIndex].events.find(e => e.id === parentId);
        if (!parent) return;

        const newEvent: TravelogEvent = {
            id: generateId(),
            type: 'event',
            title: '활동 내 새로운 이벤트',
            time: parent.startTime || '12:00',
            mainCategory: '행동' as any,
            imageUrls: []
        };

        newTimeline[dayIndex].events = sortEventsByTime(newTimeline[dayIndex].events.map(e => 
            e.id === parentId ? { ...e, subEvents: sortEventsByTime([...(e.subEvents || []), newEvent]) } : e
        ));
        onUpdateTimeline(newTimeline);
        setEditingEventId(newEvent.id);
    };

    const transferPhotoToSubEvent = (dayIndex: number, parentId: string, eventId: string, imageUrl: string) => {
        const newTimeline = [...travelog.timeline];
        const parent = newTimeline[dayIndex].events.find(e => e.id === parentId);
        if (!parent || !parent.imageUrls) return;

        // 부모 활동에서 사진 제거 및 하위 이벤트로 할당
        newTimeline[dayIndex].events = newTimeline[dayIndex].events.map(e => {
            if (e.id === parentId) {
                return {
                    ...e,
                    imageUrls: e.imageUrls?.filter(url => url !== imageUrl),
                    subEvents: e.subEvents?.map(se => 
                        se.id === eventId ? { ...se, imageUrls: [...(se.imageUrls || []), imageUrl] } : se
                    )
                };
            }
            return e;
        });
        onUpdateTimeline(newTimeline);
        toast.success('사진이 이벤트로 할당되었습니다.');
    };

    return (
        <div className={cn(
            "flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden",
            isMinimized ? "p-4" : "p-8"
        )}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">타임라인 빌더</h3>
                    </div>
                    {!isMinimized && <p className="text-[11px] font-bold text-slate-500 mt-1">마우스로 정밀하게 일정을 조립하세요</p>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scrollbar pb-20">
                {travelog.timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[48px] bg-white/50 dark:bg-slate-900/30">
                        <div className="w-20 h-20 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-8 shadow-sm">
                            <span className="material-symbols-rounded text-4xl text-slate-300">calendar_today</span>
                        </div>
                        
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">여행 일정을 시작하세요</h4>
                        <div className="flex flex-col items-center gap-1 mb-8">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PLANNED DATES</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                    {travelog.startDate ? format(parseISO(travelog.startDate), 'yyyy.MM.dd') : '시작일'}
                                </div>
                                <span className="text-slate-300">→</span>
                                <div className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                    {travelog.endDate ? format(parseISO(travelog.endDate), 'yyyy.MM.dd') : '종료일'}
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] font-bold text-slate-400 text-center leading-relaxed mb-10">
                            마법사에서 설정한 날짜가 연동되었습니다.<br/>
                            왼쪽 메뉴나 아래 버튼을 눌러 첫 날의 기록을 시작해보세요!
                        </p>

                        <button 
                            onClick={() => onAddDay?.()}
                            className="group relative px-8 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[24px] text-xs font-black uppercase tracking-widest overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <span className="relative flex items-center gap-2">
                                Day 1 생성 <span className="material-symbols-rounded text-sm">rocket_launch</span>
                            </span>
                        </button>
                    </div>
                ) : (
                    travelog.timeline.map((day, dIdx) => {
                        // Simple 모드에서도 이제 모든 날짜를 한 번에 보여주어 전체 흐름을 파악하기 쉽게 함

                        return (
                            <div key={dIdx} id={`timeline-day-${day.day}`} className={cn("relative group/day", isSimpleMode ? "mb-10" : "mb-20")}>
                             {/* Optimized Sticky Header */}
                             <div className="sticky top-0 z-20 mb-8 px-1">
                                <div className="flex items-center gap-4 bg-slate-900 dark:bg-white p-4 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-white/5 border border-white/10 dark:border-slate-200">
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-black text-primary italic leading-none">D{day.day}</span>
                                            <span className="text-[10px] font-black text-white dark:text-slate-900 uppercase tracking-widest">{format(parseISO(day.date), 'EEE, MMM dd')}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                                            {day.events.length}개 이벤트 • {day.events.filter(e => e.type === 'activity').length}개 활동
                                        </p>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => addEvent(dIdx, 'activity')}
                                            disabled={getDayCapacityInfo(dIdx).isFull}
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg",
                                                getDayCapacityInfo(dIdx).isFull 
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed shadow-none" 
                                                    : "bg-primary text-white hover:scale-110 active:scale-95 shadow-primary/30"
                                            )}
                                            title={getDayCapacityInfo(dIdx).isFull ? "오늘 일정이 모두 찼습니다" : "활동 추가"}
                                        >
                                            <span className="material-symbols-rounded text-lg">
                                                {getDayCapacityInfo(dIdx).isFull ? 'block' : 'add'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                             </div>
                             
                                 <Reorder.Group 
                                    axis="y" 
                                    values={day.events} 
                                    onReorder={(newEvents) => handleReorder(dIdx, newEvents)}
                                    className="relative pl-6 space-y-6"
                                >
                                    {/* Shared Connector Line */}
                                    <div className="absolute left-[3px] top-4 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />

                                    <AnimatePresence mode="popLayout">
                                        {day.events.map((event) => (
                                            <Reorder.Item 
                                                value={event}
                                                key={event.id}
                                                id={`timeline-event-${event.id}`}
                                                onMouseEnter={() => onEventHover?.(event.id)}
                                                onMouseLeave={() => onEventHover?.(null)}
                                                onClick={() => onEventClick?.(event.id)}
                                                className={cn(
                                                    "group/event relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                                                    event.type === 'activity' 
                                                        ? "bg-primary/[0.02] border-primary/10 border-l-4 border-l-primary shadow-sm hover:shadow-md hover:bg-primary/[0.04]" 
                                                        : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md",
                                                    (editingEventId === event.id || highlightedEventId === event.id) && "bg-white dark:bg-slate-800 border-primary ring-4 ring-primary/5 shadow-xl scale-[1.02] z-20"
                                                )}
                                            >
                                                {/* Drag Handle */}
                                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/event:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-30">
                                                    <span className="material-symbols-rounded text-slate-300 hover:text-primary">drag_indicator</span>
                                                </div>
                                            {/* Centered Step Indicator */}
                                            <div className="absolute -left-[24.5px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 z-10 flex items-center justify-center group-hover/event:border-primary transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 group-hover/event:bg-primary transition-colors" />
                                            </div>

                                            {/* Floating Actions on Hover */}
                                            <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover/event:opacity-100 transition-all pointer-events-none group-hover/event:pointer-events-auto z-30 scale-90 group-hover/event:scale-100 origin-right">
                                                {!isSimpleMode && (
                                                    <button 
                                                        onClick={() => onAddEventToEditor?.(event.type, event)}
                                                        disabled={usedIds.includes(event.id)}
                                                        className={cn(
                                                            "w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 transition-all hover:scale-110",
                                                            usedIds.includes(event.id) ? "text-emerald-500" : "text-slate-400 hover:text-primary"
                                                        )}
                                                        title="본문에 추가"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">
                                                            {usedIds.includes(event.id) ? 'check_circle' : 'post_add'}
                                                        </span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => openEventModal(dIdx, event)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary transition-all hover:scale-110"
                                                >
                                                    <span className="material-symbols-rounded text-sm">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => deleteEvent(dIdx, event.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-rose-500 transition-all hover:scale-110"
                                                >
                                                    <span className="material-symbols-rounded text-sm">delete</span>
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3">
                                                 <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={cn(
                                                        "px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all shrink-0",
                                                        event.type === 'activity' ? "text-primary ring-1 ring-primary/20" : "text-slate-400"
                                                    )}>
                                                        {event.type === 'activity' 
                                                            ? `${event.startTime} — ${event.endTime}` 
                                                            : (event.time || event.startTime || '12:00')}
                                                    </span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-[0.2em] border shrink-0",
                                                        event.type === 'activity' ? "border-primary/20 text-primary" : "border-slate-200 dark:border-slate-800 text-slate-300"
                                                    )}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                            </div>

                                            {editingEventId === event.id ? (
                                                <div className="space-y-4 pt-2">
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        value={event.title}
                                                        onChange={(e) => updateEvent(dIdx, event.id, { title: e.target.value })}
                                                        onBlur={() => setEditingEventId(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingEventId(null)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-primary/20"
                                                        placeholder="일정 이름"
                                                    />
                                                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">수정 후 Enter를 치거나 바깥을 클릭하세요</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate pr-10">{event.title}</h4>
                                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mt-2">
                                                                 <span className="material-symbols-rounded text-xs">location_on</span>
                                                                <span className="truncate">
                                                                    {typeof event.location === 'string' 
                                                                        ? (event.location || '장소 정보 없음') 
                                                                        : (event.location?.name || '장소 정보 없음')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button 
                                    onClick={() => addEvent(dIdx, 'event')}
                                    disabled={getDayCapacityInfo(dIdx).isFull}
                                    className={cn(
                                        "py-3 border rounded-2xl text-[9px] font-black transition-all uppercase tracking-widest flex items-center justify-center gap-1.5",
                                        getDayCapacityInfo(dIdx).isFull 
                                            ? "border-slate-200 dark:border-slate-800 opacity-30 text-slate-300 cursor-not-allowed" 
                                            : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary hover:border-primary/30"
                                    )}
                                >
                                    <span className="material-symbols-rounded text-sm">event</span>
                                    이벤트
                                </button>
                                <button 
                                    onClick={() => addEvent(dIdx, 'activity')}
                                    disabled={getDayCapacityInfo(dIdx).isFull}
                                    className={cn(
                                        "py-3 border rounded-2xl text-[9px] font-black transition-all uppercase tracking-widest flex items-center justify-center gap-1.5",
                                        getDayCapacityInfo(dIdx).isFull 
                                            ? "border-slate-200 dark:border-slate-800 opacity-30 text-slate-300 cursor-not-allowed" 
                                            : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary hover:border-primary/30"
                                    )}
                                >
                                    <span className="material-symbols-rounded text-sm">history_toggle_off</span>
                                    활동
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

            {/* 상세 편집 모달 */}
            {modalConfig.event && (
                <ScheduleItemModal 
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    initialData={modalConfig.event}
                    isAutoFilled={modalConfig.isAutoFilled}
                    dayEvents={travelog.timeline[modalConfig.dayIndex]?.events || []}
                    onSave={(updatedEvent) => {
                        const newTimeline = [...travelog.timeline];
                        const dayEvents = newTimeline[modalConfig.dayIndex].events;
                        
                        const existingIdx = dayEvents.findIndex(e => e.id === updatedEvent.id);
                        if (existingIdx !== -1) {
                            dayEvents[existingIdx] = updatedEvent;
                        } else if (updatedEvent.id) {
                            dayEvents.push(updatedEvent);
                        } else {
                            updatedEvent.id = generateId();
                            dayEvents.push(updatedEvent);
                        }
                        
                        newTimeline[modalConfig.dayIndex].events = sortEventsByTime(dayEvents);
                        onUpdateTimeline(newTimeline);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        
                        // 에디터 연동 최적화
                        if (modalConfig.isNew) {
                            // 명시적으로 새로 생성된 경우에만 추가
                            if (onAddEventToEditor) {
                                onAddEventToEditor(updatedEvent.type, updatedEvent);
                            }
                        } else {
                            // 기존 항목 수정인 경우 업데이트만 시도
                            if (onUpdateEventInEditor) {
                                onUpdateEventInEditor(updatedEvent);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}

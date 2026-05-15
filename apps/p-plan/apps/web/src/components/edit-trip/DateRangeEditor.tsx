'use client';

import { useEffect, useState, useMemo } from 'react';
import { CustomCheckbox } from '@/components/common/FormComponents';
import { motion, AnimatePresence } from 'framer-motion';
import {
    addDays,
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isWithinInterval,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    differenceInDays,
    parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DateRangeEditorProps {
    startDate: string;
    endDate: string;
    flexibility: number;
    onUpdate: (updates: { startDate: string, endDate: string, flexibilityDays?: number, isUndecided?: boolean }) => void;
    isUndecided?: boolean;
    existingData?: Record<string, string[]>; // { '2024-05-01': ['event', 'accommodation'] }
}

export default function DateRangeEditor({
    startDate,
    endDate,
    flexibility,
    onUpdate,
    isUndecided: initialIsUndecided,
    existingData
}: DateRangeEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [dragMode, setDragMode] = useState<'NONE' | 'RANGE' | 'START' | 'END'>('NONE');
    const [dragStartPoint, setDragStartPoint] = useState<Date | null>(null);

    const start = useMemo(() => startDate ? parseISO(startDate) : null, [startDate]);
    const end = useMemo(() => endDate ? parseISO(endDate) : null, [endDate]);

    // When expansion happens, if we have a start date, jump to that month
    useEffect(() => {
        if (isExpanded && start) {
            setViewDate(start);
        }
    }, [isExpanded, start]);

    const days = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [viewDate]);

    const handleDayMouseDown = (day: Date, mode: 'RANGE' | 'START' | 'END' = 'RANGE') => {
        if (initialIsUndecided) return;
        setDragMode(mode);

        if (mode === 'RANGE') {
            onUpdate({ startDate: format(day, 'yyyy-MM-dd'), endDate: '', flexibilityDays: flexibility });
            setDragStartPoint(day);
        } else {
            setDragStartPoint(null);
        }
    };

    const handleMouseEnter = (day: Date) => {
        if (initialIsUndecided || dragMode === 'NONE') return;

        if (dragMode === 'RANGE' && dragStartPoint) {
            if (day < dragStartPoint) {
                onUpdate({ startDate: format(day, 'yyyy-MM-dd'), endDate: format(dragStartPoint, 'yyyy-MM-dd') });
            } else {
                onUpdate({ startDate: format(dragStartPoint, 'yyyy-MM-dd'), endDate: format(day, 'yyyy-MM-dd') });
            }
        } else if (dragMode === 'START' && end) {
            if (day <= end) {
                onUpdate({ startDate: format(day, 'yyyy-MM-dd'), endDate });
            }
        } else if (dragMode === 'END' && start) {
            if (day >= start) {
                onUpdate({ startDate, endDate: format(day, 'yyyy-MM-dd') });
            }
        }
    };

    const handleMouseUp = () => {
        setDragMode('NONE');
        setDragStartPoint(null);
    };

    const effectiveDuration = start && end ? differenceInDays(end, start) + 1 : 0;
    const durationLabel = effectiveDuration === 1 ? '당일치기' : effectiveDuration > 1 ? `${effectiveDuration - 1}박 ${effectiveDuration}일` : '';

    const potentialLoss = useMemo(() => {
        if (!existingData || !startDate || !endDate || !start || !end) return [];
        
        const initialStart = parseISO(startDate);
        const initialEnd = parseISO(endDate);
        
        // If duration is the same, it's a shift operation - no loss occurs in our smart logic
        const initialDuration = differenceInDays(initialEnd, initialStart) + 1;
        const currentDuration = differenceInDays(end, start) + 1;
        if (initialDuration === currentDuration && !isSameDay(initialStart, start)) {
            return [];
        }

        const lostDays: { date: string, types: string[] }[] = [];

        // Check each day in the ORIGINAL range
        eachDayOfInterval({ start: initialStart, end: initialEnd }).forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (existingData[dateStr] && existingData[dateStr].length > 0) {
                // If this day is NOT in the NEW range
                if (!isWithinInterval(day, { start, end })) {
                    lostDays.push({ date: dateStr, types: existingData[dateStr] });
                }
            }
        });

        return lostDays;
    }, [existingData, startDate, endDate, start, end]);

    const formatDateStr = (date: Date | null) => {
        if (!date) return '';
        return format(date, 'yyyy년 MM월 dd일 eeee', { locale: ko });
    };

    return (
        <div className="space-y-3" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between items-center px-1">
                여행 일정
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary text-[10px] font-black uppercase hover:underline"
                >
                    {isExpanded ? '접기' : '변경하기'}
                </button>
            </label>

            {/* Collapsed View */}
            {!isExpanded ? (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full flex items-center gap-3 p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-primary transition-all group shadow-sm text-left"
                >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                        <span className="material-symbols-rounded text-xl">calendar_month</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        {initialIsUndecided ? (
                            <div className="text-xs font-black text-slate-900 dark:text-white">날짜 미정</div>
                        ) : (
                            <div className="space-y-0.5">
                                <div className="text-[11px] font-black text-slate-900 dark:text-white flex items-center leading-none">
                                    <span className="whitespace-nowrap">{start ? format(start, 'yyyy.MM.dd') : '시작일'}</span>
                                    <span className="text-slate-300 dark:text-slate-600 mx-1.5">-</span>
                                    <span className="whitespace-nowrap">{end ? format(end, 'yyyy.MM.dd') : '종료일'}</span>
                                    {flexibility > 0 && (
                                        <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-black whitespace-nowrap inline-flex items-center ml-1.5">
                                            ±{flexibility}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {durationLabel}
                                </div>
                            </div>
                        )}
                    </div>
                    <span className="material-symbols-rounded ml-auto text-slate-300 text-base">expand_more</span>
                </button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-8"
                >
                    <div className="flex flex-col gap-8 select-none">
                        {/* Calendar - Center it or keep it accessible */}
                        <div className="w-full max-w-[320px] mx-auto">
                            <div className={cn("space-y-4 transition-all duration-300", initialIsUndecided ? "opacity-30 grayscale pointer-events-none" : "opacity-100")}>
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="font-black text-slate-800 dark:text-white text-sm">
                                        {format(viewDate, 'yyyy년 M월')}
                                    </h4>
                                    <div className="flex gap-1">
                                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <span className="material-symbols-rounded text-base">chevron_left</span>
                                        </button>
                                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <span className="material-symbols-rounded text-base">chevron_right</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                                        <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>
                                    ))}
                                    {days.map(day => {
                                        const isSelectedRange = start && end && isWithinInterval(day, { start, end });
                                        const isStart = start && isSameDay(day, start);
                                        const isEnd = end && isSameDay(day, end);
                                        const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(viewDate));

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    handleDayMouseDown(day);
                                                }}
                                                onMouseEnter={() => handleMouseEnter(day)}
                                                className={cn(
                                                    "aspect-square flex items-center justify-center text-[11px] font-bold rounded-lg cursor-pointer transition-all relative group",
                                                    !isCurrentMonth && "text-slate-300 dark:text-slate-700",
                                                    isSelectedRange && "bg-primary/10 text-primary rounded-none",
                                                    isStart && "bg-primary text-white rounded-l-lg scale-105 z-10 shadow-lg",
                                                    isEnd && "bg-primary text-white rounded-r-lg scale-105 z-10 shadow-lg",
                                                    isStart && isEnd && "rounded-lg"
                                                )}
                                            >
                                                {format(day, 'd')}
                                                {isStart && (
                                                    <div
                                                        className="absolute -left-1 w-2.5 h-5 bg-white dark:bg-slate-800 border-2 border-primary rounded-full cursor-ew-resize flex items-center justify-center shadow-md z-20"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleDayMouseDown(day, 'START');
                                                        }}
                                                    >
                                                        <div className="w-0.5 h-2 bg-primary rounded-full" />
                                                    </div>
                                                )}
                                                {isEnd && (
                                                    <div
                                                        className="absolute -right-1 w-2.5 h-5 bg-white dark:bg-slate-800 border-2 border-primary rounded-full cursor-ew-resize flex items-center justify-center shadow-md z-20"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleDayMouseDown(day, 'END');
                                                        }}
                                                    >
                                                        <div className="w-0.5 h-2 bg-primary rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Controls - Positioned below the calendar */}
                        <div className="w-full space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {durationLabel || '기간 선택'}
                                </h4>
                                <CustomCheckbox
                                    checked={!!initialIsUndecided}
                                    onChange={(checked: boolean) => onUpdate({ startDate: '', endDate: '', isUndecided: checked })}
                                    label="날짜 미정"
                                    size="sm"
                                />
                            </div>

                            {!initialIsUndecided && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">여행 기간</span>
                                            <span className="text-primary text-[10px] font-black">{effectiveDuration}일</span>
                                        </div>
                                        <div className="relative pt-2">
                                            <input
                                                type="range"
                                                min="1" max="31"
                                                value={effectiveDuration || 1}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (start) {
                                                        onUpdate({
                                                            startDate,
                                                            endDate: format(addDays(start, val - 1), 'yyyy-MM-dd')
                                                        });
                                                    }
                                                }}
                                                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between mt-2">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">1일</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">31일</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">여유 일정 (플렉서블)</span>
                                            <span className="text-primary text-[10px] font-black">±{flexibility}일</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="7"
                                            value={flexibility}
                                            onChange={(e) => onUpdate({ startDate, endDate, flexibilityDays: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Data Loss Warning */}
                            <AnimatePresence>
                                {potentialLoss.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 space-y-3"
                                    >
                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <span className="material-symbols-rounded text-xl">warning</span>
                                            <p className="text-xs font-black uppercase tracking-tight">선택한 날짜 범위에서 제외되는 일정이 있습니다</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            {potentialLoss.map(loss => (
                                                <div key={loss.date} className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-slate-600 dark:text-slate-300 italic">{format(parseISO(loss.date), 'M월 d일')}</span>
                                                    <div className="flex gap-1">
                                                        {loss.types.map(type => (
                                                            <span key={type} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded uppercase text-[8px]">
                                                                {type === 'event' ? '일정' : type === 'accommodation' ? '숙소' : type === 'flight' ? '항공' : type === 'transport' ? '교통' : type === 'reservation' ? '예약' : type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] font-bold text-red-500/80 italic leading-tight">
                                            * 설정 완료를 누르면 해당 날짜의 위 항목들은 삭제됩니다. 신중하게 선택해 주세요.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Tips - Wide layout at the bottom */}
                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 w-full">
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed text-center italic flex items-center justify-center gap-2">
                                    <span className="material-symbols-rounded text-sm text-primary/60">lightbulb</span>
                                    캘린더에서 날짜를 클릭하거나 드래그하여 기간을 설정할 수 있습니다. 슬라이더를 통해 기간을 미세 조정하세요.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsExpanded(false)}
                        className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"
                    >
                        설정 완료
                    </button>
                </motion.div>
            )}
        </div>
    );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { useWizardStore } from '@pplaner/shared';
import { format, addDays, isSameDay, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DatesStep() {
    const { 
        startDate, endDate, setDates, durationDays, setDuration, isDateUndecided, setDateUndecided, isFlexDays, setFlexDays, flexibility
    } = useWizardStore();

    const [viewDate, setViewDate] = React.useState(startDate ? new Date(startDate) : new Date());
    const [dragMode, setDragMode] = React.useState<'none' | 'new' | 'adjust-start' | 'adjust-end'>('none');
    const [dragStartPoint, setDragStartPoint] = React.useState<Date | null>(null);

    const days = ['일', '월', '화', '수', '목', '금', '토'];

    // Move to next/prev month helpers
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDateDay = getDay(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const applyPreset = (duration: number) => {
        const start = startDate ? new Date(startDate) : new Date();
        const end = addDays(start, duration);
        setDates(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    };

    const handleMouseDown = (date: Date, mode: 'new' | 'adjust-start' | 'adjust-end' = 'new') => {
        if (isDateUndecided) return;
        setDragMode(mode);
        setDragStartPoint(date);
        
        if (mode === 'new') {
            setDates(format(date, 'yyyy-MM-dd'), '');
        }
    };

    const handleMouseEnter = (date: Date) => {
        if (dragMode === 'none' || !dragStartPoint) return;

        const startStr = format(dragStartPoint, 'yyyy-MM-dd');
        const currentStr = format(date, 'yyyy-MM-dd');

        if (dragMode === 'new') {
            if (isBefore(date, dragStartPoint)) {
                setDates(currentStr, startStr);
            } else {
                setDates(startStr, currentStr);
            }
        } else if (dragMode === 'adjust-start') {
            if (endDate && !isAfter(date, new Date(endDate))) {
                setDates(currentStr, endDate);
            }
        } else if (dragMode === 'adjust-end') {
            if (startDate && !isBefore(date, new Date(startDate))) {
                setDates(startDate, currentStr);
            }
        }
    };

    const handleMouseUp = () => {
        setDragMode('none');
        setDragStartPoint(null);
    };

    React.useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const isInRange = (date: Date) => {
        if (!startDate || !endDate) return false;
        const d = new Date(format(date, 'yyyy-MM-dd'));
        const s = new Date(startDate);
        const e = new Date(endDate);
        return d > s && d < e;
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                }
            }}
            className="space-y-6 pb-10"
        >
            {/* Header / Undecided Toggle */}
            <motion.div 
                variants={{
                    hidden: { opacity: 0, y: -10 },
                    visible: { opacity: 1, y: 0 }
                }}
                className="flex items-center justify-between px-2"
            >
                <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 truncate">
                        <span className="w-1.5 h-6 bg-primary rounded-full shrink-0" />
                        언제 떠나시나요?
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 pl-4 uppercase tracking-[0.2em] truncate">Travel period & Flexibility</p>
                </div>
                <div className="flex items-center gap-6 shrink-0 ml-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <span className="text-[10px] font-black text-slate-500 group-hover:text-primary transition-colors whitespace-nowrap">날짜 미정</span>
                        <input
                            type="checkbox"
                            checked={isDateUndecided}
                            onChange={(e) => setDateUndecided(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-primary checked:border-primary transition-all appearance-none cursor-pointer"
                            aria-label="날짜 미정 선택"
                        />
                    </label>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Left Sidebar: Presets (xl:col-span-3) */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 }
                    }}
                    className={cn(
                        "lg:col-span-3 xl:col-span-2 space-y-3 transition-all duration-700 order-2 lg:order-1",
                        isDateUndecided && "opacity-20 grayscale pointer-events-none"
                    )}
                >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Presets</p>
                    <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
                        {[
                            { label: '주말 힐링', sub: '2박 3일', days: 2, icon: 'wb_sunny' },
                            { label: '일주일 휴가', sub: '6박 7일', days: 6, icon: 'beach_access' },
                            { label: '보름 살기', sub: '14박 15일', days: 14, icon: 'home_work' },
                            { label: '한달 살기', sub: '29박 30일', days: 29, icon: 'explore' }
                        ].map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => applyPreset(preset.days)}
                                className="group shrink-0 h-20 w-32 lg:w-full rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-lg transition-all text-left px-4 flex flex-col justify-center active:scale-95"
                            >
                                <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition-colors text-lg mb-1">{preset.icon}</span>
                                <div className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">{preset.label}</div>
                                <div className="text-[9px] font-bold text-slate-400">{preset.sub}</div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* 2. Center: Calendar (lg:col-span-9 xl:col-span-6) */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, scale: 0.98 },
                        visible: { opacity: 1, scale: 1 }
                    }}
                    className={cn(
                        "lg:col-span-9 xl:col-span-6 transition-all duration-700 order-1 lg:order-2",
                        isDateUndecided && "opacity-20 grayscale scale-95 pointer-events-none"
                    )}
                >
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[32px] p-6 lg:pt-8 lg:px-8 lg:pb-12 border border-slate-200/50 dark:border-slate-800 shadow-2xl relative">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                    {format(viewDate, 'yyyy년 MM월')}
                                </h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewDate(addDays(monthStart, -1))}
                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center justify-center shadow-sm"
                                    >
                                        <span className="material-symbols-rounded text-slate-400">chevron_left</span>
                                    </button>
                                    <button
                                        onClick={() => setViewDate(addDays(monthEnd, 1))}
                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center justify-center shadow-sm"
                                    >
                                        <span className="material-symbols-rounded text-slate-400">chevron_right</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-4 text-[10px] font-black text-center uppercase text-slate-400">
                                {days.map(d => <div key={d} className={cn(d === '일' && "text-red-400/70", d === '토' && "text-blue-400/70")}>{d}</div>)}
                            </div>

                            <div className="grid grid-cols-7 gap-y-1 select-none">
                                {Array.from({ length: startDateDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                                {calendarDays.map(date => {
                                    const isStart = startDate && isSameDay(date, new Date(startDate));
                                    const isEnd = endDate && isSameDay(date, new Date(endDate));
                                    const inRange = isInRange(date);
                                    const isPast = isBefore(date, new Date(format(new Date(), 'yyyy-MM-dd')));

                                    return (
                                        <div 
                                            key={date.toString()} 
                                            className="h-12 w-full relative"
                                            onMouseEnter={() => handleMouseEnter(date)}
                                        >
                                            {/* Range highlight background */}
                                            <AnimatePresence>
                                                {inRange && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scaleY: 0.8 }}
                                                        animate={{ opacity: 1, scaleY: 1 }}
                                                        exit={{ opacity: 0, scaleY: 0.8 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                        className="absolute inset-y-1 inset-x-0 bg-primary/10 dark:bg-primary/20 z-0" 
                                                    />
                                                )}
                                            </AnimatePresence>
                                            
                                            <AnimatePresence>
                                                {isStart && endDate && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scaleX: 0 }}
                                                        animate={{ opacity: 1, scaleX: 1 }}
                                                        exit={{ opacity: 0, scaleX: 0 }}
                                                        className="absolute inset-y-1 left-1/2 right-0 bg-primary/10 dark:bg-primary/20 z-0 origin-left" 
                                                    />
                                                )}
                                            </AnimatePresence>

                                            <AnimatePresence>
                                                {isEnd && startDate && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scaleX: 0 }}
                                                        animate={{ opacity: 1, scaleX: 1 }}
                                                        exit={{ opacity: 0, scaleX: 0 }}
                                                        className="absolute inset-y-1 right-1/2 left-0 bg-primary/10 dark:bg-primary/20 z-0 origin-right" 
                                                    />
                                                )}
                                            </AnimatePresence>
                                            
                                            <motion.button
                                                onMouseDown={() => handleMouseDown(date)}
                                                disabled={isPast}
                                                layout
                                                initial={false}
                                                animate={{
                                                    scale: isStart || isEnd ? 1.05 : 1,
                                                    backgroundColor: isStart || isEnd ? 'var(--color-primary)' : 'transparent',
                                                }}
                                                className={cn(
                                                    "absolute inset-1 rounded-xl text-[12px] font-black transition-all duration-300 z-10 flex items-center justify-center",
                                                    isPast ? "text-slate-200 dark:text-slate-800 cursor-not-allowed" : "text-slate-600 dark:text-slate-400",
                                                    (isStart || isEnd) && "text-white shadow-lg shadow-primary/30 z-20",
                                                    inRange && "text-primary font-black"
                                                )}
                                            >
                                                <span className="relative z-10">{format(date, 'd')}</span>
                                                
                                                {/* Resizing Handles */}
                                                <AnimatePresence>
                                                    {isStart && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: -5 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -5 }}
                                                            className="absolute left-1 inset-y-3 w-1.5 bg-white/40 rounded-full cursor-ew-resize hover:bg-white/70 transition-colors z-30"
                                                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(date, 'adjust-start'); }}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                                <AnimatePresence>
                                                    {isEnd && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: 5 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 5 }}
                                                            className="absolute right-1 inset-y-3 w-1.5 bg-white/40 rounded-full cursor-ew-resize hover:bg-white/70 transition-colors z-30"
                                                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(date, 'adjust-end'); }}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </motion.button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Right Sidebar: Duration & Summary (xl:col-span-4) */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0, x: 20 },
                        visible: { opacity: 1, x: 0 }
                    }}
                    className="lg:col-span-12 xl:col-span-4 space-y-6 order-3"
                >
                    {isDateUndecided ? (
                        <div className="p-8 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-[32px] text-center relative overflow-hidden shadow-2xl">
                            <div className="relative z-10 py-4">
                                <span className="material-symbols-rounded text-white text-5xl mb-6 block">timer</span>
                                <h4 className="text-xl font-black text-white mb-8">여행 기간 선택</h4>
                                <div className="flex items-center justify-center gap-6">
                                    <button
                                        onClick={() => setDuration(Math.max(1, durationDays - 1))}
                                        className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white active:scale-90"
                                    >
                                        <span className="material-symbols-rounded">remove</span>
                                    </button>
                                    <div className="min-w-[80px]">
                                        <div className="text-6xl font-black text-white">{durationDays}</div>
                                        <div className="text-[11px] font-bold text-white/60">DAYS</div>
                                    </div>
                                    <button
                                        onClick={() => setDuration(Math.min(30, durationDays + 1))}
                                        className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white active:scale-90"
                                    >
                                        <span className="material-symbols-rounded">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Selected Period Summary */}
                            <div className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full whitespace-nowrap">Selected</p>
                                        {startDate && endDate && (
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                <span className="text-[12px] font-black text-primary">
                                                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}일 일정
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 relative items-center">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Check-in</p>
                                            <p className={cn("text-2xl font-black", startDate ? "text-slate-900 dark:text-white" : "text-slate-200 dark:text-slate-800")}>
                                                {startDate ? format(new Date(startDate), 'MM.dd') : '--.--'}
                                            </p>
                                            {startDate && <p className="text-[10px] font-bold text-primary">{format(new Date(startDate), 'EEEE', { locale: ko })}</p>}
                                        </div>
                                        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                                            <span className="material-symbols-rounded text-slate-300 text-sm">trending_flat</span>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Check-out</p>
                                            <p className={cn("text-2xl font-black", endDate ? "text-slate-900 dark:text-white" : "text-slate-200 dark:text-slate-800")}>
                                                {endDate ? format(new Date(endDate), 'MM.dd') : '--.--'}
                                            </p>
                                            {endDate && <p className="text-[10px] font-bold text-primary">{format(new Date(endDate), 'EEEE', { locale: ko })}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Flexibility Toggle */}
                            <div className={cn(
                                "p-8 rounded-[32px] border-2 transition-all duration-500",
                                isFlexDays ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/20"
                            )}>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-all",
                                            isFlexDays ? "bg-primary text-white scale-110" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        )}>
                                            <span className="material-symbols-rounded text-2xl">auto_awesome</span>
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-black transition-colors", isFlexDays ? "text-primary" : "text-slate-900 dark:text-white")}>유연한 일정</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-1">최적의 가격/날씨 추천</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setFlexDays(!isFlexDays)}
                                        className={cn("w-14 h-7 rounded-full relative p-1.5 transition-all shadow-inner", isFlexDays ? "bg-primary" : "bg-slate-200 dark:bg-slate-700")}
                                    >
                                        <motion.div className="w-4 h-4 bg-white rounded-full shadow-md" animate={{ x: isFlexDays ? 28 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {isFlexDays && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="pt-6 border-t border-primary/10">
                                                <div className="flex gap-2 mb-4">
                                                    {[1, 3, 7].map(val => (
                                                        <button
                                                            key={val}
                                                            onClick={() => setDates(startDate, endDate, val)}
                                                            className={cn(
                                                                "flex-1 py-3 rounded-2xl text-[11px] font-black border-2 transition-all active:scale-95",
                                                                flexibility === val 
                                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
                                                                    : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                                                            )}
                                                        >
                                                            ± {val} {val === 1 ? '일' : '일'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[9px] font-black text-center text-slate-400 uppercase tracking-widest">
                                                    Flexibility: ±{flexibility} Days
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getSunPhases, timeToMinutes, minutesToTime } from '@pplaner/shared';

interface TimeSliderPickerProps {
    value: string;
    onChange: (time: string) => void;
    label?: string;
    onClose?: () => void;
    lat?: number;
    lng?: number;
    date?: string | Date;
    rangeStart?: string;
    rangeEnd?: string;
}

export function TimeSliderPicker({ value, onChange, label, onClose, lat, lng, date, rangeStart, rangeEnd }: TimeSliderPickerProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomCenter, setZoomCenter] = useState(0);
    const sunPhases = useMemo(() => getSunPhases(date || new Date(), lat, lng), [date, lat, lng]);
    
    const rangeStartMins = rangeStart ? timeToMinutes(rangeStart) : undefined;
    const rangeEndMins = rangeEnd ? timeToMinutes(rangeEnd) : undefined;
    const [isPressing, setIsPressing] = useState(false);
    const [zoomProgress, setZoomProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMoveTimeRef = useRef<number>(0);
    const lastMinsRef = useRef(0);
    const lastPercentageRef = useRef(0.5);
    const scrollIntervalRef = useRef<any>(null);



    const currentMins = timeToMinutes(value);

    const getMinutesFromX = useCallback((clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        lastPercentageRef.current = percentage;

        if (isZoomed) {
            const rangeOffset = (percentage - 0.5) * 60;
            return zoomCenter + rangeOffset;
        } else {
            return percentage * 1440;
        }
    }, [isZoomed, zoomCenter]);

    const handleUpdate = useCallback((mins: number) => {
        const snapped = isZoomed 
            ? Math.round(mins / 5) * 5 
            : Math.round(mins / 30) * 30;
        const clamped = Math.max(0, Math.min(1439, snapped));
        onChange(minutesToTime(clamped));
    }, [isZoomed, onChange]);

    useEffect(() => {
        if (!isPressing || isZoomed) {
            setZoomProgress(0);
            return;
        }

        const interval = window.setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastMoveTimeRef.current;
            const progress = Math.min(1, elapsed / 3000);
            
            setZoomProgress(progress);

            if (progress >= 1) {
                // Pin-to-Zoom logic: Keep current mins at current mouse percentage
                const currentMinsAtZoom = lastMinsRef.current;
                const currentP = lastPercentageRef.current;
                // Solve: currentMinsAtZoom = newZoomCenter + (currentP - 0.5) * 60
                const newZoomCenter = currentMinsAtZoom - (currentP - 0.5) * 60;
                
                setIsZoomed(true);
                setZoomCenter(newZoomCenter);
                setZoomProgress(0);
            }
        }, 50);

        return () => window.clearInterval(interval);
    }, [isPressing, isZoomed]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsPressing(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const mins = getMinutesFromX(clientX);
        lastMinsRef.current = mins;
        lastMoveTimeRef.current = Date.now();
        handleUpdate(mins);
    };

    const startEdgeScroll = useCallback((direction: 'left' | 'right') => {
        if (scrollIntervalRef.current) return;
        scrollIntervalRef.current = window.setInterval(() => {
            setZoomCenter(prev => {
                const next = direction === 'left' ? prev - 5 : prev + 5;
                return Math.max(0, Math.min(1439, next));
            });
        }, 50);
    }, []);

    const stopEdgeScroll = useCallback(() => {
        if (scrollIntervalRef.current) {
            window.clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    }, []);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isPressing) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            lastPercentageRef.current = percentage;

            if (isZoomed) {
                if (percentage < 0.1) startEdgeScroll('left');
                else if (percentage > 0.9) startEdgeScroll('right');
                else stopEdgeScroll();
            }
        }

        const mins = getMinutesFromX(clientX);
        if (Math.abs(mins - lastMinsRef.current) > 0.1) {
            lastMoveTimeRef.current = Date.now();
        }
        lastMinsRef.current = mins;
        handleUpdate(mins);
    }, [isPressing, isZoomed, getMinutesFromX, handleUpdate, startEdgeScroll, stopEdgeScroll]);

    const handleEnd = useCallback(() => {
        setIsPressing(false);
        stopEdgeScroll();
        if (isZoomed) {
            setTimeout(() => onClose?.(), 200);
        } else {
            onClose?.();
        }
    }, [onClose, stopEdgeScroll, isZoomed]);

    useEffect(() => {
        const up = () => handleEnd();
        const move = (e: any) => handleMove(e);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchend', up);
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move);
        return () => {
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchend', up);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('touchmove', move);
            stopEdgeScroll();
        };
    }, [handleEnd, handleMove, stopEdgeScroll]);

    const getTickPos = (mins: number) => {
        if (isZoomed) {
            return 50 + ((mins - zoomCenter) / 60) * 100;
        }
        return (mins / 1440) * 100;
    };

    return (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full overflow-hidden select-none">
            {/* Header Labels */}
            <div className="relative h-4 mb-2 mx-2 pointer-events-none">
                <AnimatePresence>
                    {!isZoomed ? (
                        // 6-Hour Labels
                        [0, 6, 12, 18, 24].map((h) => {
                            const pos = getTickPos(h * 60);
                            return (
                                <motion.span 
                                    key={`h-${h}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ left: `${pos}%`, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute -translate-x-1/2 text-[9px] font-black text-slate-500 dark:text-slate-300 whitespace-nowrap"
                                >
                                    {h.toString().padStart(2, '0')}
                                </motion.span>
                            );
                        })
                    ) : (
                        // 15-Minute Labels
                        Array.from({ length: 24 * 4 }).map((_, i) => {
                            const mins = i * 15;
                            const pos = getTickPos(mins);
                            if (pos < -5 || pos > 105) return null;
                            return (
                                <motion.span 
                                    key={`m-${i}`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ left: `${pos}%`, opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={cn(
                                        "absolute -translate-x-1/2 text-[8px] font-black whitespace-nowrap",
                                        mins % 60 === 0 ? "text-primary text-[10px]" : "text-slate-400"
                                    )}
                                >
                                    {minutesToTime(mins)}
                                </motion.span>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Visual Track Area */}
            <div 
                ref={containerRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className="relative h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden"
            >
                {/* Sun Phases Background (Day/Night) */}
                <div className="absolute inset-0 pointer-events-none flex overflow-hidden">
                    <div 
                        className="absolute inset-y-0 bg-slate-900/10 dark:bg-slate-950/30 transition-all duration-300" 
                        style={{ 
                            left: 0, 
                            width: `${Math.max(0, getTickPos(sunPhases.sunriseMins))}%` 
                        }} 
                    />
                    <div 
                        className="absolute inset-y-0 bg-amber-400/10 dark:bg-amber-400/5 border-x border-amber-500/10 transition-all duration-300" 
                        style={{ 
                            left: `${getTickPos(sunPhases.sunriseMins)}%`, 
                            width: `${getTickPos(sunPhases.sunsetMins) - getTickPos(sunPhases.sunriseMins)}%` 
                        }} 
                    />
                    <div 
                        className="absolute inset-y-0 bg-slate-900/10 dark:bg-slate-950/30 transition-all duration-300" 
                        style={{ 
                            left: `${getTickPos(sunPhases.sunsetMins)}%`, 
                            width: `${100 - getTickPos(sunPhases.sunsetMins)}%` 
                            // width: `${Math.max(0, 100 - getTickPos(sunPhases.sunsetMins))}%` 
                        }} 
                    />
                </div>

                {/* Range Highlight (e.g. Check-in range) */}
                {rangeStartMins !== undefined && rangeEndMins !== undefined && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div 
                            className="absolute inset-y-0 bg-primary/20 border-x border-primary/30 z-0"
                            style={{ 
                                left: `${getTickPos(rangeStartMins)}%`, 
                                width: `${(rangeEndMins >= rangeStartMins ? rangeEndMins - rangeStartMins : 1440 - rangeStartMins + rangeEndMins) / (isZoomed ? 60 : 1440) * 100}%` 
                            }} 
                        />
                    </div>
                )}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Ticks Logic */}
                    {Array.from({ length: 24 * 12 + 1 }).map((_, i) => {
                        const mins = i * 5;
                        const pos = getTickPos(mins);
                        
                        const is6h = mins % (60 * 6) === 0;
                        const is2h = mins % (60 * 2) === 0;
                        const is15m = mins % 15 === 0;
                        const is5m = mins % 5 === 0;

                        if (pos < -50 || pos > 150) return null;

                        // Visibility Logic
                        let visible = false;
                        let thick = false;

                        if (!isZoomed) {
                            if (is6h) { visible = true; thick = true; }
                            else if (is2h) { visible = true; thick = false; }
                        } else {
                            if (is15m) { visible = true; thick = true; }
                            else if (is5m) { visible = true; thick = false; }
                        }

                        if (!visible) return null;

                        return (
                            <motion.div 
                                key={mins}
                                layout
                                animate={{ 
                                    left: `${pos}%`,
                                    opacity: 1
                                }}
                                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                                className={cn(
                                    "absolute bottom-0 w-[1px] transition-colors",
                                    thick ? "h-full bg-slate-400 dark:bg-slate-500 w-[1.5px]" : "h-1/2 bg-slate-200 dark:bg-slate-700/50"
                                )}
                            />
                        );
                    })}
                </div>

                {/* Handle / Cursor Area */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                    <motion.div 
                        className="absolute w-0.5 h-full bg-primary z-20"
                        animate={{ 
                            left: `${isZoomed ? 50 + ((currentMins - zoomCenter) / 60) * 100 : (currentMins / 1440) * 100}%`
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        {/* Zoom Progress Circle */}
                        {zoomProgress > 0 && !isZoomed && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/10" />
                                    <motion.circle
                                        cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3"
                                        strokeDasharray="113.1"
                                        animate={{ strokeDashoffset: 113.1 * (1 - zoomProgress) }}
                                        transition={{ duration: 0.1 }}
                                        className="text-primary"
                                    />
                                </svg>
                            </div>
                        )}

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-10 bg-primary rounded-full border-2 border-white dark:border-slate-900 shadow-xl" />
                        
                        <AnimatePresence>
                            {(isPressing || isZoomed) && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 5 }}
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl shadow-2xl flex flex-col items-center"
                                >
                                    {minutesToTime(currentMins)}
                                    <div className="w-2 h-2 bg-slate-900 dark:bg-white rotate-45 -mb-2 mt-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

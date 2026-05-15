'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getSunPhases, timeToMinutes, minutesToTime } from '@pplaner/shared';
import { Calendar, Clock } from 'lucide-react';

interface TimeRangeSliderPickerProps {
    startValue: string;
    endValue: string;
    onChange: (start: string, end: string) => void;
    onClose?: () => void;
    lat?: number;
    lng?: number;
    date?: string | Date;
}

export function TimeRangeSliderPicker({ startValue, endValue, onChange, onClose, lat, lng, date }: TimeRangeSliderPickerProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomCenter, setZoomCenter] = useState(0);
    const sunPhases = useMemo(() => getSunPhases(date || new Date(), lat, lng), [date, lat, lng]);
    
    const [isPressing, setIsPressing] = useState<'start' | 'end' | null>(null);
    const [zoomProgress, setZoomProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMoveTimeRef = useRef<number>(0);
    const lastMinsRef = useRef(0);
    const lastPercentageRef = useRef(0.5);
    const scrollIntervalRef = useRef<any>(null);

    const startMins = timeToMinutes(startValue);
    const endMins = timeToMinutes(endValue);

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

    const handleUpdate = useCallback((mins: number, target: 'start' | 'end') => {
        const snapped = isZoomed 
            ? Math.round(mins / 5) * 5 
            : Math.round(mins / 30) * 30;
        const clamped = Math.max(0, Math.min(1439, snapped));
        
        if (target === 'start') {
            onChange(minutesToTime(clamped), endValue);
        } else {
            onChange(startValue, minutesToTime(clamped));
        }
    }, [isZoomed, onChange, startValue, endValue]);

    useEffect(() => {
        if (!isPressing || isZoomed) {
            setZoomProgress(0);
            return;
        }

        const interval = window.setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastMoveTimeRef.current;
            const progress = Math.min(1, elapsed / 2000); // Faster zoom for range
            
            setZoomProgress(progress);

            if (progress >= 1) {
                const currentMinsAtZoom = lastMinsRef.current;
                const currentP = lastPercentageRef.current;
                const newZoomCenter = currentMinsAtZoom - (currentP - 0.5) * 60;
                
                setIsZoomed(true);
                setZoomCenter(newZoomCenter);
                setZoomProgress(0);
            }
        }, 50);

        return () => window.clearInterval(interval);
    }, [isPressing, isZoomed]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent, target: 'start' | 'end') => {
        setIsPressing(target);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const mins = getMinutesFromX(clientX);
        lastMinsRef.current = mins;
        lastMoveTimeRef.current = Date.now();
        handleUpdate(mins, target);
    };

    const handleTrackClick = (e: React.MouseEvent) => {
        if (isPressing) return;
        const mins = getMinutesFromX(e.clientX);
        const distStart = Math.abs(mins - startMins);
        const distEnd = Math.abs(mins - endMins);
        const target = distStart < distEnd ? 'start' : 'end';
        handleStart(e, target);
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
        handleUpdate(mins, isPressing);
    }, [isPressing, isZoomed, getMinutesFromX, handleUpdate, startEdgeScroll, stopEdgeScroll]);

    const handleEnd = useCallback(() => {
        if (!isPressing) return;
        
        // Final sync check
        const currentMins = isPressing === 'start' ? startMins : endMins;
        const otherMins = isPressing === 'start' ? endMins : startMins;

        if (startValue === endValue) {
            onClose?.();
        }

        setIsPressing(null);
        stopEdgeScroll();
    }, [isPressing, startMins, endMins, startValue, endValue, onClose, stopEdgeScroll]);

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

    const durationMin = endMins >= startMins ? endMins - startMins : 1440 - startMins + endMins;
    const durationFormatted = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

    return (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 w-full overflow-hidden select-none">
            {/* Range Label */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">{startValue}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{endValue}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration: {durationFormatted}</p>
                    </div>
                </div>
                {startValue === endValue && (
                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                        종료시간 삭제됨
                    </span>
                )}
            </div>

            {/* Header Labels */}
            <div className="relative h-4 mb-2 mx-2 pointer-events-none">
                <AnimatePresence>
                    {!isZoomed ? (
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

            {/* Track */}
            <div 
                ref={containerRef}
                onMouseDown={handleTrackClick}
                className="relative h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden"
            >
                {/* Visual Background */}
                <div className="absolute inset-0 pointer-events-none flex overflow-hidden">
                    <div className="absolute inset-y-0 bg-slate-900/5" style={{ left: 0, width: `${getTickPos(sunPhases.sunriseMins)}%` }} />
                    <div className="absolute inset-y-0 bg-amber-400/5" style={{ left: `${getTickPos(sunPhases.sunriseMins)}%`, width: `${getTickPos(sunPhases.sunsetMins) - getTickPos(sunPhases.sunriseMins)}%` }} />
                    <div className="absolute inset-y-0 bg-slate-900/5" style={{ left: `${getTickPos(sunPhases.sunsetMins)}%`, width: `${100 - getTickPos(sunPhases.sunsetMins)}%` }} />
                </div>

                {/* Selected Range Fill */}
                <div 
                    className="absolute inset-y-0 bg-primary/20 border-x border-primary/30 z-0"
                    style={{ 
                        left: `${getTickPos(startMins)}%`, 
                        width: `${(endMins >= startMins ? endMins - startMins : 1440 - startMins + endMins) / (isZoomed ? 60 : 1440) * 100}%` 
                    }} 
                />

                {/* Ticks */}
                {Array.from({ length: 24 * 12 + 1 }).map((_, i) => {
                    const mins = i * 5;
                    const pos = getTickPos(mins);
                    if (pos < -50 || pos > 150) return null;
                    const is6h = mins % (60 * 6) === 0;
                    const is1h = mins % 60 === 0;
                    const is15m = mins % 15 === 0;
                    if (!isZoomed && !is1h) return null;
                    if (isZoomed && !is15m) return null;
                    return (
                        <div 
                            key={mins}
                            className={cn(
                                "absolute bottom-0 w-[1px]",
                                is1h ? "h-full bg-slate-300 dark:bg-slate-700" : "h-1/2 bg-slate-200 dark:bg-slate-800"
                            )}
                            style={{ left: `${pos}%` }}
                        />
                    );
                })}

                {/* Start Handle */}
                <motion.div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 cursor-grab active:cursor-grabbing"
                    style={{ left: `${getTickPos(startMins)}%` }}
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'start'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'start'); }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-white dark:bg-slate-900 border-2 border-primary rounded-full shadow-lg" />
                    {isPressing === 'start' && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg">
                            {startValue}
                        </div>
                    )}
                </motion.div>

                {/* End Handle */}
                <motion.div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 cursor-grab active:cursor-grabbing"
                    style={{ left: `${getTickPos(endMins)}%` }}
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'end'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'end'); }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-white dark:bg-slate-900 border-2 border-primary rounded-full shadow-lg" />
                    {isPressing === 'end' && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg">
                            {endValue}
                        </div>
                    )}
                </motion.div>
            </div>
            
            <p className="mt-4 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                드래그하여 시간 범위를 조절하세요. 두 시간이 겹치면 종료시간이 지워집니다.
            </p>
        </div>
    );
}

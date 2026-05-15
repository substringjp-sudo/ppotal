'use client';

import React from 'react';
import { cn, getSunPhases } from '@pplaner/shared';
import { TimeInput } from './FormComponents';

interface TransportTimeEditorProps {
    departureTime: string;
    arrivalTime: string;
    durationMins: number;
    date?: string | Date;
    lat?: number;
    lng?: number;
    onDepartureChange: (time: string) => void;
    onArrivalChange?: (time: string) => void;
    onDurationChange: (mins: number) => void;
    maxDurationMins?: number; // 기본값 1440 (24시간)
    isNextDayArrival?: boolean;
    label?: string;
    expectedRangeStart?: number;
    expectedRangeEnd?: number;
}

export function TransportTimeEditor({
    departureTime,
    arrivalTime,
    durationMins,
    date,
    lat,
    lng,
    onDepartureChange,
    onArrivalChange,
    onDurationChange,
    maxDurationMins = 1440,
    isNextDayArrival = false,
    label,
    expectedRangeStart,
    expectedRangeEnd
}: TransportTimeEditorProps) {
    const sun = getSunPhases(date || new Date(), lat, lng);
    const [depH, depM] = (departureTime || '09:00').split(':').map(Number);
    const depTotalMins = depH * 60 + depM;

    // 슬라이더 배경 영역 계산 (낮/밤)
    const renderRegions: { isDay: boolean; width: number; color: string }[] = [];
    const chunkCount = 100;
    const step = maxDurationMins / chunkCount; 
    for (let i = 0; i < maxDurationMins; i += step) {
        const currentMins = (depTotalMins + i) % 1440;
        const isDay = currentMins >= sun.sunriseMins && currentMins <= sun.sunsetMins;
        const color = isDay ? 'rgba(251, 191, 36, 0.08)' : 'rgba(15, 23, 42, 0.05)';
        
        if (renderRegions.length > 0 && renderRegions[renderRegions.length - 1].isDay === isDay) {
            renderRegions[renderRegions.length - 1].width += (100 / chunkCount);
        } else {
            renderRegions.push({ isDay, width: (100 / chunkCount), color });
        }
    }

    // 눈금 생성을 위한 배열 (3시간 단위)
    const ticks = [];
    const tickStep = maxDurationMins > 720 ? 360 : 180; // 24시간이면 6시간 단위, 아니면 3시간 단위
    for (let i = 0; i <= maxDurationMins; i += tickStep) {
        ticks.push(i);
    }

    return (
        <div className="space-y-3">
            {label && (
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 block mb-1">
                    {label}
                </label>
            )}
            
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">출발</label>
                    <TimeInput 
                        value={departureTime}
                        lat={lat}
                        lng={lng}
                        date={date}
                        onChange={onDepartureChange}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">
                        {onArrivalChange ? '도착' : '도착 (자동)'}
                    </label>
                    {onArrivalChange ? (
                        <TimeInput 
                            value={arrivalTime}
                            lat={lat}
                            lng={lng}
                            date={date}
                            onChange={onArrivalChange}
                        />
                    ) : (
                        <div className="h-[42px] px-4 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center font-black text-xs text-slate-500 border border-slate-100 dark:border-slate-800 shadow-inner">
                            {arrivalTime || '--:--'}
                            {isNextDayArrival && <span className="ml-1.5 text-[9px] text-primary font-bold">(+1일)</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-[24px] border border-slate-200 dark:border-slate-800 space-y-4 relative overflow-hidden group/editor">
                {/* Sun Phase Background */}
                <div className="absolute inset-0 pointer-events-none flex opacity-100">
                    {renderRegions.map((r, idx) => (
                        <div key={idx} style={{ width: `${r.width}%`, backgroundColor: r.color }} className="h-full" />
                    ))}
                </div>

                <div className="flex items-center justify-between px-1 relative z-10">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-[18px] text-primary/70">timelapse</span>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">이동 소요</label>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-all group-hover/editor:border-primary/30">
                        <span className="text-[13px] font-black text-primary">
                            {Math.floor((durationMins || 0) / 60)}시간
                        </span>
                        <span className="text-[13px] font-black text-primary ml-0.5">
                            {(durationMins || 0) % 60}분
                        </span>
                    </div>
                </div>

                <div className="relative h-8 flex items-center px-1">
                    {/* Track Background & Highlights */}
                    <div className="absolute inset-x-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        {expectedRangeStart !== undefined && expectedRangeEnd !== undefined && (
                            <div 
                                className="absolute h-full bg-primary/30 z-10 animate-pulse"
                                style={{ 
                                    left: `${(expectedRangeStart / maxDurationMins) * 100}%`,
                                    width: `${((expectedRangeEnd - expectedRangeStart) / maxDurationMins) * 100}%`
                                }}
                            />
                        )}
                    </div>

                    {/* Hour Ticks */}
                    <div className="absolute inset-x-1 -top-4 flex justify-between pointer-events-none">
                        {ticks.map(mins => (
                            <div key={mins} className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 mb-1">{mins / 60}시간</span>
                                <div className="w-[1px] h-1.5 bg-slate-300 dark:bg-slate-700" />
                            </div>
                        ))}
                    </div>

                    <input
                        type="range"
                        min="0"
                        max={maxDurationMins}
                        step="5"
                        value={durationMins || 0}
                        onChange={(e) => onDurationChange(parseInt(e.target.value))}
                        className="absolute inset-x-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-primary z-20"
                    />
                </div>

                {expectedRangeStart !== undefined && expectedRangeEnd !== undefined && (
                    <div className="flex items-center gap-1.5 px-1 relative z-10">
                        <span className="material-symbols-rounded text-[14px] text-primary/40">info</span>
                        <p className="text-[8px] font-bold text-slate-400">
                            권장: {Math.floor(expectedRangeStart / 60)}시간 {expectedRangeStart % 60}분 ~ {Math.floor(expectedRangeEnd / 60)}시간 {expectedRangeEnd % 60}분
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

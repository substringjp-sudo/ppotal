'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn, getSunPhases } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

export interface OccupiedTimeRange {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  color?: string;
}

interface TimeRangeSliderProps {
  startTime?: string;
  endTime?: string;
  occupiedRanges?: OccupiedTimeRange[];
  currentId?: string;
  label?: string;
  subLabel?: string;
  onChange: (start: string, end: string) => void;
  className?: string;
  color?: string;
  lat?: number;
  lng?: number;
  date?: string | Date;
  hideDuration?: boolean;
}


/**
 * Common TimeRangeSlider - 24시간을 가로 슬라이더로 시각화하고, 
 * 드래그하여 영역을 지정하거나 리사이징할 수 있는 프리미엄 시간 선택 컴포넌트 (공용)
 */
export const TimeRangeSlider = ({ 
  startTime, 
  endTime, 
  occupiedRanges = [], 
  currentId,
  label = "시간 범위 선택",
  subLabel,
  onChange,
  className,
  color = '#6366f1',
  lat,
  lng,
  date,
  hideDuration = false
}: TimeRangeSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'create' | 'start' | 'end' | 'move' | null>(null);
  const [dragStartMins, setDragStartMins] = useState(0);

  const sunPhases = useMemo(() => getSunPhases(date || new Date(), lat, lng), [date, lat, lng]);
  
  // 시간 변환 헬퍼 (HH:mm -> Minutes)
  const timeToMinutes = (t?: string) => {
    if (!t) return 0;
    const parts = t.split(':').map(Number);
    if (parts.length < 2) return 0;
    const [h, m] = parts;
    return (h || 0) * 60 + (m || 0);
  };

  // 분 변환 헬퍼 (Minutes -> HH:mm)
  const minutesToTime = (mins: number) => {
    const h = Math.max(0, Math.min(23, Math.floor(mins / 60)));
    const m = Math.max(0, Math.min(59, Math.floor(mins % 60)));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const currentStart = useMemo(() => timeToMinutes(startTime), [startTime]);
  // 종료 시간이 없으면 시작 시간 + 60분을 기본값으로 설정
  const currentEnd = useMemo(() => {
    const endMins = timeToMinutes(endTime);
    return endMins || currentStart + 60;
  }, [endTime, currentStart]);

  // 점유된 시간 범위 가공 (자기 자신 제외 및 정렬)
  const processedOccupied = useMemo(() => {
    return occupiedRanges
      .filter(r => r.id !== currentId)
      .map(r => ({
        start: timeToMinutes(r.startTime),
        end: timeToMinutes(r.endTime) || timeToMinutes(r.startTime) + 30,
        title: r.title,
        color: r.color
      }))
      .sort((a, b) => a.start - b.start);
  }, [occupiedRanges, currentId]);

  // 마우스 좌표를 분(0-1440)으로 변환
  const getMinutesFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const rawMins = percentage * 1440;
    // 5분 단위로 스냅 (정밀도를 높이려면 단위를 줄일 수 있음)
    return Math.round(rawMins / 5) * 5;
  };

  // 충돌 체크 및 보정
  const clampWithCollisions = (start: number, end: number, mode: 'start' | 'end' | 'move') => {
    let s = Math.max(0, Math.min(1435, start));
    let e = Math.max(s + 5, Math.min(1440, end));

    // 리사이징 시 인접한 이벤트에 걸리는지 확인
    for (const range of processedOccupied) {
      if (mode === 'start') {
          if (s < range.end && currentEnd > range.start) {
              if (s < range.end && s > range.start - 5) s = range.end;
          }
      } else if (mode === 'end') {
          if (e > range.start && currentStart < range.end) {
              if (e > range.start && e < range.end + 5) e = range.start;
          }
      }
    }

    return [s, e];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mins = getMinutesFromEvent(e);
    
    // 핸들러 위치 확인을 위한 픽셀 계산
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const startX = (currentStart / 1440) * containerWidth;
    const endX = (currentEnd / 1440) * containerWidth;
    const rect = containerRef.current?.getBoundingClientRect();
    const mouseX = e.clientX - (rect?.left || 0);

    // 핸들 클릭 감지 (좌우 15px 반경)
    if (Math.abs(mouseX - startX) < 15) {
        setIsDragging('start');
        return;
    }
    if (Math.abs(mouseX - endX) < 15) {
        setIsDragging('end');
        return;
    }

    // 본체 클릭 감지 (이동)
    const isOverBody = mins > currentStart && mins < currentEnd;
    if (isOverBody) {
        setIsDragging('move');
        setDragStartMins(mins - currentStart);
    }
    else {
      // 빈 공간 클릭 (새로운 범위 생성)
      const isOccupied = processedOccupied.some(r => mins >= r.start && mins <= r.end);
      if (!isOccupied) {
        setIsDragging('create');
        setDragStartMins(mins);
        onChange(minutesToTime(mins), minutesToTime(Math.min(1440, mins + 5)));
      }
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mins = getMinutesFromEvent(e);
      let newStart = currentStart;
      let newEnd = currentEnd;

      if (isDragging === 'create') {
        const s = Math.min(dragStartMins, mins);
        const ed = Math.max(dragStartMins, mins);
        const hasCollision = processedOccupied.some(r => (s < r.end && ed > r.start));
        if (!hasCollision) {
           onChange(minutesToTime(s), minutesToTime(ed));
        }
      } else if (isDragging === 'start') {
        newStart = Math.min(mins, currentEnd - 5);
        const [s] = clampWithCollisions(newStart, currentEnd, 'start');
        onChange(minutesToTime(s), minutesToTime(currentEnd));
      } else if (isDragging === 'end') {
        newEnd = Math.max(mins, currentStart + 5);
        const [, ed] = clampWithCollisions(currentStart, newEnd, 'end');
        onChange(minutesToTime(currentStart), minutesToTime(ed));
      } else if (isDragging === 'move') {
        const duration = currentEnd - currentStart;
        newStart = mins - dragStartMins;
        newEnd = newStart + duration;
        
        const hasCollision = processedOccupied.some(r => (newStart < r.end && newEnd > r.start));
        if (!hasCollision && newStart >= 0 && newEnd <= 1440) {
           onChange(minutesToTime(newStart), minutesToTime(newEnd));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, currentStart, currentEnd, dragStartMins, processedOccupied, onChange]);

  return (
    <div className={cn("space-y-3 py-2", className)}>
      <div className="flex justify-between items-end px-1">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-black text-primary border border-slate-200 dark:border-slate-700">
               {startTime || '--:--'}
             </div>
             <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />
             <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-black text-rose-500 border border-slate-200 dark:border-slate-700">
               {endTime || '--:--'}
             </div>
          </div>
        </div>
        {subLabel && (
          <div className="hidden sm:flex flex-col items-end gap-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-md uppercase tracking-tighter">Interactive Range</span>
              <p className="text-[10px] font-bold text-slate-300 italic">{subLabel}</p>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="relative h-14 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-crosshair overflow-hidden group/timeline select-none shadow-inner"
      >
        {/* Sun Phases Background (Day/Night) */}
        <div className="absolute inset-0 pointer-events-none flex">
            <div 
                className="h-full bg-slate-900/10 dark:bg-slate-950/30" 
                style={{ width: `${(sunPhases.sunriseMins / 1440) * 100}%` }} 
            />
            <div 
                className="h-full bg-amber-400/10 dark:bg-amber-400/5 border-x border-amber-500/10" 
                style={{ width: `${((sunPhases.sunsetMins - sunPhases.sunriseMins) / 1440) * 100}%` }} 
            />
            <div 
                className="h-full bg-slate-900/10 dark:bg-slate-950/30" 
                style={{ width: `${((1440 - sunPhases.sunsetMins) / 1440) * 100}%` }} 
            />
        </div>
        {/* Hour Markers & Grid */}
        <div className="absolute inset-x-0 inset-y-0 flex justify-between px-4 pointer-events-none">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center h-full">
              <div className={cn(
                "w-[1px] transition-colors",
                i % 6 === 0 ? "h-full bg-slate-200 dark:bg-slate-800" : "h-3 bg-slate-100 dark:bg-slate-800/40 mt-auto"
              )} />
              {i % 3 === 0 && (
                <span className="absolute bottom-0.5 text-[7px] font-black text-slate-400">{i.toString().padStart(2, '0')}</span>
              )}
            </div>
          ))}
        </div>

        {/* Occupied Ranges (Dimmed & Blurred) */}
        {processedOccupied.map((range, idx) => (
          <div 
            key={idx}
            className="absolute top-1/2 -translate-y-1/2 h-8 bg-slate-200/40 dark:bg-slate-800/60 backdrop-blur-[2px] rounded-xl border border-slate-300/20 pointer-events-none flex items-center px-4 overflow-hidden"
            style={{ 
              left: `${(range.start / 1440) * 100}%`,
              width: `${((range.end - range.start) / 1440) * 100}%`
            }}
          >
            <span className="text-[8px] font-black text-slate-400/50 uppercase tracking-widest truncate">{range.title}</span>
          </div>
        ))}

        {/* Current Active Range */}
        <AnimatePresence>
          {startTime && (
            <motion.div 
              initial={{ opacity: 0, scaleY: 0.8 }}
              animate={{ opacity: 1, scaleY: 1 }}
              className="absolute top-[35%] -translate-y-1/2 h-7 bg-white dark:bg-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg z-20"
              style={{ 
                left: `${(currentStart / 1440) * 100}%`,
                width: `${((currentEnd - currentStart) / 1440) * 100}%`,
                borderColor: color,
                borderWidth: '2px',
                borderStyle: 'solid'
              }}
            >
              {/* Resize Handles */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group/h z-30"
                onMouseDown={(e) => { e.stopPropagation(); setIsDragging('start'); }}
              >
                <div className="w-1 h-3 rounded-full group-hover/h:h-5 transition-all shadow-sm" style={{ backgroundColor: color }} />
              </div>
              <div 
                className="absolute right-0 top-0 bottom-0 w-4 -mr-2 cursor-ew-resize flex items-center justify-center group/h z-30"
                onMouseDown={(e) => { e.stopPropagation(); setIsDragging('end'); }}
              >
                <div className="w-1 h-3 rounded-full group-hover/h:h-5 transition-all shadow-sm" style={{ backgroundColor: color }} />
              </div>

              {/* Range Info */}
              {!hideDuration && (
                <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none overflow-hidden px-1">
                   <span className="text-[7px] font-black text-slate-400 truncate">
                      {Math.round((currentEnd - currentStart) / 60 * 10) / 10}h
                   </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

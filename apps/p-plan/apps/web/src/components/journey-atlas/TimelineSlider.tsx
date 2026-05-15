'use client';

import { TripMeta } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { Play, Pause, FastForward, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

interface TimelineSliderProps {
  value: number; // 0 to 1
  onChange: (value: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  tripMeta: TripMeta[];
}

export default function TimelineSlider({
  value,
  onChange,
  isPlaying,
  onTogglePlay,
  tripMeta,
}: TimelineSliderProps) {
  // 전체 여행 기간 계산
  const { start, end, range } = useMemo(() => {
    if (tripMeta.length === 0) return { start: 0, end: 0, range: 0 };
    const dates = tripMeta
      .map(m => new Date(m.startDate).getTime())
      .filter(t => !isNaN(t))
      .sort();
    const s = dates[0];
    const e = dates[dates.length - 1];
    return { start: s, end: e, range: e - s };
  }, [tripMeta]);

  // 현재 가리키는 날짜
  const currentDateLabel = useMemo(() => {
    if (range === 0) return '';
    const currentTs = start + range * value;
    return new Date(currentTs).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [start, range, value]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-20 pointer-events-auto">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:px-8 md:py-6 shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8">
        
        {/* 컨트롤 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange(0)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={() => onChange(1)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* 슬라이더 영역 */}
        <div className="flex-1 w-full flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase">Timeline</span>
            <span className="text-xs font-black text-primary tabular-nums">
              {currentDateLabel}
            </span>
          </div>

          <div className="relative h-6 flex items-center group">
            {/* 트랙 배경 */}
            <div className="absolute inset-0 h-1.5 my-auto bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              {/* 진행 바 */}
              <motion.div
                className="absolute inset-0 h-full bg-primary"
                style={{ width: `${value * 100}%` }}
              />
            </div>

            {/* 실제 입력 핸들 */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {/* 비주얼 핸들 */}
            <motion.div
              className="absolute w-5 h-5 bg-white dark:bg-slate-200 rounded-full shadow-lg pointer-events-none z-0 border-4 border-primary"
              animate={{ left: `calc(${value * 100}% - 10px)` }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            />
          </div>

          <div className="flex justify-between px-1">
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-700">
              {tripMeta.length > 0 ? new Date(start).getFullYear() : ''}
            </span>
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-700">
              {tripMeta.length > 0 ? new Date(end).getFullYear() : ''}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

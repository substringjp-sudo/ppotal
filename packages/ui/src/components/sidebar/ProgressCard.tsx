"use client";

import React, { memo } from 'react';

export interface ProgressCardProps {
  /** Label on the top left (e.g. '전체 진척도', 'TOTAL PROGRESS') */
  label: string;
  /** Percentage value (0 to 100) */
  percent: number;
  /** Optional custom color bar class (default: 'bg-primary') */
  barColorClass?: string;
  /** Optional sub-content below progress bar (e.g. km distance info or grid stat boxes) */
  children?: React.ReactNode;
  /** Optional container class */
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = memo(({
  label,
  percent,
  barColorClass = 'bg-primary',
  children,
  className = '',
}) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-black text-primary tabular-nums">
          {clampedPercent.toFixed(1)}%
        </span>
      </div>

      {/* Bar Gauge */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className={`${barColorClass} h-full rounded-full transition-all duration-500`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      {/* Sub Info or Grid */}
      {children}
    </div>
  );
});

ProgressCard.displayName = 'ProgressCard';

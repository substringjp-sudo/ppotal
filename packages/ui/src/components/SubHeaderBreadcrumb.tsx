"use client";

import React, { memo } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

export interface SubHeaderBreadcrumbProps {
  segments: BreadcrumbSegment[];
  onBack?: (() => void) | undefined;
  backTooltip?: string;
  className?: string;
}

export const SubHeaderBreadcrumb: React.FC<SubHeaderBreadcrumbProps> = memo(({
  segments,
  onBack,
  backTooltip = '뒤로가기',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-1 shadow-sm ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer shrink-0"
          title={backTooltip}
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}

      <div className="flex items-center gap-1 px-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600 text-[10px]">/</span>}
            {seg.onClick && !seg.isActive ? (
              <button
                onClick={seg.onClick}
                className="text-[11px] font-black tracking-tight whitespace-nowrap text-slate-400 hover:text-blue-500 uppercase cursor-pointer transition-colors"
              >
                {seg.label}
              </button>
            ) : (
              <span
                className={`text-[11px] font-black tracking-tight whitespace-nowrap ${
                  seg.isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {seg.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

SubHeaderBreadcrumb.displayName = 'SubHeaderBreadcrumb';

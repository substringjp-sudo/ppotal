"use client";

import React, { memo } from 'react';
import { Layers, Trophy } from 'lucide-react';

export interface MapSubHeaderProps {
  isLeftOpen?: boolean;
  onToggleLeft?: () => void;
  leftTooltip?: string;
  leftIcon?: React.ReactNode;
  
  isRightOpen?: boolean;
  onToggleRight?: () => void;
  rightTooltip?: string;
  rightIcon?: React.ReactNode;

  breadcrumb?: React.ReactNode;
  centerContent?: React.ReactNode;
  statsContent?: React.ReactNode;
  className?: string;
}

export const MapSubHeader: React.FC<MapSubHeaderProps> = memo(({
  isLeftOpen = true,
  onToggleLeft,
  leftTooltip = '사이드바 토글',
  leftIcon,
  isRightOpen = true,
  onToggleRight,
  rightTooltip = '패널 토글',
  rightIcon,
  breadcrumb,
  centerContent,
  statsContent,
  className = '',
}) => {
  return (
    <div className={`h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-0 w-full select-none shadow-xs pointer-events-auto ${className}`}>
      {/* Left Sidebar Toggle Button */}
      {onToggleLeft && (
        <div className="pr-3 flex items-center shrink-0">
          <button
            onClick={onToggleLeft}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLeftOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
            title={leftTooltip}
          >
            {leftIcon || <Layers className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Breadcrumb / Hierarchy Context Section */}
      {breadcrumb && (
        <div className="flex items-center gap-2 h-full border-r border-slate-100 dark:border-slate-800 pr-4 shrink-0">
          {breadcrumb}
        </div>
      )}

      {/* Center Context Info */}
      <div className="flex items-center px-4 gap-4 h-full flex-1 min-w-0 overflow-hidden">
        {centerContent}
      </div>

      {/* Right Stats & Right Panel Toggle */}
      <div className="px-3 border-l border-slate-200 dark:border-slate-800 h-full flex items-center gap-3 shrink-0">
        {statsContent}

        {onToggleRight && (
          <button
            onClick={onToggleRight}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isRightOpen
                ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
            title={rightTooltip}
          >
            {rightIcon || <Trophy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
});

MapSubHeader.displayName = 'MapSubHeader';

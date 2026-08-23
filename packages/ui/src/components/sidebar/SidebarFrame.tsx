"use client";

import React, { memo } from 'react';
import { X, Search } from 'lucide-react';

export interface SidebarFrameProps {
  /** Icon in sidebar header */
  icon?: React.ReactNode;
  /** Primary title text (e.g. '지역 선택', '노선 선택', '나의 여행 기록') */
  title: string;
  /** Subtitle english text (e.g. 'Region Selection', 'Line Selection') */
  subtitle?: string;
  /** Top right custom actions (e.g. 전체 선택 | 전체 해제) */
  headerActions?: React.ReactNode;
  /** Close button callback */
  onClose?: () => void;
  /** Search input value */
  searchValue?: string;
  /** Search change callback */
  onSearchChange?: (val: string) => void;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Segment tabs component or element */
  tabs?: React.ReactNode;
  /** Extra header content (e.g. bulk action buttons, import buttons, progress cards) */
  headerExtra?: React.ReactNode;
  /** Main scrollable body content */
  children: React.ReactNode;
  /** Additional container classes */
  className?: string;
}

export const SidebarFrame: React.FC<SidebarFrameProps> = memo(({
  icon,
  title,
  subtitle,
  headerActions,
  onClose,
  searchValue,
  onSearchChange,
  searchPlaceholder = '검색...',
  tabs,
  headerExtra,
  children,
  className = '',
}) => {
  return (
    <div className={`w-full h-full min-h-0 flex-1 flex flex-col font-display select-none overflow-hidden bg-white dark:bg-slate-900 ${className}`}>
      {/* 1. Standard Sidebar Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex flex-col gap-2.5">
        {/* Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm md:text-base leading-tight">
              {icon}
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-tight font-semibold">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input (Optional) */}
        {onSearchChange !== undefined && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        )}

        {/* Segment Tabs (Optional) */}
        {tabs}

        {/* Extra Header Content (Optional) */}
        {headerExtra}
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {children}
      </div>
    </div>
  );
});

SidebarFrame.displayName = 'SidebarFrame';

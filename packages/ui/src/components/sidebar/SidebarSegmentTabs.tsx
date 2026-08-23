"use client";

import React, { memo } from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
}

export interface SidebarSegmentTabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export const SidebarSegmentTabs = memo(<T extends string>({
  options,
  activeId,
  onChange,
  className = '',
}: SidebarSegmentTabsProps<T>) => {
  return (
    <div className={`bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center justify-between text-xs font-bold text-slate-500 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
            activeId === opt.id
              ? 'bg-white dark:bg-slate-700 text-primary shadow-xs font-black'
              : 'hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}) as <T extends string>(props: SidebarSegmentTabsProps<T>) => React.ReactElement;

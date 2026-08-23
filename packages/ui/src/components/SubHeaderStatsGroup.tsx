"use client";

import React, { memo } from 'react';

export interface SubHeaderStatItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface SubHeaderStatsGroupProps {
  items: SubHeaderStatItem[];
  className?: string;
}

export const SubHeaderStatsGroup: React.FC<SubHeaderStatsGroupProps> = memo(({
  items,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 && <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`shrink-0 ${item.highlight ? 'text-primary' : 'text-slate-400'}`}>
              {item.icon}
            </div>
            <div className="flex flex-col justify-center">
              <span className={`text-[7px] font-black uppercase tracking-tighter leading-none mb-0.5 ${
                item.highlight ? 'text-primary' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
              <span className={`text-xs font-black tabular-nums leading-none ${
                item.highlight ? 'text-primary' : 'text-slate-800 dark:text-white'
              }`}>
                {item.value}
              </span>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
});

SubHeaderStatsGroup.displayName = 'SubHeaderStatsGroup';

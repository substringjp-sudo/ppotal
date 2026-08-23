"use client";

import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export interface HeaderSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Current input value */
  value: string;
  /** Clear button callback */
  onClear?: () => void;
  /** Custom container class */
  containerClassName?: string;
  /** Whether to show keyboard shortcut badge (default: true) */
  showShortcut?: boolean;
}

export const HeaderSearchBar = forwardRef<HTMLInputElement, HeaderSearchBarProps>(({
  value,
  onClear,
  containerClassName = '',
  showShortcut = true,
  placeholder = '검색...',
  className = '',
  ...inputProps
}, ref) => {
  return (
    <div className={`relative w-full max-w-md ${containerClassName}`}>
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="text"
          value={value}
          placeholder={placeholder}
          className={`w-full h-9 pl-9 pr-14 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 focus:border-primary/50 dark:focus:border-primary/50 rounded-xl transition-all focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-white ${className}`}
          {...inputProps}
        />
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        
        {value ? (
          onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2.5 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="지우기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )
        ) : (
          showShortcut && (
            <div className="absolute right-2.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700/60 text-[10px] font-bold text-slate-400 dark:text-slate-500 pointer-events-none">
              <span>⌘</span>
              <span>K</span>
            </div>
          )
        )}
      </div>
    </div>
  );
});

HeaderSearchBar.displayName = 'HeaderSearchBar';

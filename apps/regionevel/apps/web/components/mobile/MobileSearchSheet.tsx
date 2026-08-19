"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, MapPin } from "lucide-react";
import { Z } from "@/lib/layers";
import { SAFE_AREA, TAP_TARGET_CLASS, haptic } from "@/lib/mobile";
import { useRegionSearch } from "@/lib/useRegionSearch";

export interface MobileSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Search, full screen.
 *
 * A phone cannot put a search field in a 56px top bar: focusing it raises the
 * keyboard over the bottom half of the screen with nowhere to put results. So
 * the bar carries a button and this takes the whole screen, where the results
 * list has room above the keyboard.
 */
export const MobileSearchSheet: React.FC<MobileSearchSheetProps> = ({ isOpen, onClose }) => {
  const { query, setQuery, results, select, describe } = useRegionSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Focus after the sheet has painted, or iOS opens the keyboard against a
    // half-animated layout and scrolls the page instead.
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{
        zIndex: Z.modal,
        paddingTop: SAFE_AREA.top,
        paddingBottom: SAFE_AREA.bottom,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="지역 검색"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="국가, 지역, 도시 검색"
            /* 16px keeps iOS from zooming the page when this takes focus. */
            className="w-full h-11 pl-10 pr-9 text-base bg-slate-100 dark:bg-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white placeholder-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 p-2 text-slate-400 rounded-full"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className={`${TAP_TARGET_CLASS} px-3 text-sm font-bold text-slate-500 dark:text-slate-400 rounded-xl active:bg-slate-100 dark:active:bg-slate-800`}
        >
          취소
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <p className="px-6 py-10 text-center text-xs font-bold text-slate-400">
            {query.trim() ? "일치하는 지역이 없어요." : "지역 이름을 입력해 보세요."}
          </p>
        ) : (
          results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                haptic("select");
                select(r.id);
                onClose();
              }}
              className="w-full px-5 py-3 text-left flex items-center gap-3 border-b border-slate-50 dark:border-slate-800/60 active:bg-blue-50 dark:active:bg-blue-950/40 min-h-[56px]"
            >
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-800 dark:text-white truncate">
                  {r.name}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">{describe(r)}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
};

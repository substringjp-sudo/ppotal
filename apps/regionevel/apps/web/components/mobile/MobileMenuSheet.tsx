"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapIcon, TrophyIcon, InfoIcon, DrawIcon, ShareIcon, TimelineIcon,
  SyncIcon, LogOutIcon, CloseIcon, LogInIcon
} from "@ppotal/ui";
import { Z } from "@/lib/layers";
import { SAFE_AREA, haptic } from "@/lib/mobile";

export interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDrawMode: boolean;
  onToggleDraw: () => void;
  onShare: () => void;
  onTimelineImport: () => void;
  onSyncJprail: () => void;
  isSyncing: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  userEmail: string | null;
}

const NAV_LINKS = [
  { href: "/", label: "지도", icon: MapIcon, match: (p: string) => p === "/" || p === "/map" },
  { href: "/list", label: "목록", icon: TrophyIcon, match: (p: string) => p === "/list" },
  { href: "/about", label: "소개", icon: InfoIcon, match: (p: string) => p === "/about" },
];

/**
 * Everything the desktop header has and a phone could not reach.
 *
 * The nav was `hidden md:flex`, so on a phone there was no way to open the
 * list, the export, the timeline import, or draw mode at all — only the logo
 * and the avatar rendered. This sheet is where those live now.
 */
export const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({
  isOpen, onClose, isDrawMode, onToggleDraw, onShare, onTimelineImport,
  onSyncJprail, isSyncing, onSignIn, onSignOut, userEmail,
}) => {
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const run = (fn: () => void) => () => {
    haptic("select");
    fn();
    onClose();
  };

  const rowClass =
    "w-full flex items-center gap-3 px-5 min-h-[52px] text-sm font-bold text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition-colors";

  return createPortal(
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.modal }}>
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: `calc(${SAFE_AREA.bottom} + 0.5rem)` }}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-2 shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">메뉴</p>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-slate-400 rounded-full active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
            aria-label="닫기"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          <nav className="py-1">
            {NAV_LINKS.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname || "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={run(() => {})}
                  className={`${rowClass} ${active ? "text-blue-600 dark:text-blue-400" : ""}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </Link>
              );
            })}
          </nav>

          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5 my-1" />

          <div className="py-1">
            <button onClick={run(onToggleDraw)} className={rowClass}>
              <DrawIcon className={`w-5 h-5 shrink-0 ${isDrawMode ? "text-amber-500" : ""}`} />
              <span>{isDrawMode ? "경로 그리기 끄기" : "경로 그리기"}</span>
            </button>
            <button onClick={run(onShare)} className={rowClass}>
              <ShareIcon className="w-5 h-5 shrink-0" />
              <span>공유 카드 만들기</span>
            </button>
            <button onClick={run(onTimelineImport)} className={rowClass}>
              <TimelineIcon className="w-5 h-5 shrink-0" />
              <span>Google 타임라인 가져오기</span>
            </button>
            {userEmail && (
              <button onClick={run(onSyncJprail)} disabled={isSyncing} className={`${rowClass} disabled:opacity-50`}>
                <SyncIcon className={`w-5 h-5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "동기화 중…" : "JPRAIL에서 가져오기"}</span>
              </button>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 mx-5 my-1" />

          <div className="py-1 pb-2">
            {userEmail ? (
              <>
                <p className="px-5 pt-2 pb-1 text-[10px] font-bold text-slate-400 truncate">
                  {userEmail}
                </p>
                <button onClick={run(onSignOut)} className={`${rowClass} text-red-600 dark:text-red-400`}>
                  <LogOutIcon className="w-5 h-5 shrink-0" />
                  <span>로그아웃</span>
                </button>
              </>
            ) : (
              <button onClick={run(onSignIn)} className={`${rowClass} text-blue-600 dark:text-blue-400`}>
                <LogInIcon className="w-5 h-5 shrink-0" />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

"use client";

import React from 'react';
import JrnLogo from '../JrnLogo';
import { useI18n } from '../../lib/i18n-context';

export interface MobileTopBarProps {
    onOpenSearch: () => void;
    onOpenMenu: () => void;
    onOpenProfile: () => void;
    userInitial: string | null;
    searchPlaceholder: string;
}

/**
 * The phone's top bar.
 *
 * The desktop header put a logo, a wordmark, a nav, a language picker, an info
 * button and an avatar in one row. On a 390px screen that measured 565px wide —
 * the login button was simply off the side of the display. A phone bar can hold
 * about three things, so it holds the three that matter: who we are, the search
 * that was previously unreachable on mobile at all, and a way into everything
 * else.
 */
const MobileTopBar: React.FC<MobileTopBarProps> = ({
    onOpenSearch, onOpenMenu, onOpenProfile, userInitial, searchPlaceholder
}) => {
    const { language } = useI18n();

    return (
        <header
            className="mobile-safe-top mobile-safe-x shrink-0 z-[10001] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
        >
            <div className="flex items-center gap-2 h-14 px-3">
                <JrnLogo size={30} />

                {/* The search field is the bar's main affordance. It is a button
                    rather than an input: focusing an input here would raise the
                    keyboard under a 56px bar with nowhere to show results. */}
                <button
                    onClick={onOpenSearch}
                    className="flex-1 min-w-0 flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 active:scale-[0.98] transition-transform"
                    aria-label={searchPlaceholder}
                >
                    <span className="material-symbols-outlined !text-[20px] shrink-0">search</span>
                    <span className="text-sm font-semibold truncate">{searchPlaceholder}</span>
                </button>

                <button
                    onClick={onOpenProfile}
                    className="shrink-0 size-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
                    aria-label="Account"
                >
                    {userInitial ? (
                        <span className="size-9 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-800 shadow">
                            {userInitial}
                        </span>
                    ) : (
                        <span className="material-symbols-outlined !text-[24px] text-slate-500 dark:text-slate-400">account_circle</span>
                    )}
                </button>

                <button
                    onClick={onOpenMenu}
                    className="shrink-0 size-11 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                    aria-label={language === 'ko' ? '메뉴' : language === 'ja' ? 'メニュー' : 'Menu'}
                >
                    <span className="material-symbols-outlined !text-[24px]">menu</span>
                </button>
            </div>
        </header>
    );
};

export default MobileTopBar;

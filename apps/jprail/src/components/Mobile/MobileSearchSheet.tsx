"use client";

import React, { useEffect, useRef } from 'react';
import RailSearch from '../RailSearch';
import { RailData } from '../../types/railData';
import { useI18n } from '../../lib/i18n-context';
import { Z } from '../../lib/layers';

export interface MobileSearchSheetProps {
    isOpen: boolean;
    onClose: () => void;
    railData: RailData | null;
    onSelectStation: (id: string) => void;
    onSelectLine: (id: string, fullId: string) => void;
}

/**
 * Search, full screen.
 *
 * Search was previously desktop-only: on a phone there was no way to find a
 * station at all, which is most of what someone opens a rail map to do. It
 * takes the whole screen because a phone has no room for a dropdown that has to
 * coexist with a keyboard — the keyboard covers the bottom half, so the results
 * get the top half and nothing else competes for it.
 */
const MobileSearchSheet: React.FC<MobileSearchSheetProps> = ({
    isOpen, onClose, railData, onSelectStation, onSelectLine
}) => {
    const { language } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus the field as the sheet opens, so the keyboard comes up with it
    // rather than costing a second tap.
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            containerRef.current?.querySelector('input')?.focus();
        }, 120);
        return () => clearTimeout(timer);
    }, [isOpen]);

    // Android's back gesture should close the sheet, not leave the app.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const back = language === 'ko' ? '닫기' : language === 'ja' ? '閉じる' : 'Close';

    return (
        <div data-search-sheet="true" style={{ zIndex: Z.modal }} className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="mobile-safe-top mobile-safe-x shrink-0 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 h-14 px-2">
                    <button
                        onClick={onClose}
                        className="shrink-0 size-11 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800"
                        aria-label={back}
                    >
                        <span className="material-symbols-outlined !text-[24px]">arrow_back</span>
                    </button>
                    <div ref={containerRef} className="flex-1 min-w-0">
                        <RailSearch
                            railData={railData}
                            onSelectStation={(id) => { onSelectStation(id); onClose(); }}
                            onSelectLine={(id, fullId) => { onSelectLine(id, fullId); onClose(); }}
                            isMobile
                        />
                    </div>
                </div>
            </div>

            {/* RailSearch renders its own results below the field; this pane just
                gives them the rest of the screen and its own scroll. */}
            <div className="flex-1 overflow-y-auto sheet-scroll mobile-safe-bottom" />
        </div>
    );
};

export default MobileSearchSheet;

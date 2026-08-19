"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../lib/i18n-context';
import { MOBILE_BOTTOM_SHEET_TRANSLATIONS, getTranslations } from '../../lib/translations';
import { Z } from '../../lib/layers';
import {
    SHEET_DETENTS, SHEET_DETENTS_H, DETENT_ORDER, SHEET_DRAG_THRESHOLD,
    SHEET_FLING_VELOCITY, SHEET_PEEK_MIN, SHEET_PEEK_MIN_H, sheetAxisFor, haptic,
    type SheetDetent, type SheetAxis
} from '../../lib/mobile';

export interface MobileSheetTab {
    id: string;
    label: string;
    content: React.ReactNode;
    summary: React.ReactNode;
}

/**
 * A subject the sheet shows *instead of* its tabs: a station, a line.
 *
 * Detail is not a fourth tab. It is a different mode — it arrives because the
 * user tapped something on the map, it has a back affordance rather than a
 * peer to switch to, and it goes away. Modelling it as a tab would leave a
 * dead tab sitting there with nothing selected.
 */
export interface MobileSheetDetail {
    /** Changes when the subject changes, so the sheet knows to re-present. */
    id: string;
    title: string;
    subtitle?: string;
    /** Accent for the title rule — a line's colour, when there is one. */
    accent?: string;
    summary: React.ReactNode;
    content: React.ReactNode;
    onClose: () => void;
}

interface MobileBottomSheetProps {
    tabs?: MobileSheetTab[];
    detail?: MobileSheetDetail | null;
    children?: React.ReactNode;
    summaryContent?: React.ReactNode;
    defaultExpanded?: boolean;
    onExpand?: () => void;
    /** Legacy two-state API: false means `peek`, true means `half`. */
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

const SIDE_MARGIN = 12;

/**
 * The bottom sheet.
 *
 * It used to be a two-state toggle: 140px, or the whole screen. That is the one
 * shape a sheet must not have, because the useful state — list and map visible
 * at once — was the state it could not reach. This version snaps between the
 * three detents declared in `lib/mobile.ts` and follows the finger in between,
 * which is what both iOS's and Android's native sheets do and what a native
 * port of this app would inherit for free.
 */
const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    tabs,
    detail,
    children,
    summaryContent,
    defaultExpanded = false,
    onExpand,
    isOpen,
    onToggle
}) => {
    const { language } = useI18n();
    const t = getTranslations(MOBILE_BOTTOM_SHEET_TRANSLATIONS, language);

    const [detent, setDetent] = useState<SheetDetent>(defaultExpanded ? 'half' : 'peek');
    const [activeTabIdx, setActiveTabIdx] = useState(0);
    const [viewportH, setViewportH] = useState(800);
    const [viewportW, setViewportW] = useState(390);
    const [axis, setAxis] = useState<SheetAxis>('vertical');
    /** Non-null only while a finger is down: the live height, in pixels. */
    const [dragHeight, setDragHeight] = useState<number | null>(null);

    const sheetRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; velocity: number; active: boolean; pastLimit: boolean } | null>(null);

    // `visualViewport` is the only height that accounts for the on-screen
    // keyboard; innerHeight keeps reporting the full screen while it is up.
    useEffect(() => {
        const read = () => {
            const h = window.visualViewport?.height ?? window.innerHeight;
            const w = window.visualViewport?.width ?? window.innerWidth;
            setViewportH(h);
            setViewportW(w);
            // The axis follows the device, not the keyboard, so it reads
            // innerHeight — the keyboard shortens visualViewport and would
            // otherwise flip a portrait phone into landscape mode mid-typing.
            setAxis(sheetAxisFor(window.innerWidth, window.innerHeight));
        };
        read();
        window.addEventListener('resize', read);
        window.visualViewport?.addEventListener('resize', read);
        return () => {
            window.removeEventListener('resize', read);
            window.visualViewport?.removeEventListener('resize', read);
        };
    }, []);

    // Keep the legacy boolean in sync in both directions.
    useEffect(() => {
        if (isOpen === undefined) return;
        setDetent(prev => {
            if (isOpen && prev === 'peek') return 'half';
            if (!isOpen && prev !== 'peek') return 'peek';
            return prev;
        });
    }, [isOpen]);

    // A tap on the map is a request to see the thing, so the sheet comes up to
    // meet it. Dismissing the subject puts the sheet back where it was resting
    // rather than leaving a half-open sheet showing the tab it was on before.
    const hadDetail = useRef(false);
    useEffect(() => {
        if (detail) {
            // The sheet moving is the confirmation that the tap landed on
            // something, so it gets a tick the way picking a pin does natively.
            if (!hadDetail.current) haptic('select');
            hadDetail.current = true;
            setDetent(prev => (prev === 'peek' ? 'half' : prev));
            // Tell the owner too, or its `isOpen` stays false and the sync
            // effect above pulls the sheet straight back down.
            onToggle?.(true);
        } else if (hadDetail.current) {
            hadDetail.current = false;
            setDetent('peek');
            onToggle?.(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.id, !detail]);

    const applyDetent = useCallback((next: SheetDetent) => {
        // Only on a real change: a drag that returns to where it started
        // should feel like nothing happened, because nothing did.
        if (next !== detent) haptic('detent');
        setDetent(next);
        const opened = next !== 'peek';
        onToggle?.(opened);
        // `onExpand` clears the current selection: that is right when the user
        // pulls the tab sheet open, and wrong when the sheet came up because
        // they selected something.
        if (opened && detent === 'peek' && !detail) onExpand?.();
    }, [detent, onToggle, onExpand, detail]);

    // `heightFor` is really "size along the growing axis": vertical sheets
    // grow in height, the landscape panel grows in width.
    const horizontal = axis === 'horizontal';
    const heightFor = (d: SheetDetent) => {
        if (horizontal) {
            const w = Math.round(viewportW * SHEET_DETENTS_H[d]);
            return d === 'peek' ? Math.max(w, SHEET_PEEK_MIN_H) : w;
        }
        const h = Math.round(viewportH * SHEET_DETENTS[d]);
        return d === 'peek' ? Math.max(h, SHEET_PEEK_MIN) : h;
    };
    const restHeight = heightFor(detent);
    const height = dragHeight ?? restHeight;

    // Anything that floats above the sheet — map controls, toasts — reads this
    // rather than guessing at the peek height. It follows the resting detent,
    // not the drag, so controls settle instead of chasing the finger, and it
    // stops climbing at `peek`: past that the sheet owns the screen and there
    // is no point parking controls where the map no longer is.
    const floatFloor = Math.min(restHeight, heightFor('peek'));
    useEffect(() => {
        const root = document.documentElement;
        // Both are always defined so a control can position against either
        // edge without knowing the orientation; the idle one reads 0.
        root.style.setProperty('--sheet-h', horizontal ? '0px' : `${floatFloor}px`);
        root.style.setProperty('--sheet-w', horizontal ? `${restHeight}px` : '0px');
        return () => {
            root.style.removeProperty('--sheet-h');
            root.style.removeProperty('--sheet-w');
        };
    }, [floatFloor, restHeight, horizontal]);

    const onPointerDown = (e: React.PointerEvent) => {
        // Ignore the second finger of a pinch and anything with a mouse button
        // other than the primary one.
        if (e.button !== 0) return;
        drag.current = {
            startY: horizontal ? e.clientX : e.clientY, startH: restHeight,
            lastY: horizontal ? e.clientX : e.clientY,
            lastT: performance.now(), velocity: 0, active: false, pastLimit: false
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        // Growing means dragging up in portrait and right in landscape, so the
        // panel opens away from the edge it is docked to either way.
        const pos = horizontal ? e.clientX : e.clientY;
        const dy = horizontal ? pos - d.startY : d.startY - pos;
        if (!d.active && Math.abs(dy) < SHEET_DRAG_THRESHOLD) return;
        d.active = true;

        const now = performance.now();
        const dt = now - d.lastT;
        // px/ms, positive means "toward more sheet"
        if (dt > 0) d.velocity = (horizontal ? pos - d.lastY : d.lastY - pos) / dt;
        d.lastY = pos;
        d.lastT = now;

        const min = heightFor('peek');
        const max = heightFor('full');
        // Past the ends the sheet still moves, but a third as far, so the limit
        // is felt rather than hit.
        let next = d.startH + dy;
        const beyond = next > max || next < min;
        if (next > max) next = max + (next - max) / 3;
        if (next < min) next = min - (min - next) / 3;
        // One tick on crossing the limit, not one per pointermove.
        if (beyond && !d.pastLimit) haptic('limit');
        d.pastLimit = beyond;
        setDragHeight(next);
    };

    const endDrag = (e: React.PointerEvent) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* already released */ }

        if (!d.active) {          // never crossed the threshold: it was a tap
            setDragHeight(null);
            const i = DETENT_ORDER.indexOf(detent);
            applyDetent(detent === 'peek' ? 'half' : DETENT_ORDER[Math.max(0, i - 1)]);
            return;
        }

        const current = dragHeight ?? d.startH;
        setDragHeight(null);

        // A fast flick goes one detent that way regardless of where it stopped;
        // a slow drag snaps to whichever detent it ended up nearest.
        if (Math.abs(d.velocity) > SHEET_FLING_VELOCITY) {
            const i = DETENT_ORDER.indexOf(detent);
            const step = d.velocity > 0 ? 1 : -1;
            applyDetent(DETENT_ORDER[Math.min(DETENT_ORDER.length - 1, Math.max(0, i + step))]);
            return;
        }
        let best: SheetDetent = 'peek';
        let bestGap = Infinity;
        for (const cand of DETENT_ORDER) {
            const gap = Math.abs(heightFor(cand) - current);
            if (gap < bestGap) { bestGap = gap; best = cand; }
        }
        applyDetent(best);
    };

    // Swiping sideways across the sheet changes tab.
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const onTouchStart = (e: React.TouchEvent) => {
        swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        const s = swipeStart.current;
        swipeStart.current = null;
        if (!s || detail || !tabs || tabs.length <= 1) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) <= 50 || Math.abs(dx) <= Math.abs(dy)) return;
        setActiveTabIdx(idx => Math.min(tabs.length - 1, Math.max(0, idx + (dx > 0 ? -1 : 1))));
    };

    const activeTab = tabs ? tabs[activeTabIdx] : null;
    const expanded = detent !== 'peek';
    const dragging = dragHeight !== null;

    return (
        <div
            ref={sheetRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            // A stable hook for tests: they used to select the sheet by its
            // z-index class, which made renumbering the layers look like the
            // sheet had vanished.
            data-sheet="bottom"
            data-detent={detent}
            data-axis={axis}
            className={`fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-800/50 flex overflow-hidden ${horizontal
                ? 'flex-row shadow-[8px_0_32px_rgba(0,0,0,0.14)] rounded-r-[28px]'
                : 'flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.14)] rounded-t-[32px]'}`}
            style={horizontal ? {
                // Docked to the left edge, full height. A bottom sheet in
                // landscape would leave the map a 100px strip; a side panel
                // costs width, which is the dimension there is room in.
                zIndex: Z.sheet,
                // Starts below the bar rather than at 0: the bar is in normal
                // flow, so a fixed panel at the top of the viewport slides
                // under it and loses its own tab row.
                top: 'calc(var(--safe-top) + var(--top-bar-h))',
                bottom: 0, left: 0,
                width: height,
                paddingLeft: 'var(--safe-left)',
                transition: dragging ? 'none' : 'width 260ms cubic-bezier(0.32, 0.72, 0, 1)',
                touchAction: 'none'
            } : {
                zIndex: Z.sheet,
                left: SIDE_MARGIN, right: SIDE_MARGIN, bottom: 0,
                height,
                paddingBottom: 'var(--safe-bottom)',
                // Animating during a drag would make the sheet lag the finger.
                transition: dragging ? 'none' : 'height 260ms cubic-bezier(0.32, 0.72, 0, 1)',
                touchAction: 'none'
            }}
        >
            {/* In landscape the grab rail is the panel's right edge, so it is
                still the thing between the sheet and the map. */}
            {horizontal && (
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="order-2 shrink-0 w-14 h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    role="button"
                    tabIndex={0}
                    aria-label={t.swipe}
                    aria-expanded={expanded}
                >
                    <div className="h-10 w-1.5 bg-black/15 dark:bg-white/20 rounded-full" />
                </div>
            )}

            <div className={horizontal
                ? 'order-1 flex-1 min-w-0 flex flex-col overflow-hidden'
                : 'flex-1 min-h-0 flex flex-col'}>
            <div className={`flex flex-col shrink-0 ${horizontal ? 'pt-3' : 'items-center'}`}>
                {/* The grab area, not just the pill: MIN_DRAG_TARGET tall so the
                    sheet can be caught without aiming at a 4px bar. */}
                {!horizontal && (
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="w-full flex items-center justify-center h-14 cursor-grab active:cursor-grabbing"
                    role="button"
                    tabIndex={0}
                    aria-label={t.swipe}
                    aria-expanded={expanded}
                >
                    <div className="w-10 h-1.5 bg-black/15 dark:bg-white/20 rounded-full" />
                </div>
                )}

                {detail ? (
                    <div className="flex w-full items-center gap-2 px-3 mb-2">
                        <button
                            onClick={detail.onClose}
                            className="shrink-0 size-11 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
                            aria-label={t.close}
                        >
                            <span className="material-symbols-outlined !text-[22px]">arrow_back</span>
                        </button>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <span className="text-base font-black text-slate-900 dark:text-white truncate leading-tight">
                                {detail.title}
                            </span>
                            {detail.subtitle && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                                    {detail.subtitle}
                                </span>
                            )}
                        </div>
                        {detail.accent && (
                            <span
                                className="shrink-0 w-1.5 h-8 rounded-full"
                                style={{ background: detail.accent }}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                ) : tabs && tabs.length > 1 && (
                    <div className="flex w-full px-4 mb-2">
                        <div className="flex-1 flex p-1 gap-1 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5">
                            {tabs.map((tab, idx) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (idx === activeTabIdx) {
                                            if (!expanded) applyDetent('half');
                                        } else {
                                            setActiveTabIdx(idx);
                                        }
                                    }}
                                    className={`flex-1 h-11 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 ${idx === activeTabIdx
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 opacity-70'
                                        }`}
                                    aria-selected={idx === activeTabIdx}
                                    role="tab"
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!expanded && (
                    <div
                        onClick={() => applyDetent('half')}
                        className="w-full px-4 pb-2 overflow-hidden cursor-pointer"
                    >
                        {detail ? detail.summary : activeTab ? activeTab.summary : summaryContent}
                    </div>
                )}
            </div>

            <div
                className={`flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 transition-opacity duration-200 ${horizontal ? 'mx-2 mb-2 rounded-[20px]' : 'mx-2 mb-2 rounded-[24px]'} ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="h-full overflow-y-auto sheet-scroll p-4 pt-2">
                    {detail ? (
                        <div key={detail.id} className="animate-fade-in">
                            {detail.content}
                        </div>
                    ) : activeTab ? (
                        <div key={activeTab.id} className="animate-fade-in">
                            {activeTab.content}
                        </div>
                    ) : children}
                </div>
            </div>
            </div>
        </div>
    );
};

export default MobileBottomSheet;

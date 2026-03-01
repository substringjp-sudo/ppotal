import React, { useState, useRef } from 'react';
import { useI18n } from '../../lib/i18n-context';

const TRANSLATIONS = {
    ko: { swipe: '스와이프 ↔' },
    en: { swipe: 'Swipe ↔' },
    ja: { swipe: 'スワイプ ↔' }
};

export interface MobileSheetTab {
    id: string;
    label: string;
    content: React.ReactNode;
    summary: React.ReactNode;
}

interface MobileBottomSheetProps {
    tabs?: MobileSheetTab[];

    // Legacy support (optional)
    children?: React.ReactNode;
    summaryContent?: React.ReactNode;

    defaultExpanded?: boolean;
    onExpand?: () => void;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    tabs,
    children,
    summaryContent,
    defaultExpanded = false,
    onExpand,
    isOpen,
    onToggle
}) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isExpanded = isOpen !== undefined ? isOpen : internalExpanded;
    const sheetRef = useRef<HTMLDivElement>(null);
    const [activeTabIdx, setActiveTabIdx] = useState(0);

    const toggleExpand = () => {
        const nextState = !isExpanded;
        if (onToggle) {
            onToggle(nextState);
        } else {
            setInternalExpanded(nextState);
        }

        if (nextState && onExpand) {
            onExpand();
        }
    };

    const touchStart = useRef<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !tabs || tabs.length <= 1) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - touchStart.current.x;
        const dy = endY - touchStart.current.y;

        // Threshold for swipe
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                // Swipe Right (Go to previous tab)
                if (activeTabIdx > 0) {
                    setActiveTabIdx(activeTabIdx - 1);
                }
            } else {
                // Swipe Left (Go to next tab)
                if (activeTabIdx < tabs.length - 1) {
                    setActiveTabIdx(activeTabIdx + 1);
                }
            }
        }
        touchStart.current = null;
    };

    const activeTab = tabs ? tabs[activeTabIdx] : null;

    return (
        <div
            ref={sheetRef}
            // Bind touch listeners to the whole container so we catch swipes in header too
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="fixed left-3 right-3 z-[1050] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[32px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
                bottom: '12px',
                height: isExpanded ? 'calc(100svh - 40px)' : '140px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* Handle / Header Area */}
            <div
                className={`flex flex-col items-center shrink-0 transition-all duration-300 ${isExpanded ? 'pb-0' : 'pb-2'}`}
                style={{ background: 'transparent' }}
            >
                {/* Visual Handle */}
                <div
                    onClick={toggleExpand}
                    className="w-full flex justify-center py-1.5 cursor-pointer"
                >
                    <div className="w-10 h-1 bg-black/10 dark:bg-white/10 rounded-full" />
                </div>

                {/* Tab Navigation Buttons */}
                {tabs && tabs.length > 1 && (
                    <div className="flex w-full px-4 mb-2">
                        <div className="flex-1 flex p-1 bg-slate-200/50 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5">
                            {tabs.map((tab, idx) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (idx === activeTabIdx) {
                                            if (!isExpanded) toggleExpand();
                                        } else {
                                            setActiveTabIdx(idx);
                                        }
                                    }}
                                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${idx === activeTabIdx
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-sm scale-100'
                                        : 'text-slate-500 dark:text-slate-400 scale-95 opacity-70'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary Info (Visible ONLY when collapsed or as a header) */}
                {!isExpanded && (
                    <div
                        onClick={toggleExpand}
                        className="w-full px-4 pt-1 pb-2 transition-opacity duration-300 cursor-pointer overflow-hidden animate-in fade-in zoom-in-95"
                    >
                        {activeTab ? activeTab.summary : summaryContent}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div
                className={`flex-1 overflow-hidden m-2 bg-white/50 dark:bg-slate-900/50 rounded-[24px] border border-white/30 dark:border-white/5 shadow-inner transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="h-full overflow-y-auto p-4 pt-0">
                    {activeTab ? (
                        <div key={activeTab.id} className="animate-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', flex: 1 }}>
                                    {activeTab.label}
                                </h3>
                                {/* Hint for Swipe */}
                                <span style={{ fontSize: '10px', color: '#999' }}>
                                    {t.swipe}
                                </span>
                            </div>
                            {activeTab.content}
                        </div>
                    ) : children}
                </div>
            </div>
        </div>
    );
};

export default MobileBottomSheet;

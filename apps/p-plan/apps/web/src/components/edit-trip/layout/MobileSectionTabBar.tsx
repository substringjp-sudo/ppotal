'use client';
import { useRef, useEffect } from 'react';
import { cn } from '@pplaner/shared';
import { SECTIONS, SectionId } from '@pplaner/shared';

interface MobileSectionTabBarProps {
    activeSection: SectionId;
    setActiveSection: (id: SectionId) => void;
    isSaving: boolean;
    onSave: () => void;
    sectionWarnings: Record<string, { critical: number; warning: number; info: number }>;
}

export default function MobileSectionTabBar({
    activeSection,
    setActiveSection,
    isSaving,
    onSave,
    sectionWarnings,
}: MobileSectionTabBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const btn = scrollRef.current?.querySelector(`[data-section="${activeSection}"]`);
        btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeSection]);

    const handleSectionClick = (id: SectionId) => {
        setActiveSection(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const activeSectionData = SECTIONS.find((s) => s.id === activeSection);

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            {/* 저장 버튼 + 현재 섹션 표시 */}
            <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-[14px] text-primary">
                        {activeSectionData?.icon}
                    </span>
                    {activeSectionData?.label}
                </span>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className={cn(
                        'compact-touch flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all',
                        isSaving
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                    )}
                >
                    <span className={cn('material-symbols-rounded text-[13px]', isSaving && 'animate-spin')}>
                        {isSaving ? 'sync' : 'publish'}
                    </span>
                    {isSaving ? '저장 중' : '저장'}
                </button>
            </div>

            {/* 섹션 탭 스크롤 */}
            <div
                ref={scrollRef}
                className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide"
            >
                {SECTIONS.map((section) => {
                    const holds = sectionWarnings[section.id] || { critical: 0, warning: 0, info: 0 };
                    const isActive = activeSection === section.id;
                    const hasWarning = holds.critical > 0 || holds.warning > 0;

                    return (
                        <button
                            key={section.id}
                            data-section={section.id}
                            onClick={() => handleSectionClick(section.id as SectionId)}
                            className={cn(
                                'compact-touch relative flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all shrink-0 text-[11px] font-bold',
                                isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            )}
                        >
                            <span
                                className={cn(
                                    'material-symbols-rounded text-[15px]',
                                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                                )}
                            >
                                {section.icon}
                            </span>
                            {section.label}
                            {hasWarning && (
                                <span
                                    className={cn(
                                        'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900',
                                        holds.critical > 0 ? 'bg-red-500' : 'bg-amber-400'
                                    )}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

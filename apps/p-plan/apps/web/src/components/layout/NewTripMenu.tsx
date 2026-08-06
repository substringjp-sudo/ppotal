'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore, generateId, cn } from '@pplaner/shared';
import PathwalkImportModal from '@/components/travelogs/PathwalkImportModal';
import { TRANSITION_SPRING } from '@/lib/animations';

/**
 * "새로 시작" — 만들기는 목적지가 아니라 상시 액션이다.
 *
 * 예전엔 이 네 개의 문이 홈("내 여행") 안의 히어로 블록에 박혀 있었다. 그래서
 * 둘러보기에 있는 동안에는 만들기 진입점이 아예 사라졌고(모바일엔 가운데 + 버튼이
 * 있는데 데스크탑엔 짝이 없었다), 홈에 갈 때마다 내 여행 목록보다 버튼이 먼저 보였다.
 *
 * 만들기·내 것 보기·남의 것 보기는 서로 다른 축이라, 만들기는 어느 화면에 있든
 * 같은 자리에 있어야 한다.
 */

interface Door {
    id: string;
    icon: string;
    label: string;
    sub: string;
}

export default function NewTripMenu({ userId, savedCount = 0 }: { userId?: string; savedCount?: number }) {
    const router = useRouter();
    const openWizard = useWizardStore((s) => s.open);
    const [open, setOpen] = useState(false);
    const [showPathwalk, setShowPathwalk] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onEsc);
        };
    }, [open]);

    const doors: Door[] = [
        { id: 'plan', icon: 'edit_note', label: '계획으로', sub: '일정을 짜며 시작' },
        { id: 'photos', icon: 'photo_library', label: '사진으로', sub: '사진을 올리면 바로 정리돼요' },
        { id: 'pathwalk', icon: 'footprint', label: 'PATHWALK', sub: '발자취에서 가져오기' },
        {
            id: 'saved', icon: 'bookmark', label: '저장한 곳에서',
            sub: savedCount > 0 ? `가고 싶은 지도 · ${savedCount}곳` : '둘러보기에서 마음에 든 곳 저장',
        },
    ];

    const pick = (id: string) => {
        setOpen(false);
        switch (id) {
            case 'plan': openWizard('PLAN'); break;
            // 사진이 곧 시작이므로 위저드(날짜·지역·취향)를 건너뛰고 빈 여행기 편집기로 바로 간다
            case 'photos': router.push(`/travelogs/log_${generateId()}/edit?photos=1`); break;
            case 'pathwalk': setShowPathwalk(true); break;
            case 'saved': router.push(savedCount > 0 ? '/saved' : '/discover?tab=spots'); break;
        }
    };

    return (
        <>
            <div className="relative" ref={wrapRef}>
                <button
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 xl:px-4 text-xs font-black text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all whitespace-nowrap"
                >
                    <span className="material-symbols-rounded text-base">add</span>
                    <span className="hidden lg:inline">새로 시작</span>
                </button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            role="menu"
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            transition={TRANSITION_SPRING}
                            className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl z-50"
                        >
                            {doors.map((d) => (
                                <button
                                    key={d.id}
                                    role="menuitem"
                                    onClick={() => pick(d.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left',
                                        'hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors',
                                    )}
                                >
                                    <span className="material-symbols-rounded text-[20px] text-primary shrink-0">{d.icon}</span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-black text-slate-900 dark:text-white">{d.label}</span>
                                        <span className="block text-[10px] font-semibold text-slate-400 truncate">{d.sub}</span>
                                    </span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showPathwalk && userId && (
                <PathwalkImportModal userId={userId} onClose={() => setShowPathwalk(false)} />
            )}
        </>
    );
}

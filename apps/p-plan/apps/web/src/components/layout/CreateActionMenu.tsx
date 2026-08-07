'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWizardStore, generateId } from '@pplaner/shared';
import { TRANSITION_SPRING } from '@/lib/animations';
import PathwalkImportModal from '@/components/travelogs/PathwalkImportModal';
import { useAuth } from '@/hooks/useAuth';

export default function CreateActionMenu() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showPathwalk, setShowPathwalk] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const openWizard = useWizardStore((s) => s.open);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    const startFromPhotos = () => {
        setIsOpen(false);
        router.push(`/travelogs/log_${generateId()}/edit?photos=1`);
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="새로 시작 메뉴 열기"
            >
                <span className="material-symbols-rounded text-xl">add</span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={TRANSITION_SPRING}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 overflow-hidden"
                    >
                        <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">새로 시작</p>
                        
                        <button
                            onClick={() => { setIsOpen(false); openWizard('PLAN'); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                        >
                            <span className="material-symbols-rounded text-primary text-[20px] mt-0.5">edit_note</span>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">계획으로</span>
                                <span className="block text-xs text-slate-400 mt-0.5">여행 일정을 짜며 시작합니다</span>
                            </div>
                        </button>
                        
                        <button
                            onClick={startFromPhotos}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                        >
                            <span className="material-symbols-rounded text-indigo-500 text-[20px] mt-0.5">photo_library</span>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">사진으로</span>
                                <span className="block text-xs text-slate-400 mt-0.5">사진을 올리면 자동으로 정리돼요</span>
                            </div>
                        </button>

                        <button
                            onClick={() => { setIsOpen(false); setShowPathwalk(true); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                        >
                            <span className="material-symbols-rounded text-emerald-500 text-[20px] mt-0.5">footprint</span>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">PATHWALK</span>
                                <span className="block text-xs text-slate-400 mt-0.5">기록된 발자취에서 가져옵니다</span>
                            </div>
                        </button>

                        <Link
                            href="/saved"
                            onClick={() => setIsOpen(false)}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                        >
                            <span className="material-symbols-rounded text-amber-500 text-[20px] mt-0.5">bookmark</span>
                            <div>
                                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">저장한 곳에서</span>
                                <span className="block text-xs text-slate-400 mt-0.5">둘러보기에서 마음에 든 장소들</span>
                            </div>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {showPathwalk && user && (
                <PathwalkImportModal userId={user.uid} onClose={() => setShowPathwalk(false)} />
            )}
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    tripTitle?: string;
    isDeleting?: boolean;
}

export default function DeleteTripModal({
    isOpen,
    onClose,
    onConfirm,
    tripTitle = '이 여행',
    isDeleting = false,
}: DeleteTripModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ESC 키로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeleting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isDeleting, onClose]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* 배경 오버레이 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !isDeleting && onClose()}
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
                />

                {/* 모달 창 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/30 overflow-hidden z-10"
                >
                    {/* 상단 붉은 경고 헤더 */}
                    <div className="p-6 pb-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-500 shadow-inner">
                            <span className="material-symbols-rounded text-3xl">delete_forever</span>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                여행 계획을 삭제하시겠습니까?
                            </h3>
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                &quot;{tripTitle}&quot;
                            </p>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                            삭제된 여행 계획과 포함된 모든 세부 일정, 숙소, 교통, 예산 데이터는 즉시 제거되며 <span className="font-bold text-slate-700 dark:text-slate-200">다시 복구할 수 없습니다.</span>
                        </p>
                    </div>

                    {/* 하단 액션 버튼 */}
                    <div className="p-6 pt-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="material-symbols-rounded animate-spin text-lg">sync</span>
                                    <span>삭제하는 중...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-rounded text-lg">delete</span>
                                    <span>영구 삭제하기</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="w-full py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                        >
                            취소하고 유지하기
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

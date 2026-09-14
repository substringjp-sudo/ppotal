'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

interface SaveLoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripTitle?: string;
}

export default function SaveLoginPromptModal({ isOpen, onClose, tripTitle }: SaveLoginPromptModalProps) {
    const { loginWithGoogle } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-white"
                    >
                        {/* Header Banner */}
                        <div className="p-6 bg-gradient-to-br from-primary via-primary-dark to-slate-900 text-white relative overflow-hidden text-center">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white mx-auto flex items-center justify-center shadow-lg mb-3">
                                <span className="material-symbols-rounded text-3xl text-amber-300">cloud_upload</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-white">
                                여행 계획을 계정에 보관하세요
                            </h3>
                            <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto">
                                {tripTitle ? `"${tripTitle}" 계획이` : '작성 중인 여행 계획이'} 영구 저장됩니다
                            </p>
                        </div>

                        {/* Feature List */}
                        <div className="p-6 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-lg">folder_shared</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                        여행별 분리 & 영구 저장
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        브라우저 캐시 삭제나 창을 닫아도 내 계정에 안전하게 남아있어요.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-lg">devices</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                        모바일 & PC 실시간 동기화
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        여행 현장에서 스마트폰으로 바로 열어보고 일정을 체크하세요.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-lg">group_add</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                        동행자 초대 및 공동 편집
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                        링크 하나로 친구, 가족을 초대해 함께 계획을 완성할 수 있어요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 pt-2 space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    loginWithGoogle();
                                }}
                                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>Google 계정으로 로그인하고 저장하기</span>
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                나중에 로그인하고 계속 게스트로 작성하기
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

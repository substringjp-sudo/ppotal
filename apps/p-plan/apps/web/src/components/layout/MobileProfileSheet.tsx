'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@pplaner/shared';
import Link from 'next/link';
import ProfileModal from '../user/ProfileModal';

interface MobileProfileSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MobileProfileSheet({ isOpen, onClose }: MobileProfileSheetProps) {
    const { user, logout } = useAuth();
    const { profile } = useUserStore();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    if (!user) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm"
                        />
                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl"
                            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                            </div>

                            {/* Profile info */}
                            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 bg-cover bg-center border-2 border-primary/20"
                                        style={{ backgroundImage: `url('${user.photoURL || ''}')` }}
                                    />
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white text-base leading-tight">
                                            {profile?.displayName || user.displayName || '사용자'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu items */}
                            <nav className="px-3 py-3 space-y-1">
                                <button
                                    onClick={() => { setIsProfileModalOpen(true); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
                                >
                                    <span className="material-symbols-rounded text-xl text-primary">manage_accounts</span>
                                    프로필 설정
                                    <span className="material-symbols-rounded text-slate-300 ml-auto text-sm">chevron_right</span>
                                </button>

                                <Link
                                    href="/travelogs"
                                    onClick={onClose}
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
                                >
                                    <span className="material-symbols-rounded text-xl text-primary">auto_stories</span>
                                    여행기록
                                    <span className="material-symbols-rounded text-slate-300 ml-auto text-sm">chevron_right</span>
                                </Link>

                                <Link
                                    href="/stats"
                                    onClick={onClose}
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
                                >
                                    <span className="material-symbols-rounded text-xl text-primary">analytics</span>
                                    인텔리전스 (통계)
                                    <span className="material-symbols-rounded text-slate-300 ml-auto text-sm">chevron_right</span>
                                </Link>

                                <Link
                                    href="/journey-atlas"
                                    onClick={onClose}
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
                                >
                                    <span className="material-symbols-rounded text-xl text-primary">explore</span>
                                    탐색 (Journey Atlas)
                                    <span className="material-symbols-rounded text-slate-300 ml-auto text-sm">chevron_right</span>
                                </Link>

                                <button
                                    onClick={async () => { onClose(); await logout(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm font-bold"
                                >
                                    <span className="material-symbols-rounded text-xl">logout</span>
                                    로그아웃
                                </button>
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        </>
    );
}

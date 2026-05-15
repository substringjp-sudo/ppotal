'use client';
import Link from 'next/link';
import { useWizardStore } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@pplaner/shared';
import { useState, useEffect, useRef } from 'react';
import ProfileModal from '../user/ProfileModal';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from './NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_EASE, TRANSITION_DEFAULT, TRANSITION_SPRING, TRANSITION_SPRING_BOUNCY } from '@/lib/animations';

export default function Header() {
    const openWizard = useWizardStore((state) => state.open);
    const { user, loginWithGoogle, logout } = useAuth();
    const { profile, setProfile } = useUserStore();
    const pathname = usePathname();
    
    // 실시간 알림 활성화
    useNotifications(user?.uid);
    
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // 모바일 스크롤시 헤더 숨기기 로직
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);


    // 사용자 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserMenuOpen]);

    const navLinks = [
        { href: '/', label: '홈', icon: 'home', authRequired: true },
        { href: '/journey-atlas', label: '탐색', icon: 'explore', authRequired: true },
        { href: '/wishlist', label: '위시리스트', icon: 'favorite', authRequired: true },
        { href: '/trips', label: '내 여행', icon: 'luggage', authRequired: true },
        { href: '/travelogs', label: '여행기록', icon: 'auto_stories', authRequired: true },
        { href: '/stats', label: '인텔리전스', icon: 'analytics', authRequired: true },
    ].filter(link => !link.authRequired || !!user);

    return (
        <>
            <motion.header 
                initial={false}
                animate={{ 
                    y: isVisible ? 0 : -100,
                    opacity: isVisible ? 1 : 0 
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 lg:px-6 xl:px-20 py-2 lg:py-3 w-full" 
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)' }}
            >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

                    {/* 로고 */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 text-primary group cursor-pointer">
                            <motion.span 
                                whileHover={{ rotate: 12, scale: 1.1 }}
                                className="material-symbols-rounded text-3xl font-bold transition-transform"
                            >
                                travel_explore
                            </motion.span>
                            <h2 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight">
                                PPLANER
                            </h2>
                        </Link>

                        {/* 데스크탑 내비게이션 */}
                        <nav className="hidden md:flex items-center gap-1 xl:gap-2">
                            {navLinks.map((link) => {
                                const isActive = link.href === '/' 
                                    ? pathname === '/' 
                                    : pathname.startsWith(link.href);
                                    
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`relative px-4 py-2 text-sm font-black transition-all duration-300 ${
                                            isActive 
                                                ? 'text-white' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNav"
                                                className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 380,
                                                    damping: 30
                                                }}
                                            />
                                        )}
                                        <span className="relative z-10">{link.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 우측 액션 영역 */}
                    <div className="flex flex-1 justify-end gap-3 items-center">

                        {/* 알림 벨 */}
                        {user && <NotificationBell />}

                        {/* 프로필 / 로그인 */}
                        {user ? (
                            <div className="relative" ref={userMenuRef}>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="w-9 h-9 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center border-2 border-primary/20 cursor-pointer hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    style={{ backgroundImage: `url('${user.photoURL || ''}')` }}
                                    title={user.displayName || 'Profile'}
                                    aria-label={`${user.displayName || '사용자'} 프로필 메뉴 열기`}
                                />
                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={TRANSITION_SPRING}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 overflow-hidden"
                                        >
                                        <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-700 mb-1">
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user.displayName}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setIsProfileModalOpen(true);
                                                setIsUserMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-sm">settings</span>
                                            프로필 설정
                                        </button>
                                        <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                            <span className="material-symbols-rounded text-sm">logout</span>
                                            로그아웃
                                        </button>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button
                                onClick={() => loginWithGoogle()}
                                aria-haspopup="dialog"
                                className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors whitespace-nowrap"
                            >
                                로그인
                            </button>
                        )}

                    </div>
                </div>

        </motion.header>
        <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        </>
    );
}

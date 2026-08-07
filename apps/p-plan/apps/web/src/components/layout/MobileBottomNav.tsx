'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWizardStore } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { usePageActionStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import { useState } from 'react';
import MobileProfileSheet from './MobileProfileSheet';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSITION_SPRING, TRANSITION_SPRING_BOUNCY } from '@/lib/animations';

// 라이프사이클 컨셉: 내 여행 / 탐색 + 가운데 "새로 시작" + 프로필 (위시·기록·통계는 프로필 시트로)
// 상단 내비와 같은 목적지 둘 — 화면 크기가 달라도 구조는 같아야 한다.
const NAV_ITEMS = [
    { href: '/', label: '내 여행', icon: 'luggage', exact: true, authRequired: true },
    { href: '/discover', label: '둘러보기', icon: 'explore', exact: false, authRequired: true },
];

function NavItem({ href, label, icon, isActive }: { href: string; label: string; icon: string; isActive: boolean }) {
    return (
        <Link
            href={href}
            className="compact-touch flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px] transition-all"
            aria-current={isActive ? 'page' : undefined}
        >
            <motion.span
                initial={false}
                animate={{ 
                    scale: isActive ? 1.2 : 1,
                    y: isActive ? -2 : 0
                }}
                transition={TRANSITION_SPRING}
                className={`material-symbols-rounded text-[24px] ${
                    isActive ? 'text-primary font-bold' : 'text-slate-400 dark:text-slate-500'
                }`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
                {icon}
            </motion.span>
            <motion.span
                initial={false}
                animate={{ opacity: isActive ? 1 : 0.7, scale: isActive ? 1.05 : 1 }}
                className={`text-xs font-bold transition-colors leading-none ${
                    isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
                }`}
            >
                {label}
            </motion.span>
        </Link>
    );
}

const isItemActive = (item: (typeof NAV_ITEMS)[number], pathname: string) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

export default function MobileBottomNav() {
    const pathname = usePathname();
    const openWizard = useWizardStore((state) => state.open);
    const { user, loginWithGoogle } = useAuth();
    const { pendingFriendRequests } = useUserStore();
    const { action: pageAction, icon: pageActionIcon, label: pageActionLabel } = usePageActionStore();
    const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

    // 비로그인 방문자의 '/'는 게스트 편집기(자체 모바일 탭바 보유)를 그대로 보여주므로 숨긴다.
    if (pathname.startsWith('/edit-trip') || (!user && pathname === '/')) return null;

    const visibleItems = NAV_ITEMS.filter(item => !item.authRequired || !!user);
    const leftItems = visibleItems.slice(0, 2);
    const rightItems = visibleItems.slice(2);

    const handleCenterAction = () => {
        if (pageAction) {
            pageAction();
        } else if (user) {
            openWizard();
        } else {
            loginWithGoogle();
        }
    };

    const centerIcon = pageAction ? pageActionIcon : (user ? 'add' : 'login');
    const centerLabel = pageAction ? pageActionLabel : (user ? '새 여행' : '로그인');

    const isProfileActive = pathname === '/journey-atlas' || pathname.startsWith('/journey-atlas/');
    const hasNotification = pendingFriendRequests.length > 0;

    return (
        <>
            <motion.nav
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, ...TRANSITION_SPRING }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-[20px] backdrop-saturate-[1.6] bg-white/[.72] dark:bg-slate-900/[.72] border-t border-slate-200/70 dark:border-slate-800"
                role="navigation"
                aria-label="모바일 하단 내비게이션"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around px-2 py-3">
                    {visibleItems.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            isActive={isItemActive(item, pathname)}
                        />
                    ))}

                    {/* 가운데 액션: 새로 시작 (계획/기록 위저드) */}
                    <button
                        onClick={handleCenterAction}
                        aria-label={centerLabel}
                        className="compact-touch flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px]"
                    >
                        <span className="w-11 h-11 -mt-4 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-rounded text-[24px]">{centerIcon}</span>
                        </span>
                        <span className="text-xs font-bold leading-none text-slate-400 dark:text-slate-500">{centerLabel}</span>
                    </button>

                    {/* 프로필 버튼 */}
                    <button
                        onClick={() => user ? setIsProfileSheetOpen(true) : loginWithGoogle()}
                        aria-label="프로필"
                        className="compact-touch flex flex-col items-center gap-1 px-3 py-1 rounded-xl min-w-[56px] transition-all relative"
                    >
                        {user ? (
                            <motion.div
                                animate={{ scale: isProfileActive ? 1.2 : 1 }}
                                transition={TRANSITION_SPRING}
                                className={`w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center ring-2 transition-all ${isProfileActive ? 'ring-primary' : 'ring-transparent'}`}
                                style={{ backgroundImage: `url('${user.photoURL || ''}')` }}
                            >
                                {hasNotification && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900" 
                                    />
                                )}
                            </motion.div>
                        ) : (
                            <span className="material-symbols-rounded text-[24px] text-slate-400 dark:text-slate-500">
                                account_circle
                            </span>
                        )}
                        <span className={`text-xs font-bold leading-none transition-colors ${isProfileActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                            프로필
                        </span>
                    </button>
                </div>
            </motion.nav>

            <MobileProfileSheet isOpen={isProfileSheetOpen} onClose={() => setIsProfileSheetOpen(false)} />
        </>
    );
}

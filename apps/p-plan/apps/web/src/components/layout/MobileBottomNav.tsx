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

const NAV_ITEMS = [
    { href: '/', label: '홈', icon: 'home', exact: true, authRequired: true },
    { href: '/wishlist', label: '위시', icon: 'favorite', exact: true, authRequired: true },
    { href: '/trips', label: '여행', icon: 'luggage', exact: false, authRequired: true },
    { href: '/travelogs', label: '기록', icon: 'auto_stories', exact: true, authRequired: true },
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
                className={`text-[10px] font-bold transition-colors leading-none ${
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

    if (pathname.startsWith('/edit-trip')) return null;

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
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800"
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
                        <span className={`text-[10px] font-bold leading-none transition-colors ${isProfileActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                            프로필
                        </span>
                    </button>
                </div>
            </motion.nav>

            <MobileProfileSheet isOpen={isProfileSheetOpen} onClose={() => setIsProfileSheetOpen(false)} />
        </>
    );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@pplaner/shared';
import { motion } from 'framer-motion';

const TABS = [
    { href: '/', label: '여행', icon: 'luggage' },
    { href: '/travelogs', label: '여행기', icon: 'auto_stories' },
    { href: '/footprint', label: '발자취', icon: 'footprint' },
    { href: '/journey-atlas', label: '여행 지도', icon: 'map' },
    { href: '/stats', label: '인텔리전스', icon: 'analytics' },
    { href: '/saved', label: '저장한 곳', icon: 'bookmark' },
];

export default function MyPageTabs() {
    const pathname = usePathname();

    return (
        <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm sticky top-[env(safe-area-inset-top,0px)] md:top-[60px] z-40">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
                <nav className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-3 md:py-4">
                    {TABS.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    'relative flex items-center gap-2 px-1 py-1 text-sm font-bold whitespace-nowrap transition-colors',
                                    isActive
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                )}
                            >
                                <span className={cn(
                                    'material-symbols-rounded text-[18px]',
                                    isActive ? 'text-primary' : 'text-slate-400'
                                )}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="mypage-tab-indicator"
                                        className="absolute -bottom-[13px] md:-bottom-[17px] left-0 right-0 h-0.5 bg-primary"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

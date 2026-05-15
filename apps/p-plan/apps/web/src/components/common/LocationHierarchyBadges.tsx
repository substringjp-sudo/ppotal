'use client';

import { Globe, Flag, Map as MapIcon, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';

export interface LocationHierarchy {
    country?: string;
    prefecture?: string;
    city?: string;
}

interface LocationHierarchyBadgesProps extends LocationHierarchy {
    /** compact 모드: 작은 텍스트 + 아이콘 (transport, dense UI용) */
    compact?: boolean;
    className?: string;
    /** 애니메이션 포함 여부 (기본 true) */
    animated?: boolean;
}

/**
 * country → prefecture → city 계층을 일관된 스타일의 칩(chip)으로 표시하는 공유 컴포넌트.
 * 앱 전역의 모든 위치 선택 UI에서 사용.
 */
export function LocationHierarchyBadges({
    country,
    prefecture,
    city,
    compact = false,
    className,
    animated = true,
}: LocationHierarchyBadgesProps) {
    if (!country && !prefecture && !city) return null;

    const activeBadges = ([
        country && {
            key: 'country',
            label: country,
            icon: Globe,
            iconColor: 'text-primary',
            bg: 'bg-orange-50 dark:bg-orange-950/30',
            border: 'border-orange-100 dark:border-orange-900/40',
            text: 'text-orange-700 dark:text-orange-400',
        },
        prefecture && {
            key: 'prefecture',
            label: prefecture,
            icon: Flag,
            iconColor: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-100 dark:border-amber-900/40',
            text: 'text-amber-700 dark:text-amber-400',
        },
        city && {
            key: 'city',
            label: city,
            icon: MapIcon,
            iconColor: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-100 dark:border-emerald-900/40',
            text: 'text-emerald-700 dark:text-emerald-400',
        },
    ].filter(Boolean)) as {
        key: string;
        label: string;
        icon: LucideIcon;
        iconColor: string;
        bg: string;
        border: string;
        text: string;
    }[];

    const badgeSizeClass = compact
        ? 'px-1.5 py-0.5 text-[9px] gap-1'
        : 'px-2.5 py-1 text-[11px] gap-1.5';
    const iconSizeClass = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';

    if (!animated) {
        return (
            <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
                {activeBadges.map(b => (
                    <span
                        key={b.key}
                        className={cn(
                            'inline-flex items-center rounded-lg border font-bold',
                            badgeSizeClass,
                            b.bg,
                            b.border,
                            b.text,
                        )}
                    >
                        <b.icon className={cn(iconSizeClass, b.iconColor)} />
                        {b.label}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            <AnimatePresence mode="popLayout">
                {activeBadges.map((b, i) => (
                    <motion.span
                        key={b.key}
                        initial={{ opacity: 0, scale: 0.8, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className={cn(
                            'inline-flex items-center rounded-lg border font-bold',
                            badgeSizeClass,
                            b.bg,
                            b.border,
                            b.text,
                        )}
                    >
                        <b.icon className={cn(iconSizeClass, b.iconColor)} />
                        {b.label}
                    </motion.span>
                ))}
            </AnimatePresence>
        </div>
    );
}

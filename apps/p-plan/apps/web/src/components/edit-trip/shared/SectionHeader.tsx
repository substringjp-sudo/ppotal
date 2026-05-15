'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@pplaner/shared';

interface SectionHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    className?: string;
    iconClassName?: string;
}

export function SectionHeader({ 
    icon: Icon, 
    title, 
    subtitle, 
    className,
    iconClassName
}: SectionHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-1.5 mb-3", className)}>
            <div className="flex items-center gap-2.5">
                <div className={cn(
                    "w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center",
                    iconClassName
                )}>
                    <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

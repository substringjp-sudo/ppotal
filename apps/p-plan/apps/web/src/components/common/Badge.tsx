'use client';
import { cn } from '@pplaner/shared';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'outline' | 'glass';
    className?: string;
    pulse?: boolean;
}

export default function Badge({ children, variant = 'primary', className, pulse }: BadgeProps) {
    const variants = {
        primary: 'bg-primary text-white shadow-lg shadow-primary/20',
        success: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
        outline: 'bg-white/90 dark:bg-slate-900/90 text-slate-400 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md shadow-sm',
        glass: 'bg-slate-800/80 text-white/70 ring-1 ring-white/10 backdrop-blur-md shadow-sm'
    };

    return (
        <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest leading-none",
            variants[variant],
            pulse && "animate-pulse",
            className
        )}>
            {children}
        </div>
    );
}

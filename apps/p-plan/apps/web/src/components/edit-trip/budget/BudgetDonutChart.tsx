'use client';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { cn } from '@pplaner/shared';
import { CATEGORY_MAP, MainCategory } from '@pplaner/shared';

interface BudgetDonutChartProps {
    data: {
        id: string;
        label: string;
        value: number;
        colorClass: string;
        strokeColor: string;
    }[];
    total: number;
    className?: string;
    centerText?: React.ReactNode;
}

export default function BudgetDonutChart({ data, total, className, centerText }: BudgetDonutChartProps) {
    const RADIUS = 40;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    const segments = useMemo(() => {
        let currentOffset = 0;
        return data.filter(d => d.value > 0).map((item) => {
            const percentage = total > 0 ? item.value / total : 0;
            const strokeLength = percentage * CIRCUMFERENCE;
            const gap = CIRCUMFERENCE - strokeLength;
            
            // Adjust offset so it starts from top (rotate -90 in svg)
            const strokeDashoffset = -currentOffset;
            currentOffset += strokeLength;

            return {
                ...item,
                percentage,
                strokeLength,
                strokeDasharray: `${strokeLength} ${gap}`,
                strokeDashoffset
            };
        });
    }, [data, total, CIRCUMFERENCE]);

    if (total === 0) return null;

    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full -rotate-90"
            >
                {/* Background Track */}
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="transparent"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="12"
                />
                
                {/* Segments */}
                {segments.map((segment) => (
                    <motion.circle
                        key={segment.id}
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        fill="transparent"
                        stroke={segment.strokeColor}
                        strokeWidth="12"
                        strokeDasharray={segment.strokeDasharray}
                        strokeLinecap="round" // round caps make small segments look better, but can overlap slightly
                        className="transition-all duration-300"
                        
                        initial={{ strokeDashoffset: CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: segment.strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                    />
                ))}
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {centerText}
            </div>
        </div>
    );
}

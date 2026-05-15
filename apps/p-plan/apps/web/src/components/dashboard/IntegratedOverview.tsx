'use client';
import { useTripStore } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatTripDuration } from '@pplaner/shared';

import ScrollReveal from '../common/ScrollReveal';

export default function IntegratedOverview() {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const router = useRouter();
    
    const analysis = useMemo(() => {
        if (!currentTrip) return null;
        
        const days = currentTrip.dates?.startDate && currentTrip.dates?.endDate 
            ? Math.ceil((new Date(currentTrip.dates.endDate).getTime() - new Date(currentTrip.dates.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : (currentTrip.dates?.durationDays || 0);
            
        const regions = currentTrip.locations?.regions || [];
        const accommodations = currentTrip.accommodation || [];
        const flightCount = currentTrip.flights?.length || 0;
        const totalTransports = flightCount + (currentTrip.driving?.length || 0) + (currentTrip.publicTransport?.length || 0);

        return {
            days,
            regions: regions.map(r => r.name).join(', ') || '지역 미정',
            stats: [
                { label: '여행 기간', value: `${days}일`, icon: 'calendar_today', color: 'text-blue-500', tab: 'basic' },
                { label: '방문 지역', value: `${regions.length}곳`, icon: 'map', color: 'text-emerald-500', tab: 'schedule' },
                { label: '교통편', value: `${totalTransports}건`, icon: 'flight', color: 'text-indigo-500', tab: 'transport' },
                { label: '숙소 예약', value: `${accommodations.length}곳`, icon: 'bed', color: 'text-purple-500', tab: 'accommodation' },
            ]
        };
    }, [currentTrip]);

    if (!currentTrip || !analysis) return null;

    const handleEditClick = (tab: string = 'basic') => {
        router.push(`/edit-trip/${currentTrip.id}?tab=${tab}`);
    };

    return (
        <ScrollReveal>
            <section className="h-full overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
                <div className="relative h-full p-6 lg:p-8">
                    {/* Header with Background Accent */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <ScrollReveal delay={0.1}>
                            <div className="mb-4">
                                <div className="h-px w-20 bg-primary" />
                            </div>
                        </ScrollReveal>
                        
                        <div className="mb-8">
                            <ScrollReveal delay={0.2}>
                                <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight italic">
                                        {currentTrip.title}
                                    </h1>
                                    <motion.button 
                                        whileHover={{ scale: 1.02, backgroundColor: 'var(--primary-dark)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleEditClick('basic')}
                                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-none hover:shadow-2xl transition-all"
                                    >
                                        <span className="material-symbols-rounded text-sm">edit</span>
                                        <span className="text-xs font-black uppercase tracking-tighter">일정 수정하기</span>
                                    </motion.button>
                                </div>
                            </ScrollReveal>
                            
                            <ScrollReveal delay={0.3}>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 font-bold text-[11px] uppercase tracking-tight">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-rounded text-[16px] text-primary/60">location_on</span>
                                        <span className="truncate max-w-[250px]">{analysis.regions}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-rounded text-[16px] text-primary/60">calendar_month</span>
                                        <span>
                                            {currentTrip.dates?.startDate && currentTrip.dates?.endDate
                                                ? `${new Date(currentTrip.dates.startDate).toLocaleDateString('ko-KR')} - ${new Date(currentTrip.dates.endDate).toLocaleDateString('ko-KR')}`
                                                : formatTripDuration(undefined, undefined, currentTrip.dates?.durationDays)}
                                        </span>
                                    </div>
                                </div>
                            </ScrollReveal>
                        </div>

                        {/* Stats Grid (Very Compact) */}
                        <ScrollReveal delay={0.4}>
                            <div className="mt-auto">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {analysis.stats.map((stat, idx) => (
                                        <motion.button 
                                            key={stat.label} 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + (idx * 0.05) }}
                                            onClick={() => handleEditClick(stat.tab)}
                                            className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`material-symbols-rounded text-[14px] ${stat.color}`}>{stat.icon}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                                            </div>
                                            <div className="text-base font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{stat.value}</div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>
        </ScrollReveal>
    );
}

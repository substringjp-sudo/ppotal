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
        const hasBudget = (currentTrip.budget?.expenses?.length || 0) > 0;

        // 준비 진행률 — 히어로 한 곳에서만 말한다. 위젯마다 반복하던 퍼센트 표기는
        // 여기로 모으고 나머지 위젯에서는 지운다(같은 숫자가 여러 곳에서 다르게
        // 보이면 어느 쪽을 믿어야 할지 알 수 없어진다).
        const parts = [
            { key: 'regions', label: '지역', done: regions.length > 0, weight: 20 },
            { key: 'accommodation', label: '숙소', done: accommodations.length > 0, weight: 30 },
            { key: 'transport', label: '교통', done: totalTransports > 0, weight: 30 },
            { key: 'budget', label: '예산', done: hasBudget, weight: 20 },
        ];
        const progress = parts.reduce((sum, p) => sum + (p.done ? p.weight : 0), 0);
        const doneCount = parts.filter((p) => p.done).length;
        const headline =
            progress >= 100 ? '준비가 끝났어요. 이제 떠나기만 하면 돼요' :
            progress >= 70 ? '거의 다 왔어요. 남은 항목만 채우면 돼요' :
            progress >= 30 ? '한창 채우는 중이에요' :
            '이제 막 시작했어요';

        return {
            days,
            regions: regions.map(r => r.name).join(', ') || '지역 미정',
            progress,
            doneCount,
            totalCount: parts.length,
            headline,
            progressParts: parts,
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
            <section className="h-full overflow-hidden rounded-[20px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
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
                                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tighter leading-tight italic">
                                        {currentTrip.title}
                                    </h1>
                                    <motion.button 
                                        whileHover={{ scale: 1.02, backgroundColor: 'var(--primary-dark)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleEditClick('basic')}
                                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-none hover:shadow-2xl transition-all"
                                    >
                                        <span className="material-symbols-rounded text-sm">edit</span>
                                        <span className="text-xs font-semibold uppercase tracking-tighter">일정 수정하기</span>
                                    </motion.button>
                                </div>
                            </ScrollReveal>
                            
                            <ScrollReveal delay={0.3}>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 font-bold text-xs uppercase tracking-tight">
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

                        {/* 준비 진행률 — 이 화면 전체에서 퍼센트를 말하는 유일한 곳 */}
                        <ScrollReveal delay={0.35}>
                            <div className="mb-6 p-5 rounded-[14px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{analysis.headline}</p>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-bold text-primary tabular-nums leading-none">{analysis.progress}%</div>
                                        <div className="mt-1 text-xs text-slate-400">{analysis.totalCount}개 중 {analysis.doneCount}개 완료</div>
                                    </div>
                                </div>
                                <div className="flex h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden gap-0.5">
                                    {analysis.progressParts.map((p) => (
                                        <div
                                            key={p.key}
                                            className={cn('transition-all', p.done ? 'bg-primary' : 'bg-transparent')}
                                            style={{ width: `${p.weight}%` }}
                                            title={`${p.label} ${p.done ? '완료' : '미완료'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>

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
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                                            </div>
                                            <div className="text-base font-semibold text-slate-900 dark:text-white italic tracking-tighter leading-none">{stat.value}</div>
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

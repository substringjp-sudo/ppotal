'use client';
import { useTripStore, cn, calculateAggregatedBudget } from '@pplaner/shared';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function StatsSection() {
    const trip = useTripStore((state) => state.currentTrip);
    const router = useRouter();

    const aggregatedBudget = useMemo(() => {
        if (!trip) return null;
        return calculateAggregatedBudget(trip);
    }, [trip]);

    const visitedLocationsCount = useMemo(() => {
        if (!trip) return 0;
        const locations = new Set<string>();
        trip.dailyTimeline?.forEach(day => {
            day.events?.forEach(event => {
                if (event.location?.name) {
                    locations.add(event.location.name);
                }
            });
        });
        return locations.size;
    }, [trip]);

    if (!trip || !aggregatedBudget) return (
        <div className="flex flex-col gap-4 p-1 animate-pulse">
            <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-[2rem]" />)}
            </div>
            <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-[2rem]" />
        </div>
    );

    const stats = [
        {
            label: '방문 장소',
            value: visitedLocationsCount.toString(),
            unit: '곳',
            detail: `${trip.dailyTimeline?.length || 0}일간의 여정`,
            icon: 'map',
            gradient: 'from-blue-500 to-indigo-600',
            path: `/edit-trip/${trip.id}?tab=schedule`
        },
        {
            label: '여행 인원',
            value: (Object.values(trip.memberCounts || {}).reduce((a, b) => a + b, 0) || 1).toString(),
            unit: '명',
            detail: '함께 떠나는 멤버',
            icon: 'groups',
            gradient: 'from-emerald-400 to-teal-600',
            path: `/edit-trip/${trip.id}?tab=participants`
        },
        {
            label: '예산 소진',
            value: aggregatedBudget.total > 0 
                ? Math.round(aggregatedBudget.spent / Math.max(aggregatedBudget.total, 1) * 100).toString()
                : '0',
            unit: '%',
            detail: `${(aggregatedBudget.total - aggregatedBudget.spent).toLocaleString()}원 잔여`,
            icon: 'payments',
            gradient: 'from-orange-400 to-rose-600',
            path: `/edit-trip/${trip.id}?tab=budget`
        }
    ];

    const expenses = [
        { 
            category: '교통', 
            total: aggregatedBudget.byCategory['transport'] || 0, 
            spent: aggregatedBudget.spentByCategory['transport'] || 0,
            icon: 'flight', 
            gradient: 'from-blue-400 to-blue-600'
        },
        { 
            category: '숙박', 
            total: aggregatedBudget.byCategory['accommodation'] || 0, 
            spent: aggregatedBudget.spentByCategory['accommodation'] || 0,
            icon: 'hotel', 
            gradient: 'from-purple-400 to-purple-600'
        },
        { 
            category: '활동', 
            total: aggregatedBudget.byCategory['activity'] || 0, 
            spent: aggregatedBudget.spentByCategory['activity'] || 0,
            icon: 'local_activity', 
            gradient: 'from-pink-400 to-rose-600'
        },
        { 
            category: '기타/식비', 
            total: (aggregatedBudget.byCategory['other'] || 0) + (aggregatedBudget.byCategory['food'] || 0) + (aggregatedBudget.byCategory['shopping'] || 0), 
            spent: (aggregatedBudget.spentByCategory['other'] || 0) + (aggregatedBudget.spentByCategory['food'] || 0) + (aggregatedBudget.spentByCategory['shopping'] || 0),
            icon: 'shopping_bag', 
            gradient: 'from-slate-400 to-slate-600'
        },
    ];

    const maxExpense = Math.max(...expenses.map(e => Math.max(e.total, e.spent)), 1);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, idx) => (
                    <motion.button 
                        key={idx} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => router.push(stat.path)}
                        className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left group overflow-hidden relative"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-[0.03] blur-3xl group-hover:opacity-10 transition-opacity`} />
                        
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/5 group-hover:scale-110 transition-transform", 
                            `bg-gradient-to-br ${stat.gradient} text-white`)}>
                            <span className="material-symbols-rounded text-xl">{stat.icon}</span>
                        </div>
                        
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 block">{stat.label}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black italic tracking-tighter leading-none text-slate-900 dark:text-white">{stat.value}</span>
                            <span className="text-xs font-bold text-slate-500">{stat.unit}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 font-medium truncate">{stat.detail}</p>
                    </motion.button>
                ))}
            </div>

            {/* Expenses Summary Chart Container */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
                            <span className="material-symbols-rounded text-rose-500 scale-75">analytics</span>
                            카테고리별 지출 분석
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Category Wise Breakdown</p>
                    </div>
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full border border-primary/10">Insights</span>
                </div>
                
                <div className="space-y-6 flex-1 flex flex-col justify-around">
                    {expenses.map((expense, idx) => (
                        <div key={idx} className="space-y-2 group">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-sm", expense.gradient)}>
                                        <span className="material-symbols-rounded text-sm">{expense.icon}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{expense.category}</span>
                                        <div className="h-0.5 w-0 group-hover:w-full bg-primary/30 transition-all duration-300" />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-sm font-black italic text-slate-900 dark:text-white">₩{expense.spent.toLocaleString()}</span>
                                        {expense.total > 0 && (
                                            <span className="text-[9px] font-bold text-slate-400 italic">/ ₩{expense.total.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-2 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden relative border border-slate-200/50 dark:border-slate-800/30">
                                {/* Background / Planned Bar */}
                                {expense.total > 0 && (
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(expense.total / maxExpense) * 100}%` }}
                                        className={cn("absolute inset-y-0 left-0 opacity-[0.1] bg-gradient-to-r", expense.gradient)}
                                    />
                                )}
                                {/* Active / Spent Bar */}
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(expense.spent / maxExpense) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.2 + (idx * 0.1), ease: "circOut" }}
                                    className={cn("h-full rounded-full relative z-10 shadow-sm bg-gradient-to-r", expense.gradient)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center relative z-10">
                    <p className="text-[10px] text-slate-400 font-bold italic tracking-tight">지출 데이터를 기반으로 한 실시간 여행 예산 분석 리포트입니다.</p>
                </div>
            </div>
        </div>
    );
}

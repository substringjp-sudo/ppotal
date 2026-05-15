import React from 'react';
import { Trip, cn } from '@pplaner/shared';

interface ParticipantBudgetTabProps {
    trip: Trip;
    isSoloTrip: boolean;
    individualExpensesGrouped: Record<string, any[]>;
    formatAmount: (amount: number) => string;
    currencySymbol: string;
    updateBudget: (updates: any) => void;
}

export const ParticipantBudgetTab: React.FC<ParticipantBudgetTabProps> = ({
    trip,
    isSoloTrip,
    individualExpensesGrouped,
    formatAmount,
    currencySymbol,
    updateBudget
}) => {
    if (isSoloTrip) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                    <span className="material-symbols-rounded text-3xl">person</span>
                </div>
                <div>
                    <h5 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">개인 여행 모드</h5>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">참가자가 한 명인 경우 공동 예산 설정이 비활성화됩니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-rounded">groups</span>
                        </div>
                        <span className="text-[8px] font-black bg-indigo-500 text-white px-2 py-1 rounded uppercase tracking-widest">COMMON</span>
                    </div>
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">공동 예산 배정액</label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-black text-indigo-600">{currencySymbol}</span>
                        <input 
                            type="number"
                            value={trip.budget?.commonAllocated || 0}
                            onChange={(e) => updateBudget({ commonAllocated: Number(e.target.value) })}
                            className="bg-transparent border-none text-2xl font-black focus:ring-0 p-0 w-full text-indigo-600"
                        />
                    </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <span className="material-symbols-rounded">person</span>
                        </div>
                        <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-1 rounded uppercase tracking-widest">INDIVIDUAL</span>
                    </div>
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">인당 개인 지출 배정액</label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-600">{currencySymbol}</span>
                        <input 
                            type="number"
                            value={trip.budget?.individualAllocated || 0}
                            onChange={(e) => updateBudget({ individualAllocated: Number(e.target.value) })}
                            className="bg-transparent border-none text-2xl font-black focus:ring-0 p-0 w-full text-emerald-600"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">멤버별 지출 현황</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(trip.participants || []).map(p => {
                        const expenses = individualExpensesGrouped[p.id] || [];
                        const spent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                        const allocated = trip.budget?.individualAllocated || 0;
                        const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                        
                        return (
                            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-rounded">person</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h6 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{p.name || '무명 멤버'}</h6>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{expenses.length}개의 지출</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">사용액</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            percentage > 100 ? "text-rose-500" : "text-primary"
                                        )}>
                                            {currencySymbol} {formatAmount(spent)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-700",
                                                percentage > 100 ? "bg-rose-500" : "bg-primary"
                                            )}
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black opacity-40 uppercase">
                                        <span>배정액 대비 {Math.round(percentage)}%</span>
                                        {percentage > 100 && <span>초과!</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

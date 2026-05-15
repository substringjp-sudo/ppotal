import React from 'react';
import { CATEGORY_OPTIONS } from './BudgetConstants';
import BudgetDonutChart from './BudgetDonutChart';

interface BudgetOverviewTabProps {
    categoryTotals: Record<string, number>;
    totalConfirmedInBase: number;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
}

export const BudgetOverviewTab: React.FC<BudgetOverviewTabProps> = ({
    categoryTotals,
    totalConfirmedInBase,
    currencySymbol,
    formatAmount
}) => {
    const chartData = Object.entries(categoryTotals)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
            id: key,
            label: CATEGORY_OPTIONS.find(o => o.value === key)?.label || key,
            value,
            colorClass: '', // Legacy prop if needed
            strokeColor: key === 'food' ? '#6366f1' : 
                         key === 'transport' ? '#f43f5e' : 
                         key === 'accommodation' ? '#10b981' : 
                         key === 'shopping' ? '#f59e0b' : 
                         key === 'activity' ? '#8b5cf6' : '#94a3b8'
        }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-8 flex flex-col items-center justify-center">
                <div className="relative w-full aspect-square max-w-[320px]">
                    <BudgetDonutChart 
                        data={chartData}
                        total={totalConfirmedInBase}
                        centerText={
                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">누적 지출</span>
                                <span className="text-2xl font-black">{currencySymbol} {formatAmount(totalConfirmedInBase)}</span>
                            </div>
                        }
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">카테고리별 상세</h4>
                {CATEGORY_OPTIONS.map(category => {
                    const amount = categoryTotals[category.value] || 0;
                    const percentage = totalConfirmedInBase > 0 ? (amount / totalConfirmedInBase) * 100 : 0;
                    
                    return (
                        <div key={category.value} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:border-primary/20 transition-all">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-current/10 ${
                                category.value === 'food' ? 'bg-indigo-500' : 
                                category.value === 'transport' ? 'bg-rose-500' : 
                                category.value === 'accommodation' ? 'bg-emerald-500' : 
                                category.value === 'shopping' ? 'bg-amber-500' : 
                                category.value === 'activity' ? 'bg-violet-500' : 'bg-slate-400'
                            }`}>
                                <span className="material-symbols-rounded">{category.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">{category.label}</span>
                                    <span className="text-sm font-black text-primary">{currencySymbol} {formatAmount(Math.round(amount))}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${
                                                category.value === 'food' ? 'bg-indigo-500' : 
                                                category.value === 'transport' ? 'bg-rose-500' : 
                                                category.value === 'accommodation' ? 'bg-emerald-500' : 
                                                category.value === 'shopping' ? 'bg-amber-500' : 
                                                category.value === 'activity' ? 'bg-violet-500' : 'bg-slate-400'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 min-w-[30px]">{Math.round(percentage)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

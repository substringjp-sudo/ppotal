import React from 'react';
import { Trip, BudgetExpense, cn } from '@pplaner/shared';
import { CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS, CURRENCY_OPTIONS } from './BudgetConstants';

interface ExpenseListTabProps {
    trip: Trip;
    aggregatedExpenses: (Partial<BudgetExpense> & { isAuto?: boolean })[];
    formatAmount: (amount: number) => string;
    currencySymbol: string;
    onEdit: (expense: any) => void;
    onDelete: (id: string) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterCategory: string;
    setFilterCategory: (val: string) => void;
    filterSource: string;
    setFilterSource: (val: string) => void;
}

export const ExpenseListTab: React.FC<ExpenseListTabProps> = ({
    trip,
    aggregatedExpenses,
    formatAmount,
    currencySymbol,
    onEdit,
    onDelete,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterSource,
    setFilterSource
}) => {
    const filteredExpenses = aggregatedExpenses.filter(e => {
        const matchesSearch = e.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        const matchesSource = filterSource === 'all' || 
            (filterSource === 'manual' && !e.isAuto) || 
            (filterSource === 'auto' && e.isAuto);
        return matchesSearch && matchesCategory && matchesSource;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        type="text" 
                        placeholder="지출 항목 검색..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 text-xs font-black outline-none border-none cursor-pointer"
                    >
                        <option value="all">전체 카테고리</option>
                        {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <select 
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 text-xs font-black outline-none border-none cursor-pointer"
                    >
                        <option value="all">전체 출처</option>
                        <option value="manual">자료 입력</option>
                        <option value="auto">자동 수집</option>
                    </select>
                </div>
            </div>

            <div className="space-y-3">
                {filteredExpenses.map((expense) => {
                    const categoryInfo = CATEGORY_OPTIONS.find(c => c.value === expense.category);
                    const paymentMethod = PAYMENT_METHOD_OPTIONS.find(p => p.value === expense.paymentMethod);
                    const isManual = !expense.isAuto;

                    return (
                        <div 
                            key={expense.id} 
                            onClick={() => onEdit(expense)}
                            className={cn(
                                "group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:border-primary/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm relative overflow-hidden",
                                expense.isExcluded && "opacity-40 grayscale"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary/10",
                                isManual ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                            )}>
                                <span className="material-symbols-rounded text-2xl">{categoryInfo?.icon || 'payments'}</span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h5 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{expense.title}</h5>
                                    {expense.isAuto && (
                                        <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest">AUTO</span>
                                    )}
                                    {expense.status === 'planned' && (
                                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded uppercase tracking-widest">PLANNED</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {categoryInfo?.label}
                                    <div className="w-0.5 h-0.5 rounded-full bg-slate-300"></div>
                                    {paymentMethod?.label || '미지정'}
                                    {expense.paymentDate && (
                                        <>
                                            <div className="w-0.5 h-0.5 rounded-full bg-slate-300"></div>
                                            {expense.paymentDate}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{expense.currency}</span>
                                    <span className="text-base font-black text-slate-900 dark:text-white">
                                        {formatAmount(expense.amount || 0)}
                                    </span>
                                </div>
                                {expense.currency !== (trip.budget?.baseCurrency || 'KRW') && (
                                    <span className="text-[10px] font-black text-primary">
                                        ≈ {currencySymbol} {formatAmount(Math.round((expense.amount || 0) * (expense.exchangeRate || 1)))}
                                    </span>
                                )}
                            </div>

                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!expense.isAuto && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (expense.id) onDelete(expense.id);
                                        }}
                                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg"
                                    >
                                        <span className="material-symbols-rounded text-base">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredExpenses.length === 0 && (
                    <div className="py-20 text-center text-slate-300">
                        <span className="material-symbols-rounded text-4xl mb-2">search_off</span>
                        <p className="text-xs font-black uppercase tracking-widest">일치하는 지출 내역을 찾을 수 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
};

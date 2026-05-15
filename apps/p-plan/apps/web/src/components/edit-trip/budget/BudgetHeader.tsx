import React from 'react';
import { Trip, BudgetExpense } from '@pplaner/shared';
import { CURRENCY_OPTIONS } from './BudgetConstants';

interface BudgetHeaderProps {
    trip: Trip;
    currencySymbol: string;
    totalConfirmed: number;
    totalPlanned: number;
    totalCommonSpent: number;
    isSoloTrip: boolean;
    aggregatedExpenses: (Partial<BudgetExpense> & { isAuto?: boolean })[];
    formatAmount: (amount: number) => string;
}

export const BudgetHeader: React.FC<BudgetHeaderProps> = ({
    trip,
    currencySymbol,
    totalConfirmed,
    totalPlanned,
    totalCommonSpent,
    isSoloTrip,
    aggregatedExpenses,
    formatAmount
}) => {
    return (
        <div className="p-6 md:p-8 bg-slate-900 rounded-[28px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">총 예산 분석 (Spent vs Planned)</span>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-4xl font-black italic text-primary">{currencySymbol}</span>
                        <span className="text-5xl font-black">{formatAmount(totalConfirmed)}</span>
                        {totalPlanned > 0 && (
                            <span className="text-2xl font-black text-emerald-400/60 ml-2">
                                + {formatAmount(totalPlanned)} <span className="text-xs uppercase italic opacity-60">wish</span>
                            </span>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold opacity-40 uppercase">확정 지출 (주요 비용)</span>
                            <span className="text-sm font-black text-white">{currencySymbol} {formatAmount(totalConfirmed)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold opacity-40 uppercase">위시리스트 (개인 구매 예정)</span>
                            <span className="text-sm font-black text-emerald-400">{currencySymbol} {formatAmount(totalPlanned)}</span>
                        </div>
                        {!isSoloTrip && (
                            <>
                                <div className="w-[1px] h-8 bg-white/10 hidden md:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold opacity-40 uppercase">공동 지출 합계</span>
                                    <span className="text-sm font-black">{currencySymbol} {formatAmount(totalCommonSpent)}</span>
                                </div>
                                <div className="hidden lg:flex flex-col min-w-[120px]">
                                    <span className="text-[10px] font-bold opacity-40 uppercase">예산 소진율</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary" 
                                                style={{ width: `${Math.min(100, (totalConfirmed / ((trip.budget?.commonAllocated || 0) + (trip.budget?.individualAllocated || 0) * (trip.participants?.length || 1))) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black">{Math.round((totalConfirmed / ((trip.budget?.commonAllocated || 0) + (trip.budget?.individualAllocated || 0) * (trip.participants?.length || 1))) * 100)}%</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[200px]">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold opacity-60">기본 통화 잔액</span>
                            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/20 rounded-md">SUMMARY</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    {CURRENCY_OPTIONS.find(o => o.value === (trip.budget?.baseCurrency || 'KRW'))?.label || 'KRW'} 합계
                                </span>
                                <span className="font-black text-sm">{currencySymbol} {formatAmount(totalConfirmed)}</span>
                            </div>
                            {(trip.budget?.activeCurrencies || []).map(curr => {
                                const opt = CURRENCY_OPTIONS.find(o => o.value === curr.code);
                                return (
                                    <div key={curr.code} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">
                                            {opt?.label || curr.code} 기준
                                        </span>
                                        <span className="font-black text-sm">
                                            {opt?.value === 'KRW' ? '₩' : curr.symbol} {formatAmount(aggregatedExpenses.filter(e => e.currency === curr.code && e.status === 'confirmed').reduce((sum, e) => sum + (e.amount || 0), 0))}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

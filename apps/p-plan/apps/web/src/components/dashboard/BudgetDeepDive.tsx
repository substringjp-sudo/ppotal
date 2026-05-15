'use client';

import React, { useMemo } from 'react';
import { useTripStore } from '@pplaner/shared';
import { TripState } from '@pplaner/shared';
import { 
    calculateAggregatedBudget 
} from '@pplaner/shared';
import { 
    getCurrencySymbol, 
    inferCurrencyFromRegions,
    calculateRecommendedExchangeDate
} from '@pplaner/shared';
import { useExchangeRateStore } from '@pplaner/shared';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function BudgetDeepDive() {
    const trip = useTripStore((state: TripState) => state.currentTrip);
    const router = useRouter();
    const getRate = useExchangeRateStore((state) => state.getRate);

    const aggregatedBudget = useMemo(() => {
        if (!trip) return null;
        return calculateAggregatedBudget(trip);
    }, [trip]);

    const targetCurrency = useMemo(() => {
        if (!trip) return 'USD';
        if (trip.budget?.targetCurrency) return trip.budget.targetCurrency;
        return inferCurrencyFromRegions(trip.locations?.regions || []);
    }, [trip]);

    const exchangeRate = useMemo(() => {
        if (trip?.budget?.exchangeRate) return trip.budget.exchangeRate;
        return getRate(targetCurrency);
    }, [trip, targetCurrency, getRate]);

    const recommendedDate = useMemo(() => {
        if (!trip?.dates.startDate) return '여행 날짜를 먼저 설정해주세요';
        return calculateRecommendedExchangeDate(trip.dates.startDate);
    }, [trip?.dates.startDate]);

    const paymentMethods = useMemo(() => {
        if (!aggregatedBudget) return [];
        // Statistical distribution of spending by payment method
        return Object.entries(aggregatedBudget.byPaymentMethod)
            .filter(([_, amount]) => (amount as number) > 0)
            .map(([method, amount]) => ({
                label: method === 'cash' ? '현금' : 
                       method === 'credit_card' ? '신용카드' : 
                       method === 'prepaid_card' ? '선불카드 (트래블)' : '기타',
                amount: amount as number,
                percentage: Math.round(((amount as number) / Math.max(aggregatedBudget.spent, 1)) * 100),
                color: method === 'cash' ? 'bg-amber-400 shadow-amber-400/20' : 
                       method === 'credit_card' ? 'bg-rose-400 shadow-rose-400/20' : 
                       method === 'prepaid_card' ? 'bg-blue-400 shadow-blue-400/20' : 'bg-slate-400',
                icon: method === 'cash' ? 'payments' : 
                      method === 'credit_card' ? 'credit_card' : 
                      method === 'prepaid_card' ? 'account_balance_wallet' : 'more_horiz'
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [aggregatedBudget]);

    if (!trip || !aggregatedBudget) return (
        <div className="flex flex-col gap-4 p-1 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                <div className="h-64 bg-slate-800 rounded-3xl opacity-30" />
                <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
            </div>
            <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
    );

    const targetSymbol = getCurrencySymbol(targetCurrency);

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                {/* Budget Health Card */}
                <div 
                    className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">예산 및 지출 분석</h3>
                            <div className="text-2xl font-black italic">Payment Analysis</div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-rounded">analytics</span>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="space-y-4">
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map((method) => (
                                    <div key={method.label} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-rounded text-xs ${method.color.split(' ')[0].replace('bg-', 'text-')}`}>{method.icon}</span>
                                                <span className="text-slate-500">{method.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">{method.percentage}%</span>
                                                <span className="text-slate-900 dark:text-white font-black tracking-tight">₩{method.amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${method.percentage}%` }}
                                                className={`h-full ${method.color}`}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <span className="material-symbols-rounded text-4xl opacity-20">payments</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">지출 내역이 없습니다</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">실제 사용 금액 (확정)</span>
                                <span className="text-base font-black italic">₩{aggregatedBudget.spent.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">전체 예정 금액 (예정 포함)</span>
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 italic">₩{(aggregatedBudget.spent + aggregatedBudget.planned).toLocaleString()}</span>
                            </div>
                            
                            <div className="space-y-1.5">
                                {aggregatedBudget.total > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사용률</span>
                                        <span className="text-[10px] font-black italic">{(aggregatedBudget.spent / Math.max(aggregatedBudget.total, 1) * 100).toFixed(1)}%</span>
                                    </div>
                                )}
                                {aggregatedBudget.total > 0 ? (
                                    <>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                            {/* Total Expected Progress (Background shade) */}
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, ((aggregatedBudget.spent + aggregatedBudget.planned) / Math.max(aggregatedBudget.total, 1)) * 100)}%` }}
                                                className="absolute inset-0 bg-slate-200 dark:bg-slate-700 opacity-50"
                                            />
                                            {/* Actual Spent Progress (Solid) */}
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (aggregatedBudget.spent / Math.max(aggregatedBudget.total, 1)) * 100)}%` }}
                                                className="absolute h-full bg-slate-900 dark:bg-white z-10"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            <span>집행됨</span>
                                            <span>남은 예산 {(aggregatedBudget.total - (aggregatedBudget.spent + aggregatedBudget.planned)).toLocaleString()}원</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-10 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">예산 미정</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance (Assets) Card - Premium View */}
                <div 
                    className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden text-white flex flex-col"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-20 -mt-20 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full -ml-10 -mb-10 opacity-30" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">지갑 잔액</h3>
                                <div className="text-3xl font-black italic tracking-tight">My Assets</div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center border border-white/10 shadow-lg">
                                <span className="material-symbols-rounded text-2xl">account_balance_wallet</span>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide py-2">
                            {/* KRW (Cash) */}
                            <div className="flex items-center justify-between group p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-3xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg shadow-xl border border-white/5">₩</div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white/80">현금 (KRW)</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">Domestic</span>
                                    </div>
                                </div>
                                <span className="text-base font-black tracking-tighter">{aggregatedBudget.balances.cash['KRW']?.toLocaleString() || 0} 원</span>
                            </div>

                            {/* Foreign Currencies */}
                            {Object.entries(aggregatedBudget.balances.cash).map(([code, amount]) => (
                                code !== 'KRW' && (
                                    <div key={`cash-${code}`} className="flex items-center justify-between group p-4 bg-amber-500/5 hover:bg-amber-500/10 transition-colors rounded-3xl border border-amber-500/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs uppercase shadow-xl border border-amber-500/20">{code}</div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white/80">현금 ({code})</span>
                                                <span className="text-[9px] font-black text-amber-500/40 uppercase tracking-[0.15em]">Foreign Cash</span>
                                            </div>
                                        </div>
                                        <span className="text-base font-black tracking-tighter">{getCurrencySymbol(code)} {(amount as number).toLocaleString()}</span>
                                    </div>
                                )
                            ))}

                            {/* Prepaid Cards */}
                            {Object.entries(aggregatedBudget.balances.prepaid).map(([code, amount]) => (
                                <div key={`prepaid-${code}`} className="flex items-center justify-between group p-4 bg-blue-500/5 hover:bg-blue-500/10 transition-colors rounded-3xl border border-blue-500/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-xl border border-blue-500/20">
                                            <span className="material-symbols-rounded">credit_card</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-blue-400">트래블 카드 ({code})</span>
                                            <span className="text-[9px] font-black text-blue-500/40 uppercase tracking-[0.15em]">Prepaid Balance</span>
                                        </div>
                                    </div>
                                    <span className="text-base font-black text-blue-400 tracking-tighter">{getCurrencySymbol(code)} {(amount as number).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center bg-white/5 -mx-6 -mb-6 px-8 py-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">신용카드 결제 예정</span>
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.1em]">Credit Liability</span>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-rose-400 tracking-tighter italic">₩{aggregatedBudget.balances.creditCardTotal.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exchange & Insight Card */}
                <div 
                    className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">환율 및 인사이트</h3>
                            <div className="text-2xl font-black italic">Insights</div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <span className="material-symbols-rounded">lightbulb</span>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1 truncate">기준 (KRW)</div>
                                <div className="text-lg md:text-xl font-black italic tracking-tighter truncate">₩1,000</div>
                            </div>
                            <div className="w-10 h-10 shrink-0 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 shadow-sm">
                                <span className="material-symbols-rounded text-sm">compare_arrows</span>
                            </div>
                            <div className="flex-1 text-center min-w-0">
                                <div className="text-[9px] font-black text-primary uppercase mb-1 truncate">대상 ({targetCurrency})</div>
                                <div className="text-lg md:text-xl font-black italic tracking-tighter text-primary truncate">
                                    {targetSymbol}{(1000 / exchangeRate).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-rounded text-5xl text-emerald-600">currency_exchange</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-rounded text-xs text-emerald-600">event_upcoming</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">추천 환전일</span>
                            </div>
                            <div className="text-2xl font-black text-emerald-600 tracking-tight mb-1">{recommendedDate}</div>
                            <p className="text-[9px] font-bold text-emerald-600/60 leading-tight">준비 일정을 반영한 추천일입니다.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 italic flex-1 flex items-center justify-center mt-auto">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold text-center px-4 leading-relaxed tracking-tight">
                                {aggregatedBudget.balances.creditCardTotal > (aggregatedBudget.total * 0.4) 
                                    ? "💡 현재 신용카드 결제 비중이 높습니다. 현지에서의 현금/선불카드 사용 비중을 늘려 수수료를 절약해보세요."
                                    : aggregatedBudget.total - aggregatedBudget.spent < (aggregatedBudget.total * 0.2)
                                    ? "⚠️ 예산의 80% 이상을 소진했습니다. 남은 일정의 지출 계획을 다시 한번 점검해주세요!"
                                    : "💡 지갑 잔액이 충분히 환전되어 있습니다. 계획적인 지출로 성공적인 여행을 준비하세요!"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/edit-trip/${trip.id}?tab=budget`)}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black italic text-lg shadow-2xl shadow-slate-900/10 flex items-center justify-center gap-3"
            >
                GO TO BUDGET EDITOR
                <span className="material-symbols-rounded">east</span>
            </motion.button>
        </div>
    );
}

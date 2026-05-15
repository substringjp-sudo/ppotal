import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trip, Participant, calculateSettlement, cn } from '@pplaner/shared';

interface SettlementViewProps {
    trip: Trip;
    getRate: (code: string) => number;
    formatAmount: (amount: number) => string;
    currencySymbol: string;
}

export function SettlementView({ trip, getRate, formatAmount, currencySymbol }: SettlementViewProps) {
    const { summary, transfers } = useMemo(() => {
        return calculateSettlement(
            trip.participants || [],
            trip.budget?.expenses || [],
            trip.budget?.baseCurrency || 'KRW',
            getRate
        );
    }, [trip, getRate]);

    const totalSharedExpense = useMemo(() => {
        return summary.reduce((sum, s) => sum + s.owed, 0);
    }, [summary]);

    const getParticipantName = (id: string) => {
        return trip.participants?.find(p => p.id === id)?.name || '알 수 없음';
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">총 공동 지출액</span>
                        <div className="text-3xl font-black mb-1">
                            {currencySymbol} {formatAmount(totalSharedExpense)}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                            * 제외 항목 및 위시리스트를 제외한 확정된 공동 지출 합계입니다.
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <span className="material-symbols-rounded text-6xl">account_balance_wallet</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1인당 평균 분담액</span>
                    <div className="text-3xl font-black text-primary mb-1">
                        {currencySymbol} {formatAmount(Math.round(totalSharedExpense / (trip.participants?.length || 1)))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">
                        * 총 인원 {trip.participants?.length}명 기준 (N/1 단순 평균치)
                    </p>
                </div>
            </div>

            {/* Transfer Guide */}
            {transfers.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="text-sm font-black flex items-center gap-2 ml-2">
                        <span className="material-symbols-rounded text-primary">send_money</span>
                        최적 송금 가이드
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {transfers.map((t, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={`${t.from}-${t.to}-${idx}`}
                                className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">{getParticipantName(t.from).charAt(0)}</div>
                                        <span className="text-[10px] font-black mt-1">{getParticipantName(t.from)}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-4">
                                        <span className="material-symbols-rounded text-emerald-500 text-xl">arrow_forward</span>
                                        <span className="text-[8px] font-black text-emerald-500/60 uppercase">송금</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">{getParticipantName(t.to).charAt(0)}</div>
                                        <span className="text-[10px] font-black mt-1">{getParticipantName(t.to)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-emerald-600">{currencySymbol} {formatAmount(t.amount)}</div>
                                    <span className="text-[9px] font-bold text-slate-400">보내면 정산 완료!</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">done_all</span>
                    <p className="text-sm font-black text-slate-400">송금할 내역이 없습니다. 정산이 완료되었습니다!</p>
                </div>
            )}

            {/* Detailed Table */}
            <div className="space-y-4">
                <h3 className="text-sm font-black flex items-center gap-2 ml-2">
                    <span className="material-symbols-rounded text-slate-400">list_alt</span>
                    멤버별 정산 상세 내역
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">멤버</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">총 결제액</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">내 분담액</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">정산 결과</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {summary.map((s) => (
                                <tr key={s.participantId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black">{getParticipantName(s.participantId).charAt(0)}</div>
                                            <span className="text-xs font-black">{getParticipantName(s.participantId)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{currencySymbol} {formatAmount(s.paid)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{currencySymbol} {formatAmount(s.owed)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={cn(
                                            "inline-flex flex-col items-end px-3 py-1.5 rounded-xl",
                                            s.balance > 0 ? "bg-emerald-500/10" : s.balance < 0 ? "bg-rose-500/10" : "bg-slate-100"
                                        )}>
                                            <span className={cn(
                                                "text-xs font-black",
                                                s.balance > 0 ? "text-emerald-600" : s.balance < 0 ? "text-rose-600" : "text-slate-400"
                                            )}>
                                                {s.balance > 0 ? '+' : ''}{formatAmount(s.balance)}
                                            </span>
                                            <span className="text-[8px] font-black uppercase opacity-60">
                                                {s.balance > 0 ? '받을 돈' : s.balance < 0 ? '보낼 돈' : '완료'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

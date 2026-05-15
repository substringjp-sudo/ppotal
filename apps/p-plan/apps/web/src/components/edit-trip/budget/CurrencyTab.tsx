import React from 'react';
import { Trip, cn } from '@pplaner/shared';
import { CURRENCY_OPTIONS } from './BudgetConstants';

interface CurrencyTabProps {
    trip: Trip;
    availableCurrencyOptions: any[];
    addActiveCurrency: (currency: any) => void;
    removeActiveCurrency: (code: string) => void;
    updateActiveCurrency: (code: string, updates: any) => void;
    updateBudget: (updates: any) => void;
    formatAmount: (amount: number) => string;
}

export const CurrencyTab: React.FC<CurrencyTabProps> = ({
    trip,
    availableCurrencyOptions,
    addActiveCurrency,
    removeActiveCurrency,
    updateActiveCurrency,
    updateBudget,
    formatAmount
}) => {
    return (
        <div className="space-y-8">
            <div className="max-w-2xl">
                <h4 className="text-xs font-black text-slate-400 gap-2 flex items-center mb-4 uppercase tracking-[0.2em] ml-2">
                    기본 통화 설정 (Base Currency)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CURRENCY_OPTIONS.slice(0, 4).map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => updateBudget({ baseCurrency: opt.value })}
                            className={cn(
                                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                (trip.budget?.baseCurrency || 'KRW') === opt.value
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xl scale-[1.05]"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale hover:grayscale-0"
                            )}
                        >
                            <span className="material-symbols-rounded text-2xl">{opt.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{opt.value}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 gap-2 flex items-center mb-4 uppercase tracking-[0.2em] ml-2">
                    활성화된 외화 (Active Foreign Currencies)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(trip.budget?.activeCurrencies || []).map(curr => {
                        const opt = CURRENCY_OPTIONS.find(o => o.value === curr.code);
                        return (
                            <div key={curr.code} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                                            <span className="material-symbols-rounded text-2xl">{opt?.icon || 'payments'}</span>
                                        </div>
                                        <div>
                                            <h6 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{opt?.label?.split(' (')[0] || curr.code}</h6>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">심볼: {curr.symbol}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeActiveCurrency(curr.code)}
                                        className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <span className="material-symbols-rounded text-lg">close</span>
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">활성 환율 (Rate)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">1 {curr.code} =</span>
                                            <input 
                                                type="number"
                                                value={curr.rate}
                                                onChange={(e) => updateActiveCurrency(curr.code, { rate: Number(e.target.value) })}
                                                className="w-full pl-[52px] pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{trip.budget?.baseCurrency || 'KRW'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">통화 심볼 (Symbol)</label>
                                        <input 
                                            type="text"
                                            value={curr.symbol}
                                            onChange={(e) => updateActiveCurrency(curr.code, { symbol: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="min-h-[160px] bg-slate-50/50 dark:bg-slate-800/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] p-6 flex flex-col justify-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4 block">통화 추가하기</label>
                        <div className="flex flex-wrap gap-2">
                            {availableCurrencyOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => addActiveCurrency({
                                        code: opt.value,
                                        rate: 1, // Fallback, would normally fetch real rate or ask
                                        symbol: opt.label.split(') ')[1] || opt.value
                                    })}
                                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
                                >
                                    {opt.tag && (
                                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase", opt.tagColor)}>
                                            {opt.tag}
                                        </span>
                                    )}
                                    {opt.value}
                                    <span className="material-symbols-rounded text-base opacity-0 group-hover:opacity-100 transition-opacity">add</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

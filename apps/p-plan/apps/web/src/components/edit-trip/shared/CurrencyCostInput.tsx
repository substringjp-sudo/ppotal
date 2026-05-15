'use client';

import { useState, useEffect, useMemo } from 'react';
import { Banknote, ChevronDown, Info, Calculator, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pplaner/shared';
import { WORLD_CURRENCIES, getExchangeRate, convertCurrency, DEFAULT_EXCHANGE_RATES, inferCurrencyFromRegions } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared';

export { inferCurrencyFromRegions };

export interface CurrencyCostInputProps {
    value?: number;
    currency?: string;
    isUndecided?: boolean;
    onValueChange: (value: number) => void;
    onCurrencyChange: (currency: string) => void;
    onUndecidedChange?: (isUndecided: boolean) => void;
    label?: string;
    className?: string;
    showBudgetImpact?: boolean;
}

export function CurrencyCostInput({
    value = 0,
    currency = 'KRW',
    isUndecided = false,
    onValueChange,
    onCurrencyChange,
    onUndecidedChange,
    label,
    className,
    showBudgetImpact = true
}: CurrencyCostInputProps) {
    const { currentTrip: trip } = useTripStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Selected currency object
    const selectedCurrency = useMemo(() => 
        WORLD_CURRENCIES.find(c => c.code === currency) || WORLD_CURRENCIES[0]
    , [currency]);

    // Base currency (usually KRW)
    const baseCurrency = trip?.budget?.baseCurrency || 'KRW';
    
    // Converted value in base currency
    const convertedValue = useMemo(() => {
        if (isUndecided) return 0;
        return convertCurrency(value, currency, baseCurrency);
    }, [value, currency, baseCurrency, isUndecided]);

    // Budget impact calculation
    const budgetImpact = useMemo(() => {
        if (!trip?.budget?.totalAllocated || isUndecided) return null;
        const total = trip.budget.totalAllocated;
        const percentage = (convertedValue / total) * 100;
        return {
            percentage,
            isOver: false // Could check if total spent + this > totalAllocated if we had spent data here
        };
    }, [convertedValue, trip?.budget?.totalAllocated, isUndecided]);

    const formatAmount = (val: number, code: string) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: code,
            maximumFractionDigits: code === 'KRW' ? 0 : 2
        }).format(val);
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                {label && (
                    <label className="text-sm font-black text-slate-700 dark:text-slate-300 ml-1">
                        {label}
                    </label>
                )}
                {onUndecidedChange && (
                    <button
                        type="button"
                        onClick={() => onUndecidedChange(!isUndecided)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border-2",
                            isUndecided 
                                ? "bg-primary/10 border-primary text-primary font-black scale-105" 
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 font-bold hover:bg-slate-100"
                        )}
                    >
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isUndecided ? "bg-primary animate-pulse" : "bg-slate-300"
                        )} />
                        <span className="text-[10px] uppercase tracking-wider">비용 미정</span>
                    </button>
                )}
            </div>

            <div className={cn(
                "relative group transition-all duration-300",
                isUndecided && "opacity-50 pointer-events-none"
            )}>
                <div className="flex bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-primary shadow-sm hover:shadow-md transition-all">
                    {/* Currency Selector */}
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-4 bg-slate-50 dark:bg-slate-800/50 border-r-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="text-base font-black text-slate-700 dark:text-slate-200">
                            {selectedCurrency.symbol}
                        </span>
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                            {selectedCurrency.code}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Cost Input */}
                    <div className="flex-1 relative">
                        <input
                            type="number"
                            value={isUndecided ? '' : value || ''}
                            onChange={(e) => onValueChange(Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-5 py-4 bg-transparent outline-none text-lg font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <Banknote className="w-5 h-5 text-slate-200 group-focus-within:text-primary/30 transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Currency Dropdown */}
                <AnimatePresence>
                    {isDropdownOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-[140]" 
                                onClick={() => setIsDropdownOpen(false)} 
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[150] overflow-hidden"
                            >
                                <div className="p-2 max-h-[300px] overflow-y-auto">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">
                                        추천/주요 통화
                                    </p>
                                    {WORLD_CURRENCIES.map((c) => (
                                        <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => {
                                                onCurrencyChange(c.code);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors",
                                                currency === c.code 
                                                    ? "bg-primary/10 text-primary font-black" 
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 text-center">{c.symbol}</span>
                                                <div className="text-left">
                                                    <div className="text-xs">{c.code}</div>
                                                    <div className="text-[10px] opacity-60 font-medium">{c.name}</div>
                                                </div>
                                            </div>
                                            {currency === c.code && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Conversion Result & Budget Impact */}
            <AnimatePresence>
                {!isUndecided && (value > 0 || currency !== baseCurrency) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                        {/* Converted Value */}
                        <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <Calculator className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                    환산 금액 ({baseCurrency})
                                </p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {formatAmount(convertedValue, baseCurrency)}
                                </p>
                            </div>
                        </div>

                        {/* Budget Impact */}
                        {showBudgetImpact && budgetImpact && (
                            <div className="flex items-center gap-3 p-3.5 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 dark:border-primary/20">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-primary/10">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-primary/60 dark:text-primary/50 uppercase tracking-tight">
                                        예산 대비 비율
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-black text-primary">
                                            {budgetImpact.percentage.toFixed(1)}% 차지
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useTripStore,
    useExchangeRateStore,
    estimateTripBudget,
    getExchangeRate,
    getCurrencySymbol,
    inferCurrencyFromRegions,
    type DailySpendLevel,
    type BudgetCategory,
    type BudgetExpense,
    cn,
} from '@pplaner/shared';

/**
 * Layer 2 — 실제 지출 기록 (여행 중/후).
 *
 * 무거운 상세 장부(상세 예산 disclosure)와 달리, 여행 중 지친 상태에서도 쓸 수 있는
 * 원탭 입력에 집중한다: 금액 + 카테고리만. 그리고 오늘 남은 예산 게이지와
 * 예상 대비 실제 진행을 가볍게 보여준다.
 */

const CATS: { key: BudgetCategory; label: string; icon: string }[] = [
    { key: 'food', label: '식비', icon: 'restaurant' },
    { key: 'transport', label: '교통', icon: 'directions_transit' },
    { key: 'shopping', label: '쇼핑', icon: 'shopping_bag' },
    { key: 'activity', label: '관광', icon: 'attractions' },
    { key: 'accommodation', label: '숙소', icon: 'hotel' },
    { key: 'other', label: '기타', icon: 'more_horiz' },
];

function formatKRWMan(amount: number): string {
    if (amount >= 10000) return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만`;
    return `${Math.round(amount).toLocaleString()}원`;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export default function BudgetActualCard({ level }: { level: DailySpendLevel }) {
    const trip = useTripStore((state) => state.currentTrip);
    const addExpense = useTripStore((state) => state.addExpense);
    const removeExpense = useTripStore((state) => state.removeExpense);
    const rates = useExchangeRateStore((state) => state.rates);

    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState<BudgetCategory>('food');

    // 정산 모드가 켜져 있으면 결제자를 지정할 수 있게 한다 (기본 = 기본 결제자/나).
    const settlementOn = !!trip?.settlement?.enabled;
    const participants = trip?.participants || [];
    const defaultPayer = trip?.settlement?.defaultPayerId || participants.find((p) => p.role === 'me')?.id || participants[0]?.id;
    const [payerId, setPayerId] = useState<string | undefined>(undefined);
    const effectivePayer = payerId ?? defaultPayer;

    const derived = useMemo(() => {
        if (!trip) return null;
        const est = estimateTripBudget(trip, level);
        const regions = trip.locations?.regions;
        const active = (trip.budget?.activeCurrencies || []).find((c) => c.code && c.code !== 'KRW');
        const spendCode = trip.isOverseas ? active?.code || inferCurrencyFromRegions(regions) || 'KRW' : 'KRW';
        const spendRate = spendCode === 'KRW' ? 1 : active?.rate || getExchangeRate(spendCode, rates);

        const toKRW = (e: BudgetExpense) => e.amount * (e.exchangeRate || getExchangeRate(e.currency || 'KRW', rates));
        const confirmed = (trip.budget?.expenses || []).filter((e) => e.status === 'confirmed' && !e.isExcluded);
        const today = todayStr();
        const todaySpent = confirmed.filter((e) => e.date === today).reduce((s, e) => s + toKRW(e), 0);
        const totalSpent = confirmed.reduce((s, e) => s + toKRW(e), 0);

        const dailyCap = est.dailyPerPerson * est.participants;

        // 카테고리별 실제 지출
        const byCat: Record<string, number> = {};
        confirmed.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + toKRW(e); });
        const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);

        // 최근 입력 (수동 지출 최신순)
        const recent = [...confirmed].reverse().slice(0, 4);

        return { est, spendCode, spendRate, todaySpent, totalSpent, dailyCap, topCats, recent };
    }, [trip, level, rates]);

    if (!trip || !derived) return null;

    const { est, spendCode, spendRate, todaySpent, totalSpent, dailyCap, topCats, recent } = derived;
    const symbol = getCurrencySymbol(spendCode);
    const dayPct = dailyCap > 0 ? Math.min(100, (todaySpent / dailyCap) * 100) : 0;
    const overDay = dailyCap > 0 && todaySpent > dailyCap;
    const estPct = est.total > 0 ? Math.round((totalSpent / est.total) * 100) : 0;
    const catLabel = (k: string) => CATS.find((c) => c.key === k)?.label || '기타';

    const submit = () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return;
        addExpense({
            title: catLabel(cat),
            amount: amt,
            currency: spendCode,
            category: cat,
            status: 'confirmed',
            paymentMethod: 'credit_card',
            paymentStatus: 'paid',
            date: todayStr(),
            exchangeRate: spendRate,
            ...(settlementOn && effectivePayer ? { payerId: effectivePayer } : {}),
        });
        setAmount('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        >
            <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* 원탭 입력 */}
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">지출 기록</p>
                    <div className="flex items-stretch gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">{symbol}</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                                placeholder="금액"
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-8 pr-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary tabular-nums"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-black shadow-sm transition enabled:hover:bg-primary/90 disabled:opacity-40"
                        >
                            추가
                        </button>
                    </div>
                    {settlementOn && participants.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">결제자</span>
                            <select
                                value={effectivePayer || ''}
                                onChange={(e) => setPayerId(e.target.value || undefined)}
                                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary"
                            >
                                {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {CATS.map((c) => {
                            const on = cat === c.key;
                            return (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => setCat(c.key)}
                                    aria-pressed={on}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-all',
                                        on
                                            ? 'bg-primary/10 border-primary/30 text-primary'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                                    )}
                                >
                                    <span className="material-symbols-rounded text-[15px]">{c.icon}</span>
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 오늘 남은 예산 게이지 */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-4 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">오늘 쓴 돈</span>
                        <span className={cn('text-xs font-black tabular-nums', overDay ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100')}>
                            {formatKRWMan(todaySpent)} <span className="text-slate-400 font-bold">/ {formatKRWMan(dailyCap)}</span>
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all', overDay ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-amber-400')}
                            style={{ width: `${dayPct}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                        {overDay
                            ? `오늘 예산보다 ${formatKRWMan(todaySpent - dailyCap)} 더 썼어요`
                            : `오늘 ${formatKRWMan(Math.max(0, dailyCap - todaySpent))} 남았어요`}
                    </p>
                </div>

                {/* 예상 대비 실제 + 카테고리 */}
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-3.5 py-3">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">지금까지 쓴 총액</p>
                            <p className="text-[10px] text-slate-400">예상 총액의 {estPct}%</p>
                        </div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">{formatKRWMan(totalSpent)}</span>
                    </div>
                    {topCats.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                            {topCats.map(([k, v]) => (
                                <span key={k} className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    {catLabel(k)} <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatKRWMan(v)}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 최근 입력 */}
                {recent.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">최근 입력</p>
                        <AnimatePresence initial={false}>
                            {recent.map((e) => (
                                <motion.div
                                    key={e.id}
                                    layout
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2"
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        {catLabel(e.category)}
                                        {e.date && <span className="ml-1.5 text-[10px] font-semibold text-slate-400">{e.date.slice(5)}</span>}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">
                                            {getCurrencySymbol(e.currency || 'KRW')}{e.amount.toLocaleString()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeExpense(e.id)}
                                            aria-label="삭제"
                                            className="text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-[16px]">close</span>
                                        </button>
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

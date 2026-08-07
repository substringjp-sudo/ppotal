'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    useTripStore,
    useExchangeRateStore,
    estimateTripBudget,
    getExchangeRate,
    getCurrencySymbol,
    inferCurrencyFromRegions,
    type DailySpendLevel,
    cn,
} from '@pplaner/shared';

/**
 * Layer 1 — 현금 / 결제 배분.
 *
 * 한국 여행자가 실제로 제일 신경 쓰는 질문("환전·충전 얼마 하지?")에 답한다.
 * Layer 0의 현지 지출 추정을 받아, 현금·트래블카드·신용카드로 어떻게 나눌지
 * 권장 배분을 제시하고, 현금+선불카드 몫을 목적지 통화로 환산해 준비 금액을 준다.
 * 해외 여행(외화 통화가 잡히는 경우)에만 표시된다.
 */

interface SplitPreset {
    id: string;
    label: string;
    hint: string;
    cash: number;    // 현금 %
    prepaid: number; // 트래블/선불카드 %
    credit: number;  // 신용카드 %
}

const PRESETS: SplitPreset[] = [
    { id: 'balanced', label: '균형', hint: '무난한 기본 배분', cash: 30, prepaid: 45, credit: 25 },
    { id: 'cash', label: '현금 위주', hint: '현금 결제 많은 곳(일본 등)', cash: 50, prepaid: 30, credit: 20 },
    { id: 'card', label: '카드 위주', hint: '카드 잘 되는 곳(유럽·미국 등)', cash: 15, prepaid: 45, credit: 40 },
];

/** 외화 금액을 "깔끔한" 단위로 반올림 */
function roundNice(n: number): number {
    if (n >= 10000) return Math.round(n / 1000) * 1000;
    if (n >= 1000) return Math.round(n / 100) * 100;
    if (n >= 100) return Math.round(n / 10) * 10;
    return Math.round(n);
}

function formatKRWMan(amount: number): string {
    if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString()}만`;
    return `${Math.round(amount).toLocaleString()}원`;
}

export default function BudgetCashPlanCard({ level }: { level: DailySpendLevel }) {
    const trip = useTripStore((state) => state.currentTrip);
    const rates = useExchangeRateStore((state) => state.rates);
    const [presetId, setPresetId] = useState('balanced');

    const data = useMemo(() => {
        if (!trip) return null;
        const est = estimateTripBudget(trip, level);

        // 목적지 통화 해석: 예산에 잡힌 외화 우선, 없으면 지역 기반 추론
        const active = (trip.budget?.activeCurrencies || []).find((c) => c.code && c.code !== 'KRW');
        const code = active?.code || inferCurrencyFromRegions(trip.locations?.regions);
        if (!code || code === 'KRW') return null;

        const rate = active?.rate || getExchangeRate(code, rates); // 1 외화 = ? KRW
        return { est, code, rate };
    }, [trip, level, rates]);

    if (!trip || !data || !trip.isOverseas) return null;

    const { est, code, rate } = data;
    const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    const symbol = getCurrencySymbol(code);

    const local = est.localEstimate;
    const cashKRW = (local * preset.cash) / 100;
    const prepaidKRW = (local * preset.prepaid) / 100;
    const creditKRW = (local * preset.credit) / 100;

    // 현금 + 선불카드 = 미리 외화로 준비할 몫
    const prepareKRW = cashKRW + prepaidKRW;
    const prepareForeign = roundNice(prepareKRW / rate);

    // 환율 표기: 소액 단위 통화(엔·동 등)는 100단위로 보여주는 게 직관적
    const perUnit = rate >= 100 ? 1 : 100;
    const perUnitKRW = Math.round(rate * perUnit);

    const bars = [
        { key: 'cash', label: '현금', krw: cashKRW, color: 'var(--good, #0e8f63)', cls: 'bg-emerald-500' },
        { key: 'prepaid', label: '트래블·선불', krw: prepaidKRW, color: '', cls: 'bg-primary' },
        { key: 'credit', label: '신용', krw: creditKRW, color: '', cls: 'bg-amber-500' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        >
            <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* 헤드라인: 환전·충전 권장 외화 */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        환전·충전 권장 <span className="text-slate-300">(현금 + 선불카드 몫)</span>
                    </p>
                    <div className="flex items-end gap-1.5">
                        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                            약 {symbol}{prepareForeign.toLocaleString()}
                        </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        현지 지출 추정 <span className="tabular-nums">~{formatKRWMan(local)}</span> 기준 · 신용카드 결제 몫은 따로 준비 안 해도 돼요
                    </p>
                </div>

                {/* 배분 막대 */}
                <div className="flex flex-col gap-2.5">
                    <div className="flex h-7 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                        {bars.map((b) => (
                            <div
                                key={b.key}
                                className={cn('grid place-items-center text-xs font-semibold text-white', b.cls)}
                                style={{ width: `${local > 0 ? (b.krw / local) * 100 : 0}%` }}
                                title={`${b.label} ${formatKRWMan(b.krw)}`}
                            >
                                {local > 0 && b.krw / local > 0.14 ? formatKRWMan(b.krw) : ''}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {bars.map((b) => (
                            <span key={b.key} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span className={cn('w-2.5 h-2.5 rounded-sm', b.cls)} />
                                {b.label} <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatKRWMan(b.krw)}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* 성향 프리셋 */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">결제 성향</p>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((p) => {
                            const on = presetId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPresetId(p.id)}
                                    aria-pressed={on}
                                    title={p.hint}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-all',
                                        on
                                            ? 'bg-primary border-primary text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40'
                                    )}
                                >
                                    <span className="text-xs font-semibold">{p.label}</span>
                                    <span className={cn('text-xs font-bold', on ? 'text-white/80' : 'text-slate-400')}>
                                        현금 {p.cash}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{preset.hint}</p>
                </div>

                {/* 환율 */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-3.5 py-2.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">오늘 환율</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                        {symbol}{perUnit.toLocaleString()} ≈ {perUnitKRW.toLocaleString()}원
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

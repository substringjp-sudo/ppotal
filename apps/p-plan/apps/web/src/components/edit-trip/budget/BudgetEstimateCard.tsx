'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    useTripStore,
    estimateTripBudget,
    DAILY_SPEND_LEVELS,
    type DailySpendLevel,
    cn,
} from '@pplaner/shared';

/**
 * Layer 0 — 여행 예산 "예상 카드".
 *
 * 예산의 1차 목적(이 여행 대충 얼마짜리인지 + 감당 가능한지)만 답한다.
 * 손입력 없이: 이미 입력한 비용(고정비) + 하루 지출 프리셋(현지 추정)으로 총액 감을 준다.
 * 무관심·솔로·커플 페르소나는 이 카드 하나로 끝이다.
 */

const LEVEL_ORDER: DailySpendLevel[] = ['backpack', 'normal', 'comfort'];

/** KRW 금액을 "만원" 단위 감으로 표기 (135만, 8천, 5,000원) */
function toMan(amount: number): { value: string; unit: string } {
    if (amount >= 10000) {
        return { value: Math.round(amount / 10000).toLocaleString(), unit: '만원' };
    }
    return { value: Math.round(amount).toLocaleString(), unit: '원' };
}

interface BudgetEstimateCardProps {
    level: DailySpendLevel;
    onLevelChange: (level: DailySpendLevel) => void;
}

export default function BudgetEstimateCard({ level, onLevelChange }: BudgetEstimateCardProps) {
    const trip = useTripStore((state) => state.currentTrip);

    const est = useMemo(() => (trip ? estimateTripBudget(trip, level) : null), [trip, level]);
    if (!trip || !est) return null;

    const total = toMan(est.total);
    const fixed = toMan(est.fixedTotal);
    const local = toMan(est.localEstimate);
    const isGroup = est.participants > 1;

    // 목표 예산이 설정돼 있을 때만 감당 여부 판단 (없으면 조용히 생략)
    let verdict: { label: string; cls: string } | null = null;
    if (est.allocated > 0) {
        const ratio = est.total / est.allocated;
        if (ratio <= 0.85) verdict = { label: '예산 대비 여유 있어요 👍', cls: 'text-emerald-600 dark:text-emerald-400' };
        else if (ratio <= 1.05) verdict = { label: '예산에 거의 맞아요', cls: 'text-amber-600 dark:text-amber-400' };
        else verdict = { label: `목표 예산 초과 (약 ${toMan(est.total - est.allocated).value}${toMan(est.total - est.allocated).unit})`, cls: 'text-rose-600 dark:text-rose-400' };
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        >
            <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* 총액 */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">예상 총액</p>
                    <div className="flex items-end gap-1.5">
                        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                            ~{total.value}
                        </span>
                        <span className="text-lg font-semibold text-slate-400 mb-1">{total.unit}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {est.days}일 · {est.participants}인
                        {isGroup && (
                            <> · 1인 ~<span className="tabular-nums">{toMan(est.perPerson).value}</span>{toMan(est.perPerson).unit}</>
                        )}
                        {verdict && <> · <span className={cn('font-bold', verdict.cls)}>{verdict.label}</span></>}
                    </p>
                </div>

                {/* 고정비 / 현지 추정 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-3.5 py-3">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">고정비</p>
                            <p className="text-xs text-slate-400">항공·숙소·교통·예약 입력분</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                            {est.fixedTotal > 0 ? `~${fixed.value}${fixed.unit}` : '0원'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-3.5 py-3">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">현지 지출 추정</p>
                            <p className="text-xs text-slate-400">하루 {(est.dailyPerPerson / 10000)}만 × {est.days}일 × {est.participants}인</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">~{local.value}{local.unit}</span>
                    </div>
                </div>

                {/* 하루 지출 수준 프리셋 */}
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">현지에서 하루 얼마쯤?</p>
                    <div className="grid grid-cols-3 gap-2">
                        {LEVEL_ORDER.map((lv) => {
                            const info = DAILY_SPEND_LEVELS[lv];
                            const on = level === lv;
                            return (
                                <button
                                    key={lv}
                                    type="button"
                                    onClick={() => onLevelChange(lv)}
                                    aria-pressed={on}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-all',
                                        on
                                            ? 'bg-primary border-primary text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40'
                                    )}
                                >
                                    <span className="text-xs font-semibold">{info.label}</span>
                                    <span className={cn('text-xs font-bold tabular-nums', on ? 'text-white/80' : 'text-slate-400')}>
                                        하루 {info.perDay / 10000}만
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-400">
                    입력한 예약·비용은 자동으로 합산돼요. 현지 지출은 프리셋 기준 추정치이니, 정확한 관리가 필요하면 아래 상세 예산을 열어보세요.
                </p>
            </div>
        </motion.div>
    );
}

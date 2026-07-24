'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, type DailySpendLevel } from '@pplaner/shared';
import BudgetEstimateCard from './BudgetEstimateCard';
import BudgetCashPlanCard from './BudgetCashPlanCard';
import BudgetActualCard from './BudgetActualCard';
import BudgetEditor from '../BudgetEditor';

/**
 * 예산 섹션 구성 (컨셉 기준선의 층 구조 + 예상↔실제 축).
 *
 * [예상] 탭 — 여행 전 계획:
 *   - Layer 0: 예상 카드 (입력 없이 총액 감)
 *   - Layer 1: 현금·환전 배분 (해외 여행일 때)
 * [실제] 탭 — 여행 중/후:
 *   - Layer 2: 지출 기록 (원탭 입력 + 오늘 남은 예산 + 예상 대비)
 *   - 상세 예산·정산(지출 상세/공동예산/정산/환율)은 필요한 사람만 여는 disclosure (= Layer 3)
 *
 * 하루 지출 수준(level)은 Layer 0에서 고르지만 Layer 1의 외화 준비액과 Layer 2의
 * 하루 예산 게이지에도 영향을 주므로 여기서 소유하고 각 카드에 함께 내려준다.
 */

type Mode = 'plan' | 'actual';

export default function BudgetSection() {
    const [mode, setMode] = useState<Mode>('plan');
    const [detailOpen, setDetailOpen] = useState(false);
    const [level, setLevel] = useState<DailySpendLevel>('normal');

    return (
        <div className="space-y-5">
            {/* 예상 ↔ 실제 토글 */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-xs mx-auto">
                {([['plan', '예상', '계획'], ['actual', '실제', '기록·정산']] as const).map(([id, label, sub]) => {
                    const on = mode === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setMode(id)}
                            aria-pressed={on}
                            className={cn(
                                'flex-1 rounded-xl py-2 text-center transition-all',
                                on ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            )}
                        >
                            <span className={cn('text-sm font-black', on ? 'text-slate-900 dark:text-white' : '')}>{label}</span>
                            <span className={cn('ml-1 text-[10px] font-bold', on ? 'text-primary' : 'text-slate-400')}>{sub}</span>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {mode === 'plan' ? (
                    <motion.div
                        key="plan"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                    >
                        <BudgetEstimateCard level={level} onLevelChange={setLevel} />
                        <BudgetCashPlanCard level={level} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="actual"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                    >
                        <BudgetActualCard level={level} />

                        <button
                            type="button"
                            onClick={() => setDetailOpen((v) => !v)}
                            aria-expanded={detailOpen}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20 px-4 py-3 text-xs font-black text-slate-500 hover:border-primary/40 hover:text-primary transition-all"
                        >
                            <span className="material-symbols-rounded text-base">{detailOpen ? 'expand_less' : 'receipt_long'}</span>
                            {detailOpen ? '상세 예산 접기' : '상세 예산·정산 열기 (지출 상세 · 공동 예산 · 정산)'}
                        </button>

                        <AnimatePresence initial={false}>
                            {detailOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                >
                                    <BudgetEditor />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

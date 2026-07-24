'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DailySpendLevel } from '@pplaner/shared';
import BudgetEstimateCard from './BudgetEstimateCard';
import BudgetCashPlanCard from './BudgetCashPlanCard';
import BudgetEditor from '../BudgetEditor';

/**
 * 예산 섹션 구성 (컨셉 기준선의 층 구조).
 * - Layer 0: 예상 카드 — 전원이 보는 기본. 입력 없이 총액 감.
 * - Layer 1: 현금·환전 배분 — 해외 여행일 때. 현지 지출 추정을 현금/카드로 나눠 준비.
 * - 그 아래: 상세 예산·정산(지출/공동예산/정산/환율)은 필요한 사람만 여는 disclosure.
 *
 * 하루 지출 수준(level)은 Layer 0에서 고르지만 Layer 1의 외화 준비액에도 영향을 주므로
 * 여기서 소유하고 두 카드에 함께 내려준다.
 */
export default function BudgetSection() {
    const [detailOpen, setDetailOpen] = useState(false);
    const [level, setLevel] = useState<DailySpendLevel>('normal');

    return (
        <div className="space-y-5">
            <BudgetEstimateCard level={level} onLevelChange={setLevel} />
            <BudgetCashPlanCard level={level} />

            <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                aria-expanded={detailOpen}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20 px-4 py-3 text-xs font-black text-slate-500 hover:border-primary/40 hover:text-primary transition-all"
            >
                <span className="material-symbols-rounded text-base">{detailOpen ? 'expand_less' : 'receipt_long'}</span>
                {detailOpen ? '상세 예산 접기' : '상세 예산·정산 열기 (지출 기록 · 공동 예산 · 정산)'}
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
        </div>
    );
}

import { useTripStore } from './tripStore';
import { useShallow } from 'zustand/react/shallow';

import { calculateAggregatedBudget } from '../lib/budget-utils';

/**
 * 여행 예산 및 지출 관련 계산된 상태를 제공하는 커스텀 훅입니다.
 */
export const useTripBudgetSummary = () => {
    return useTripStore(
        useShallow((state) => {
            const trip = state.currentTrip;
            if (!trip) return null;

            const summary = calculateAggregatedBudget(trip);
            
            return {
                totalAllocated: summary.total,
                totalSpent: summary.spent,
                plannedSpent: summary.planned,
                remaining: summary.total - summary.spent,
                percentSpent: summary.total > 0 ? (summary.spent / summary.total) * 100 : 0,
                budgetStatus: summary.spent > summary.total ? 'exceeded' : 'within',
                balances: summary.balances,
                byCategory: summary.byCategory
            };
        })
    );
};

/**
 * 여행의 날짜 및 기간 관련 요약 정보를 제공하는 커스텀 훅입니다.
 */
export const useTripDateSummary = () => {
    return useTripStore(
        useShallow((state) => {
            const dates = state.currentTrip?.dates;
            if (!dates) return { isSet: false, durationDays: 0 };
            
            return {
                isSet: !!dates.startDate && !!dates.endDate,
                startDate: dates.startDate,
                endDate: dates.endDate,
                durationDays: dates.durationDays || 0,
                isUndecided: !!dates.isUndecided
            };
        })
    );
};

/**
 * 활성화된 경고 정보를 요약하여 제공하는 커스텀 훅입니다.
 */
export const useTripWarningSummary = () => {
    return useTripStore(
        useShallow((state) => {
            const warnings = state.currentTrip?.warnings || [];
            
            const counts = warnings.reduce(
                (acc, w) => {
                    acc[w.severity]++;
                    acc.total++;
                    return acc;
                },
                { critical: 0, warning: 0, info: 0, total: 0 }
            );

            return {
                allWarnings: warnings,
                ...counts,
                hasCritical: counts.critical > 0
            };
        })
    );
};

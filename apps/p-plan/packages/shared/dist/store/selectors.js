"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTripWarningSummary = exports.useTripDateSummary = exports.useTripBudgetSummary = void 0;
const tripStore_1 = require("./tripStore");
const shallow_1 = require("zustand/react/shallow");
const budget_utils_1 = require("../lib/budget-utils");
/**
 * 여행 예산 및 지출 관련 계산된 상태를 제공하는 커스텀 훅입니다.
 */
const useTripBudgetSummary = () => {
    return (0, tripStore_1.useTripStore)((0, shallow_1.useShallow)((state) => {
        const trip = state.currentTrip;
        if (!trip)
            return null;
        const summary = (0, budget_utils_1.calculateAggregatedBudget)(trip);
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
    }));
};
exports.useTripBudgetSummary = useTripBudgetSummary;
/**
 * 여행의 날짜 및 기간 관련 요약 정보를 제공하는 커스텀 훅입니다.
 */
const useTripDateSummary = () => {
    return (0, tripStore_1.useTripStore)((0, shallow_1.useShallow)((state) => {
        const dates = state.currentTrip?.dates;
        if (!dates)
            return { isSet: false, durationDays: 0 };
        return {
            isSet: !!dates.startDate && !!dates.endDate,
            startDate: dates.startDate,
            endDate: dates.endDate,
            durationDays: dates.durationDays || 0,
            isUndecided: !!dates.isUndecided
        };
    }));
};
exports.useTripDateSummary = useTripDateSummary;
/**
 * 활성화된 경고 정보를 요약하여 제공하는 커스텀 훅입니다.
 */
const useTripWarningSummary = () => {
    return (0, tripStore_1.useTripStore)((0, shallow_1.useShallow)((state) => {
        const warnings = state.currentTrip?.warnings || [];
        const counts = warnings.reduce((acc, w) => {
            acc[w.severity]++;
            acc.total++;
            return acc;
        }, { critical: 0, warning: 0, info: 0, total: 0 });
        return {
            allWarnings: warnings,
            ...counts,
            hasCritical: counts.critical > 0
        };
    }));
};
exports.useTripWarningSummary = useTripWarningSummary;

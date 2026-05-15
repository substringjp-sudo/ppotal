/**
 * 여행 예산 및 지출 관련 계산된 상태를 제공하는 커스텀 훅입니다.
 */
export declare const useTripBudgetSummary: () => {
    totalAllocated: number;
    totalSpent: number;
    plannedSpent: number;
    remaining: number;
    percentSpent: number;
    budgetStatus: string;
    balances: {
        cash: Record<string, number>;
        prepaid: Record<string, number>;
        creditCardTotal: number;
    };
    byCategory: Record<string, number>;
} | null;
/**
 * 여행의 날짜 및 기간 관련 요약 정보를 제공하는 커스텀 훅입니다.
 */
export declare const useTripDateSummary: () => {
    isSet: boolean;
    durationDays: number;
    startDate?: undefined;
    endDate?: undefined;
    isUndecided?: undefined;
} | {
    isSet: boolean;
    startDate: string;
    endDate: string;
    durationDays: number;
    isUndecided: boolean;
};
/**
 * 활성화된 경고 정보를 요약하여 제공하는 커스텀 훅입니다.
 */
export declare const useTripWarningSummary: () => {
    hasCritical: boolean;
    critical: number;
    warning: number;
    info: number;
    total: number;
    allWarnings: import("..").TripWarning[];
};

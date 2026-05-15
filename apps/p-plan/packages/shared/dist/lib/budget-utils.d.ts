import { Trip } from '../types/trip';
export interface AggregatedBudget {
    total: number;
    spent: number;
    planned: number;
    allocated: number;
    balances: {
        cash: Record<string, number>;
        prepaid: Record<string, number>;
        creditCardTotal: number;
    };
    exchanges: {
        totalKrwSpent: number;
        byCurrency: Record<string, number>;
    };
    byCategory: Record<string, number>;
    spentByCategory: Record<string, number>;
    plannedByCategory: Record<string, number>;
    byPaymentMethod: Record<string, number>;
    byPaymentStatus: Record<string, number>;
}
/**
 * 전역 지출 합계 및 자산 상태 계산
 */
export declare function calculateAggregatedBudget(trip: Trip): AggregatedBudget;

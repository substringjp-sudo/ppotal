import { BudgetExpense, Participant } from '../types/trip';
export interface SettlementResult {
    participantId: string;
    paid: number;
    owed: number;
    balance: number;
}
export interface Transfer {
    from: string;
    to: string;
    amount: number;
}
/**
 * 정산 금액 계산 로직
 */
export declare function calculateSettlement(participants: Participant[], expenses: BudgetExpense[], baseCurrency: string, getRate: (currency: string) => number): {
    summary: SettlementResult[];
    transfers: Transfer[];
};

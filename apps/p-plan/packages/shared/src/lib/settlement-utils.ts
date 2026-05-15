import { BudgetExpense, Participant } from '../types/trip';

export interface SettlementResult {
    participantId: string;
    paid: number;
    owed: number;
    balance: number; // paid - owed. (+) means should receive, (-) means should pay
}

export interface Transfer {
    from: string;
    to: string;
    amount: number;
}

/**
 * 정산 금액 계산 로직
 */
export function calculateSettlement(
    participants: Participant[],
    expenses: BudgetExpense[],
    baseCurrency: string,
    getRate: (currency: string) => number
): { summary: SettlementResult[], transfers: Transfer[] } {
    // 1. 각 인원별 정산 객체 초기화
    const results: Record<string, SettlementResult> = {};
    participants.forEach(p => {
        results[p.id] = {
            participantId: p.id,
            paid: 0,
            owed: 0,
            balance: 0
        };
    });

    // 2. 지출 내역 순회하며 합산
    expenses.forEach(expense => {
        if (expense.isExcluded || expense.status === 'planned') return;

        // 원화(Base Currency)로 환산된 금액 사용
        const rate = expense.exchangeRate || getRate(expense.currency || 'KRW');
        const amountInBase = (expense.amount || 0) * rate;

        // 결제자(Payer) 처리
        if (expense.payerId && results[expense.payerId]) {
            results[expense.payerId].paid += amountInBase;
        } else {
            // payerId가 없으면 '공금'으로 간주 (정산 대상에서 제외하거나 별도 처리 가능)
        }

        // 분담자(Split with) 처리
        const splitWith = expense.splitWithIds || participants.map(p => p.id);
        if (splitWith.length > 0) {
            const share = amountInBase / splitWith.length;
            splitWith.forEach(id => {
                if (results[id]) {
                    results[id].owed += share;
                }
            });
        }
    });

    // 3. Balance 계산
    const summary = Object.values(results).map(r => ({
        ...r,
        balance: Math.round(r.paid - r.owed) // 소수점 반올림
    }));

    // 4. 최적 송금 경로 산출 (Greedy Algorithm)
    const transfers: Transfer[] = [];
    const debtors = summary
        .filter(s => s.balance < 0)
        .sort((a, b) => a.balance - b.balance); // 가장 많이 낼 사람부터
    const creditors = summary
        .filter(s => s.balance > 0)
        .sort((a, b) => b.balance - a.balance); // 가장 많이 받을 사람부터

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
        
        const toPay = Math.abs(debtor.balance);
        const toReceive = creditor.balance;
        
        const amount = Math.min(toPay, toReceive);
        
        if (amount > 0) {
            transfers.push({
                from: debtor.participantId,
                to: creditor.participantId,
                amount: Math.round(amount)
            });
        }

        debtor.balance += amount;
        creditor.balance -= amount;

        if (Math.abs(debtor.balance) < 1) dIdx++;
        if (creditor.balance < 1) cIdx++;
    }

    return { summary, transfers };
}

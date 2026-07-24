import { BudgetExpense, Participant, Trip } from '../types/trip';
import { getExchangeRate } from './currency-utils';

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

/** 정산 대상 항목(모든 비용 소스를 KRW 기준으로 정규화한 것) */
export interface SettlementItem {
    id: string;
    label: string;
    amountBase: number;                 // KRW 환산 총액
    payerId?: string;                   // 결제자 (없으면 공금 — 정산 계산에서 paid 미반영)
    owedBy: Record<string, number>;     // 참가자별 부담액(KRW). 합 ≈ amountBase
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

// ─── 여행 단위 정산 (모든 비용 소스 + 결제자/분담/정확금액) ───────────────
//
// 항공·숙소·예약·렌터카·대중교통·수동지출을 한데 모아 KRW로 환산하고, 항목별
// 결제자(payerId)·분담(splitWithIds)·정확 분담액(splitExact, LV1)을 반영한다.
// 미지정 항목은 여행 정산 모드에 따라 기본값이 적용된다:
//   - 'even'(1/N): 결제자=defaultPayer, 분담=전원 균등
//   - 'individual'(각자): 결제자=defaultPayer, 분담=[결제자] (교차 채무 없음)

/** trip의 활성 통화/기본환율로 (통화코드 → 1단위당 KRW) 해석기를 만든다. */
export function makeTripRateResolver(trip: Trip): (code: string) => number {
    const base = trip.budget?.baseCurrency || 'KRW';
    const map: Record<string, number> = {};
    (trip.budget?.activeCurrencies || []).forEach((c) => { if (c.code) map[c.code] = c.rate; });
    return (code: string) => {
        if (!code || code === base) return 1;
        return map[code] || getExchangeRate(code);
    };
}

/** trip의 모든 비용 소스를 정산 항목으로 정규화한다. */
export function collectSettlementItems(trip: Trip, getRate: (code: string) => number): SettlementItem[] {
    const participants = trip.participants || [];
    const allIds = participants.map((p) => p.id);
    if (allIds.length === 0) return [];

    const mode = trip.settlement?.mode || 'even';
    const defaultPayer =
        trip.settlement?.defaultPayerId ||
        participants.find((p) => p.role === 'me')?.id ||
        allIds[0];

    const items: SettlementItem[] = [];

    const add = (
        id: string,
        label: string,
        cost: number | undefined,
        currency: string | undefined,
        explicitRate: number | undefined,
        payerId: string | undefined,
        splitWithIds: string[] | undefined,
        splitExact: Record<string, number> | undefined,
        personalId?: string,
    ) => {
        if (!cost || cost <= 0) return;
        const rate = explicitRate || getRate(currency || 'KRW') || 1;
        const amountBase = cost * rate;
        const payer = payerId ?? personalId ?? defaultPayer;
        const owedBy: Record<string, number> = {};

        if (splitExact && Object.keys(splitExact).length > 0) {
            // LV1: 멤버별 정확 분담액(해당 통화) → KRW 환산
            Object.entries(splitExact).forEach(([pid, amt]) => {
                if (allIds.includes(pid) && amt > 0) owedBy[pid] = (owedBy[pid] || 0) + amt * rate;
            });
        } else if (personalId && !splitWithIds) {
            // 개인 지출: 본인 전액 부담 (순 정산 0)
            owedBy[personalId] = amountBase;
        } else {
            const ids = (splitWithIds && splitWithIds.length
                ? splitWithIds
                : mode === 'individual'
                    ? [payer]
                    : allIds
            ).filter((x) => allIds.includes(x));
            if (ids.length === 0) return;
            const share = amountBase / ids.length;
            ids.forEach((pid) => { owedBy[pid] = (owedBy[pid] || 0) + share; });
        }

        items.push({ id, label, amountBase, payerId: payer, owedBy });
    };

    (trip.budget?.expenses || []).forEach((e) => {
        if (e.isExcluded || e.status !== 'confirmed') return;
        add(e.id, e.title || '지출', e.amount, e.currency, e.exchangeRate, e.payerId, e.splitWithIds, e.splitExact, e.participantId);
    });
    (trip.flights || []).forEach((f) => add(f.id, `항공 ${f.flightNumber || ''}`.trim(), f.cost, f.currency, undefined, f.payerId, f.splitWithIds, f.splitExact));
    (trip.accommodation || []).forEach((a) => add(a.id, a.name || '숙소', a.price, a.currency, undefined, a.payerId, a.splitWithIds, a.splitExact));
    (trip.reservations || []).forEach((r) => add(r.id, r.title || '예약', r.cost, r.currency, undefined, r.payerId, r.splitWithIds, r.splitExact));
    (trip.driving || []).forEach((d) => add(d.id, d.isRental ? '렌터카' : '차량', d.cost, d.currency, undefined, d.payerId, d.splitWithIds, d.splitExact));
    (trip.publicTransport || []).forEach((p) => add(p.id, p.name || '대중교통', p.cost, p.currency, undefined, p.payerId, p.splitWithIds, p.splitExact));

    return items;
}

/** 최소 송금 경로 (그리디). 송금액은 100원 단위로 반올림. */
function minimizeTransfers(summary: SettlementResult[]): Transfer[] {
    const transfers: Transfer[] = [];
    const debtors = summary.filter((s) => s.balance < 0).map((s) => ({ ...s })).sort((a, b) => a.balance - b.balance);
    const creditors = summary.filter((s) => s.balance > 0).map((s) => ({ ...s })).sort((a, b) => b.balance - a.balance);
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(Math.abs(debtors[d].balance), creditors[c].balance);
        if (amount > 0) {
            transfers.push({ from: debtors[d].participantId, to: creditors[c].participantId, amount: Math.round(amount / 100) * 100 });
        }
        debtors[d].balance += amount;
        creditors[c].balance -= amount;
        if (Math.abs(debtors[d].balance) < 1) d++;
        if (creditors[c].balance < 1) c++;
    }
    return transfers.filter((t) => t.amount > 0);
}

/** 여행 전체 정산 결과(모든 소스 반영). */
export function calculateTripSettlement(
    trip: Trip,
    getRate: (code: string) => number,
): { summary: SettlementResult[]; transfers: Transfer[]; totalShared: number; items: SettlementItem[] } {
    const participants = trip.participants || [];
    const items = collectSettlementItems(trip, getRate);

    const results: Record<string, SettlementResult> = {};
    participants.forEach((p) => { results[p.id] = { participantId: p.id, paid: 0, owed: 0, balance: 0 }; });

    let totalShared = 0;
    items.forEach((it) => {
        if (it.payerId && results[it.payerId]) results[it.payerId].paid += it.amountBase;
        Object.entries(it.owedBy).forEach(([pid, amt]) => { if (results[pid]) results[pid].owed += amt; });
        totalShared += it.amountBase;
    });

    const summary = Object.values(results).map((r) => ({
        participantId: r.participantId,
        paid: Math.round(r.paid),
        owed: Math.round(r.owed),
        balance: Math.round(r.paid - r.owed),
    }));

    return { summary, transfers: minimizeTransfers(summary), totalShared: Math.round(totalShared), items };
}

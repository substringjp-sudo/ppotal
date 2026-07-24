import { Trip, BudgetExpense } from '../types/trip';

import { PaymentMethod, PaymentStatus } from '../types/trip';

// 일정 이벤트의 대분류(MainCategory)를 예산 카테고리(BudgetCategory)로 매핑
const EVENT_CATEGORY_TO_BUDGET: Record<string, string> = {
    meal: 'food',
    shopping: 'shopping',
    transport: 'transport',
    accommodation: 'accommodation',
    sightseeing: 'activity',
    reservation: 'activity',
    people: 'other',
    other: 'other',
};

export interface AggregatedBudget {
    total: number;               // 총 할당 예산 (KRW)
    spent: number;               // 총 지출 (KRW)
    planned: number;             // 총 계획 (KRW)
    allocated: number;           // 총 할당 (KRW)
    
    // 지갑 현황
    balances: {
        cash: Record<string, number>;    // 통화별 현금 잔액
        prepaid: Record<string, number>; // 통화별 충전카드 잔액
        creditCardTotal: number;         // 신용카드 결제 예정 총액 (KRW)
    };
    
    // 환전 현황
    exchanges: {
        totalKrwSpent: number;           // 환전에 투입된 총 KRW
        byCurrency: Record<string, number>; // 통화별 총 환전액
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
export function calculateAggregatedBudget(trip: Trip): AggregatedBudget {
    const budget = trip.budget || {
        baseCurrency: 'KRW',
        expenses: [],
        activeCurrencies: [],
        exchanges: [],
        commonAllocated: 0,
        individualAllocated: 0
    };
    const baseCurrency = budget.baseCurrency || 'KRW';
    
    // 환율 맵 구성 (통화 -> KRW)
    const rates: Record<string, number> = {};
    rates[baseCurrency] = 1;
    budget.activeCurrencies?.forEach(c => {
        rates[c.code] = c.rate;
    });
    // 하위 호환성용
    if (budget.targetCurrency && budget.exchangeRate) {
        rates[budget.targetCurrency] = budget.exchangeRate;
    }

    // 1. 환전/충전 총합 계산
    const totalExchanged: Record<string, { cash: number; prepaid: number; krw: number }> = {};
    budget.exchanges?.forEach(ex => {
        if (!totalExchanged[ex.currencyCode]) {
            totalExchanged[ex.currencyCode] = { cash: 0, prepaid: 0, krw: 0 };
        }
        if (ex.method === 'cash') totalExchanged[ex.currencyCode].cash += ex.amount;
        if (ex.method === 'prepaid_card') totalExchanged[ex.currencyCode].prepaid += ex.amount;
        totalExchanged[ex.currencyCode].krw += ex.krwAmount;
    });

    const items: { 
        amount: number; 
        currency: string; 
        method: PaymentMethod; 
        status: PaymentStatus; 
        category: string;
        krwAmount: number;
    }[] = [];

    // 헬퍼: KRW 환산 금액 계산
    const getKrw = (amount: number, currency: string, rate?: number) => {
        const r = rate || rates[currency] || 1;
        return amount * r;
    };

    // 2. 각 소스별 지출 수집
    // 항공편 (기본 KRW)
    trip.flights?.forEach(f => {
        if (f.cost) {
            items.push({ 
                amount: f.cost, 
                currency: baseCurrency, 
                method: f.isBooked ? 'credit_card' : 'cash', // 임시 할당
                status: f.isBooked ? 'pre_paid' : 'pending', 
                category: 'transport',
                krwAmount: f.cost 
            });
        }
    });

    // 숙박 (기본 KRW)
    trip.accommodation?.forEach(a => {
        if (a.price) {
            const isBooked = a.status === 'booked';
            items.push({ 
                amount: a.price, 
                currency: baseCurrency, 
                method: isBooked ? 'credit_card' : 'cash', // 현장 결제는 현금으로 가정(임시) 
                status: isBooked ? 'pre_paid' : 'pending', 
                category: 'accommodation',
                krwAmount: a.price 
            });
        }
    });

    // 렌터카/운전 (현지 통화 가능)
    trip.driving?.forEach(d => {
        if (d.cost) {
            const cur = d.currency || baseCurrency;
            items.push({
                amount: d.cost,
                currency: cur,
                method: d.isBooked ? 'credit_card' : 'cash',
                status: d.isBooked ? 'pre_paid' : 'pending',
                category: 'transport',
                krwAmount: getKrw(d.cost, cur),
            });
        }
    });

    // 대중교통 (현지 통화 가능)
    trip.publicTransport?.forEach(pt => {
        if (pt.cost) {
            const cur = pt.currency || baseCurrency;
            items.push({
                amount: pt.cost,
                currency: cur,
                method: pt.isBooked ? 'credit_card' : 'cash',
                status: pt.isBooked ? 'pre_paid' : 'pending',
                category: 'transport',
                krwAmount: getKrw(pt.cost, cur),
            });
        }
    });

    // 예약 (식당·투어·입장권 등)
    trip.reservations?.forEach(r => {
        if (r.cost) {
            const cur = r.currency || baseCurrency;
            const status: PaymentStatus = r.paymentStatus || (r.status === 'confirmed' ? 'pre_paid' : 'pending');
            items.push({
                amount: r.cost,
                currency: cur,
                method: r.paymentMethod || 'credit_card',
                status,
                category: 'activity',
                krwAmount: getKrw(r.cost, cur),
            });
        }
    });

    // 일정 이벤트에 직접 입력된 비용 (입장료 등)
    trip.dailyTimeline?.forEach(day => {
        day.events?.forEach(e => {
            if (e.cost) {
                const cat = EVENT_CATEGORY_TO_BUDGET[(e.mainCategory || e.type) as string] || 'activity';
                items.push({
                    amount: e.cost,
                    currency: baseCurrency,
                    method: 'cash',
                    status: 'pending',
                    category: cat,
                    krwAmount: e.cost,
                });
            }
        });
    });

    // 수동 지출 (trip.budget.expenses)
    budget.expenses.forEach(e => {
        const krw = getKrw(e.amount, e.currency, e.exchangeRate);
        items.push({ 
            amount: e.amount, 
            currency: e.currency, 
            method: e.paymentMethod || 'credit_card', 
            status: e.paymentStatus || 'paid', 
            category: e.category,
            krwAmount: krw 
        });
    });

    // 3. 통계 계산
    const spentKrw = items
        .filter(i => i.status !== 'pending')
        .reduce((sum, i) => sum + i.krwAmount, 0);

    const plannedKrw = items
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + i.krwAmount, 0);

    const balances = {
        cash: {} as Record<string, number>,
        prepaid: {} as Record<string, number>,
        creditCardTotal: 0
    };

    // 통화별 잔액 및 신용카드 총액 계산
    // 초기값: 환전액
    Object.keys(totalExchanged).forEach(code => {
        balances.cash[code] = totalExchanged[code].cash;
        balances.prepaid[code] = totalExchanged[code].prepaid;
    });

    const byCategory: Record<string, number> = {};
    const spentByCategory: Record<string, number> = {};
    const plannedByCategory: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};
    const byPaymentStatus: Record<string, number> = {};

    items.forEach(i => {
        // 카테고리별 합산 (KRW)
        byCategory[i.category] = (byCategory[i.category] || 0) + i.krwAmount;
        
        if (i.status === 'pending') {
            plannedByCategory[i.category] = (plannedByCategory[i.category] || 0) + i.krwAmount;
        } else {
            spentByCategory[i.category] = (spentByCategory[i.category] || 0) + i.krwAmount;
        }

        byPaymentMethod[i.method] = (byPaymentMethod[i.method] || 0) + i.krwAmount;
        byPaymentStatus[i.status] = (byPaymentStatus[i.status] || 0) + i.krwAmount;

        // 잔액 차감 (이미 결제된 'pre_paid'는 제외, 현지 결제 건만 차감)
        if (i.status === 'paid') {
            if (i.method === 'cash') {
                balances.cash[i.currency] = (balances.cash[i.currency] || 0) - i.amount;
            } else if (i.method === 'prepaid_card') {
                balances.prepaid[i.currency] = (balances.prepaid[i.currency] || 0) - i.amount;
            } else if (i.method === 'credit_card') {
                balances.creditCardTotal += i.krwAmount;
            }
        }
    });

    const common = budget.commonAllocated || 0;
    const individual = budget.individualAllocated || 0;
    const participants = trip.participants?.length || 1;
    const allocated = common + (individual * participants);

    const totalKrwSpentOnExchange = Object.values(totalExchanged).reduce((sum, val) => sum + val.krw, 0);
    const totalExchangedByCurrency: Record<string, number> = {};
    Object.keys(totalExchanged).forEach(code => {
        totalExchangedByCurrency[code] = totalExchanged[code].cash + totalExchanged[code].prepaid;
    });

    return {
        total: allocated,
        spent: spentKrw,
        planned: plannedKrw,
        allocated,
        balances,
        exchanges: {
            totalKrwSpent: totalKrwSpentOnExchange,
            byCurrency: totalExchangedByCurrency
        },
        byCategory,
        spentByCategory,
        plannedByCategory,
        byPaymentMethod,
        byPaymentStatus
    };
}

// ─── Layer 0: 여행 예산 "감" 추정 ────────────────────────────────
//
// 예산의 1차 목적은 정밀 장부가 아니라 "이 여행 대충 얼마짜리인지 + 감당 가능한지".
// 그래서 두 덩어리로만 답한다:
//   ① 고정비  = 이미 입력한 항공·숙소·교통·예약·일정 비용의 합 (실측)
//   ② 현지 지출 = 하루 1인 지출 프리셋 × 일수 × 인원 (추정)
// 손입력을 요구하지 않고, 프리셋 탭 하나로 총액 감을 준다.

export type DailySpendLevel = 'backpack' | 'normal' | 'comfort';

export const DAILY_SPEND_LEVELS: Record<DailySpendLevel, { label: string; perDay: number }> = {
    backpack: { label: '배낭', perDay: 50000 },
    normal: { label: '보통', perDay: 100000 },
    comfort: { label: '여유', perDay: 200000 },
};

export interface TripBudgetEstimate {
    fixedTotal: number;                     // 입력된 비용 합 (KRW)
    fixedByCategory: Record<string, number>;
    dailyPerPerson: number;                 // 선택 레벨의 하루 1인 현지 지출
    level: DailySpendLevel;
    days: number;
    participants: number;
    localEstimate: number;                  // dailyPerPerson × days × participants
    total: number;                          // fixedTotal + localEstimate
    perPerson: number;                      // total / participants
    allocated: number;                      // 사용자가 설정한 목표 예산 (없으면 0)
}

export function estimateTripBudget(trip: Trip, level: DailySpendLevel = 'normal'): TripBudgetEstimate {
    const agg = calculateAggregatedBudget(trip);
    const fixedTotal = Object.values(agg.byCategory).reduce((sum, v) => sum + v, 0);

    const perDay = DAILY_SPEND_LEVELS[level].perDay;

    let days = trip.dates?.durationDays || 0;
    if (!days && trip.dates?.startDate && trip.dates?.endDate) {
        const s = new Date(trip.dates.startDate).getTime();
        const e = new Date(trip.dates.endDate).getTime();
        if (!isNaN(s) && !isNaN(e) && e >= s) days = Math.round((e - s) / 86400000) + 1;
    }
    if (!days) days = 1;

    const participants = Math.max(trip.participants?.length || 1, 1);
    const localEstimate = perDay * days * participants;
    const total = fixedTotal + localEstimate;

    return {
        fixedTotal,
        fixedByCategory: agg.byCategory,
        dailyPerPerson: perDay,
        level,
        days,
        participants,
        localEstimate,
        total,
        perPerson: Math.round(total / participants),
        allocated: agg.allocated,
    };
}

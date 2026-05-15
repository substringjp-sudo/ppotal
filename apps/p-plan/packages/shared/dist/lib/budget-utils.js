"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAggregatedBudget = calculateAggregatedBudget;
/**
 * 전역 지출 합계 및 자산 상태 계산
 */
function calculateAggregatedBudget(trip) {
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
    const rates = {};
    rates[baseCurrency] = 1;
    budget.activeCurrencies?.forEach(c => {
        rates[c.code] = c.rate;
    });
    // 하위 호환성용
    if (budget.targetCurrency && budget.exchangeRate) {
        rates[budget.targetCurrency] = budget.exchangeRate;
    }
    // 1. 환전/충전 총합 계산
    const totalExchanged = {};
    budget.exchanges?.forEach(ex => {
        if (!totalExchanged[ex.currencyCode]) {
            totalExchanged[ex.currencyCode] = { cash: 0, prepaid: 0, krw: 0 };
        }
        if (ex.method === 'cash')
            totalExchanged[ex.currencyCode].cash += ex.amount;
        if (ex.method === 'prepaid_card')
            totalExchanged[ex.currencyCode].prepaid += ex.amount;
        totalExchanged[ex.currencyCode].krw += ex.krwAmount;
    });
    const items = [];
    // 헬퍼: KRW 환산 금액 계산
    const getKrw = (amount, currency, rate) => {
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
    // 수동 지출 및 기타 연동 지출 (trip.budget.expenses에 통합 관리되어 있다고 가정)
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
        cash: {},
        prepaid: {},
        creditCardTotal: 0
    };
    // 통화별 잔액 및 신용카드 총액 계산
    // 초기값: 환전액
    Object.keys(totalExchanged).forEach(code => {
        balances.cash[code] = totalExchanged[code].cash;
        balances.prepaid[code] = totalExchanged[code].prepaid;
    });
    const byCategory = {};
    const spentByCategory = {};
    const plannedByCategory = {};
    const byPaymentMethod = {};
    const byPaymentStatus = {};
    items.forEach(i => {
        // 카테고리별 합산 (KRW)
        byCategory[i.category] = (byCategory[i.category] || 0) + i.krwAmount;
        if (i.status === 'pending') {
            plannedByCategory[i.category] = (plannedByCategory[i.category] || 0) + i.krwAmount;
        }
        else {
            spentByCategory[i.category] = (spentByCategory[i.category] || 0) + i.krwAmount;
        }
        byPaymentMethod[i.method] = (byPaymentMethod[i.method] || 0) + i.krwAmount;
        byPaymentStatus[i.status] = (byPaymentStatus[i.status] || 0) + i.krwAmount;
        // 잔액 차감 (이미 결제된 'pre_paid'는 제외, 현지 결제 건만 차감)
        if (i.status === 'paid') {
            if (i.method === 'cash') {
                balances.cash[i.currency] = (balances.cash[i.currency] || 0) - i.amount;
            }
            else if (i.method === 'prepaid_card') {
                balances.prepaid[i.currency] = (balances.prepaid[i.currency] || 0) - i.amount;
            }
            else if (i.method === 'credit_card') {
                balances.creditCardTotal += i.krwAmount;
            }
        }
    });
    const common = budget.commonAllocated || 0;
    const individual = budget.individualAllocated || 0;
    const participants = trip.participants?.length || 1;
    const allocated = common + (individual * participants);
    const totalKrwSpentOnExchange = Object.values(totalExchanged).reduce((sum, val) => sum + val.krw, 0);
    const totalExchangedByCurrency = {};
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

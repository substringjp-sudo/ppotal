"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBudget = validateBudget;
exports.validateBudgetRealism = validateBudgetRealism;
exports.validateExpenseAnomalies = validateExpenseAnomalies;
exports.validateCurrencyMismatch = validateCurrencyMismatch;
function validateBudget(trip, warnings, style) {
    const budget = trip.budget;
    if (!budget)
        return;
    const totalSpent = (budget.expenses || []).reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const common = budget.commonAllocated || 0;
    const totalAllocated = common + (budget.individualAllocated || 0) * (trip.participants?.length || 0);
    if (totalSpent > totalAllocated && totalAllocated > 0) {
        let severity = 'warning';
        if (style?.budgetStrategy === 'luxury')
            severity = 'info';
        warnings.push({
            id: 'budget-exceeded',
            type: 'budget_exceeded',
            severity,
            message: `설정된 예산을 초과했습니다. 지출 내역을 재검토해 보세요. (지출: ${totalSpent.toLocaleString()}${budget.currency} / 예산: ${totalAllocated.toLocaleString()}${budget.currency})`,
            sourceType: 'budget'
        });
    }
}
function validateBudgetRealism(trip, warnings, style) {
    const budget = trip.budget;
    if (!budget || !trip.dates?.durationDays || trip.dates.durationDays === 0)
        return;
    const common = budget.commonAllocated || 0;
    const totalAllocated = common + (budget.individualAllocated || 0) * (trip.participants?.length || 1);
    const dayCount = trip.dates.durationDays;
    const perDayBudget = totalAllocated / dayCount;
    if (budget.currency === 'KRW' && totalAllocated > 0) {
        const highCostRegions = trip.locations.regions?.some(r => r.name?.includes('일본') || r.name?.includes('유럽') || r.name?.includes('미국') ||
            r.name?.includes('영국') || r.name?.includes('스위스') || r.name?.includes('싱가포르'));
        const minBuffer = style?.budgetStrategy === 'value' ? 70000 : 100000;
        if (style?.budgetStrategy === 'luxury' && perDayBudget < 200000) {
            warnings.push({
                id: 'budget-realism-luxury',
                type: 'budget_exceeded',
                severity: 'info',
                message: '고급 퀄리티 여행을 선호하시지만, 설정된 예산이 지역 물가 대비 충분하지 않을 수 있습니다.',
                sourceType: 'budget'
            });
            return;
        }
        if (highCostRegions && perDayBudget < minBuffer) {
            warnings.push({
                id: 'budget-realism',
                type: 'budget_exceeded',
                severity: 'info',
                message: '선택하신 지역의 물가 대비 설정된 예산이 다소 적을 수 있습니다. 식비, 입장료 등을 다시 한번 확인해 보세요.',
                sourceType: 'budget'
            });
        }
    }
}
// B1: 개별 비용 이상치 탐지 (단일 지출이 평균 대비 과도하게 높은 경우)
function validateExpenseAnomalies(trip, warnings) {
    const budget = trip.budget;
    if (!budget || !budget.expenses || budget.expenses.length < 3)
        return;
    const expenses = budget.expenses.filter(e => e.amount && e.amount > 0);
    if (expenses.length < 3)
        return;
    // 카테고리별로 그룹화
    const categoryGroups = {};
    expenses.forEach(exp => {
        const cat = exp.category || 'other';
        if (!categoryGroups[cat])
            categoryGroups[cat] = [];
        categoryGroups[cat].push(exp.amount);
    });
    // 같은 카테고리 내에서 평균 대비 3배 이상인 항목 탐지
    Object.entries(categoryGroups).forEach(([cat, amounts]) => {
        if (amounts.length < 2)
            return;
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const threshold = avg * 3;
        expenses.forEach(exp => {
            const expCat = exp.category || 'other';
            if (expCat !== cat)
                return;
            if (exp.amount > threshold && exp.amount > 10000) { // 1만원 이상 + 평균 3배
                warnings.push({
                    id: `expense-anomaly-${exp.id || exp.title?.slice(0, 10)}`,
                    type: 'budget_anomaly',
                    severity: 'info',
                    message: `'${exp.title || '미분류 지출'}' 비용(${exp.amount.toLocaleString()}${budget.currency})이 같은 카테고리 평균(${Math.round(avg).toLocaleString()}${budget.currency})의 3배를 넘습니다. 입력 오류인지 확인해 주세요.`,
                    suggestion: '실수로 0을 더 입력하거나, 다른 통화로 입력하신 건 아닌지 확인해 보세요.',
                    sourceType: 'budget'
                });
            }
        });
    });
}
// B2: 통화 불일치 (예산 통화와 지출 통화가 다른데 환율 미입력)
function validateCurrencyMismatch(trip, warnings) {
    const budget = trip.budget;
    if (!budget || !budget.expenses || budget.expenses.length === 0)
        return;
    const baseCurrency = budget.currency;
    if (!baseCurrency)
        return;
    const mismatchedExpenses = budget.expenses.filter(exp => exp.currency && exp.currency !== baseCurrency && !exp.exchangeRate);
    if (mismatchedExpenses.length > 0) {
        const currencies = [...new Set(mismatchedExpenses.map(e => e.currency))];
        warnings.push({
            id: 'currency-mismatch',
            type: 'budget_anomaly',
            severity: 'info',
            message: `예산 통화(${baseCurrency})와 다른 통화(${currencies.join(', ')})로 입력된 지출 ${mismatchedExpenses.length}건에 환율이 입력되지 않았습니다.`,
            suggestion: '환율이 없으면 정확한 예산 계산이 어렵습니다. 각 지출 항목에 환율을 입력하거나, 통화를 통일해 주세요.',
            sourceType: 'budget'
        });
    }
}

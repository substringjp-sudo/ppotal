import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
import { calculateTripSettlement, makeTripRateResolver } from '../settlement-utils';

export function validateBudget(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    const budget = trip.budget;
    if (!budget) return;
    const totalSpent = (budget.expenses || []).reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const common = budget.commonAllocated || 0;
    const totalAllocated = common + (budget.individualAllocated || 0) * (trip.participants?.length || 0);

    if (totalSpent > totalAllocated && totalAllocated > 0) {
        let severity: TripWarning['severity'] = 'warning';
        if (style?.budgetStrategy === 'luxury') severity = 'info';

        warnings.push({
            id: 'budget-exceeded',
            type: 'budget_exceeded',
            severity,
            message: `설정된 예산을 초과했습니다. 지출 내역을 재검토해 보세요. (지출: ${totalSpent.toLocaleString()}${budget.currency} / 예산: ${totalAllocated.toLocaleString()}${budget.currency})`,
            sourceType: 'budget'
        });
    }
}

export function validateBudgetRealism(trip: Trip, warnings: TripWarning[], style?: TravelStyle) {
    const budget = trip.budget;
    if (!budget || !trip.dates?.durationDays || trip.dates.durationDays === 0) return;

    const common = budget.commonAllocated || 0;
    const totalAllocated = common + (budget.individualAllocated || 0) * (trip.participants?.length || 1);
    const dayCount = trip.dates.durationDays;
    const perDayBudget = totalAllocated / dayCount;

    if (budget.currency === 'KRW' && totalAllocated > 0) {
        const highCostRegions = trip.locations.regions?.some(r => 
            r.name?.includes('일본') || r.name?.includes('유럽') || r.name?.includes('미국') || 
            r.name?.includes('영국') || r.name?.includes('스위스') || r.name?.includes('싱가포르')
        );

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
export function validateExpenseAnomalies(trip: Trip, warnings: TripWarning[]) {
    const budget = trip.budget;
    if (!budget || !budget.expenses || budget.expenses.length < 3) return;

    const expenses = budget.expenses.filter(e => e.amount && e.amount > 0);
    if (expenses.length < 3) return;

    // 카테고리별로 그룹화
    const categoryGroups: Record<string, number[]> = {};
    expenses.forEach(exp => {
        const cat = exp.category || 'other';
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(exp.amount!);
    });

    // 같은 카테고리 내에서 평균 대비 3배 이상인 항목 탐지
    Object.entries(categoryGroups).forEach(([cat, amounts]) => {
        if (amounts.length < 2) return;
        
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const threshold = avg * 3;

        expenses.forEach(exp => {
            const expCat = exp.category || 'other';
            if (expCat !== cat) return;
            if (exp.amount! > threshold && exp.amount! > 10000) { // 1만원 이상 + 평균 3배
                warnings.push({
                    id: `expense-anomaly-${exp.id || exp.title?.slice(0, 10)}`,
                    type: 'budget_anomaly',
                    severity: 'info',
                    message: `'${exp.title || '미분류 지출'}' 비용(${exp.amount!.toLocaleString()}${budget.currency})이 같은 카테고리 평균(${Math.round(avg).toLocaleString()}${budget.currency})의 3배를 넘습니다. 입력 오류인지 확인해 주세요.`,
                    suggestion: '실수로 0을 더 입력하거나, 다른 통화로 입력하신 건 아닌지 확인해 보세요.',
                    sourceType: 'budget'
                });
            }
        });
    });
}

// 정산 편중 (settlement-utils 재활용) — 결제 부담이 한쪽으로 크게 쏠려 미정산이 큰 경우
export function validateSettlementBalance(trip: Trip, warnings: TripWarning[]) {
    const participants = trip.participants || [];
    if (participants.length < 2) return;
    // 정산 모드가 꺼져 있으면 편중을 경고하지 않는다(솔로·커플 등).
    if (!trip.settlement?.enabled) return;

    // 모든 비용 소스(항공·숙소·예약·교통·지출)를 결제자/분담과 함께 정산.
    const { summary, transfers } = calculateTripSettlement(trip, makeTripRateResolver(trip));

    const totalPaid = summary.reduce((s, r) => s + r.paid, 0);
    if (totalPaid < 10000) return; // 금액이 작으면 의미 없음

    const maxOwed = Math.max(0, ...summary.map(r => -r.balance)); // 가장 많이 내야 할 금액
    if (transfers.length > 0 && maxOwed > totalPaid * 0.4) {
        warnings.push({
            id: 'settlement-imbalance',
            type: 'budget_anomaly',
            severity: 'info',
            message: '참여자 간 결제 부담이 한쪽으로 크게 쏠려 있어요. 미정산 금액이 남아 있으니 정산을 확인해 보세요.',
            suggestion: '각 지출의 결제자와 분담 인원을 확인하고, 정산 기능으로 송금 내역을 정리하세요.',
            sourceType: 'budget'
        });
    }
}

// 예산 카테고리 공백 (지출을 기록 중인데 자주 빠뜨리는 필수 카테고리가 비어있음)
export function validateBudgetCategoryGaps(trip: Trip, warnings: TripWarning[]) {
    const budget = trip.budget;
    if (!budget || !budget.expenses || budget.expenses.length === 0) return;
    if (!trip.dates?.durationDays || trip.dates.durationDays < 2) return;

    const usedCategories = new Set(budget.expenses.map(e => e.category));
    const missing: string[] = [];
    if (!usedCategories.has('food')) missing.push('식비');
    if (!usedCategories.has('transport')) missing.push('현지 교통비');

    if (missing.length > 0) {
        warnings.push({
            id: 'budget-category-gap',
            type: 'budget_anomaly',
            severity: 'info',
            message: `예산에 ${missing.join(', ')} 항목이 비어 있어요. 여행 지출에서 자주 빠뜨리는 항목이에요.`,
            suggestion: '식비와 현지 교통비는 총 경비의 큰 비중을 차지합니다. 대략적인 금액이라도 미리 잡아두면 예산 관리가 쉬워요.',
            sourceType: 'budget'
        });
    }
}

// B2: 통화 불일치 (예산 통화와 지출 통화가 다른데 환율 미입력)
export function validateCurrencyMismatch(trip: Trip, warnings: TripWarning[]) {
    const budget = trip.budget;
    if (!budget || !budget.expenses || budget.expenses.length === 0) return;

    const baseCurrency = budget.currency;
    if (!baseCurrency) return;

    const mismatchedExpenses = budget.expenses.filter(exp => 
        exp.currency && exp.currency !== baseCurrency && !exp.exchangeRate
    );

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

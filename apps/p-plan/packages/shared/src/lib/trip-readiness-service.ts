import { Trip } from '../types/trip';
import { getTripDurationDays } from './utils';

export interface ReadinessBreakdown {
    label: string;
    score: number;
    maxScore: number;
    status: 'completed' | 'in-progress' | 'pending';
    message: string;
}

export interface ReadinessResult {
    totalScore: number;
    status: 'READY' | 'IN_PROGRESS' | 'INITIALIZING';
    breakdown: ReadinessBreakdown[];
}

/**
 * 여행 준비도(성숙도) 점수를 계산합니다.
 */
export function calculateReadinessScore(trip: Trip): ReadinessResult {
    const breakdown: ReadinessBreakdown[] = [];
    
    // 1. 날짜 확정 (10%)
    const hasDates = !!(trip.dates?.startDate && trip.dates?.endDate && !trip.dates.isUndecided);
    breakdown.push({
        label: '여행 일정',
        score: hasDates ? 10 : 0,
        maxScore: 10,
        status: hasDates ? 'completed' : 'pending',
        message: hasDates ? '여행 날짜가 확정되었습니다.' : '여행 날짜를 확정해주세요.'
    });

    // 2. 지역 선정 (15%)
    const regionCount = trip.locations?.regions?.length || 0;
    const regionScore = regionCount > 0 ? 15 : 0;
    breakdown.push({
        label: '방문 지역',
        score: regionScore,
        maxScore: 15,
        status: regionCount > 0 ? 'completed' : 'pending',
        message: regionCount > 0 ? `${regionCount}개의 지역을 선택했습니다.` : '방문할 지역을 선택해주세요.'
    });

    // 3. 항공 예약 (20%)
    // 해외 여행인 경우 항공권이 중요함
    const flightCount = trip.flights?.length || 0;
    let flightScore = 0;
    if (trip.isOverseas) {
        flightScore = flightCount >= 2 ? 20 : (flightCount === 1 ? 10 : 0);
    } else {
        // 국내 여행은 필수는 아니지만 있으면 가점
        flightScore = flightCount > 0 ? 20 : 15; // 기본적으로 15점 주고 있으면 20점
    }
    breakdown.push({
        label: '항공권',
        score: flightScore,
        maxScore: 20,
        status: flightScore === 20 ? 'completed' : (flightScore > 0 ? 'in-progress' : 'pending'),
        message: flightCount > 0 ? `${flightCount}개의 항공편이 등록되었습니다.` : '항공권 정보를 입력해주세요.'
    });

    // 4. 숙소 예약 (25%)
    const days = getTripDurationDays(trip.dates?.startDate, trip.dates?.endDate) || (trip.dates?.durationDays || 1);
    
    const nightsNeeded = Math.max(0, days - 1);
    const accommodationCount = trip.accommodation?.length || 0;
    let accomScore = 0;
    
    if (nightsNeeded === 0) {
        accomScore = 25; // 당일치기는 숙소 불필요
    } else {
        const ratio = Math.min(1, accommodationCount / nightsNeeded);
        accomScore = Math.round(ratio * 25);
    }
    
    breakdown.push({
        label: '숙소 예약',
        score: accomScore,
        maxScore: 25,
        status: accomScore === 25 ? 'completed' : (accomScore > 0 ? 'in-progress' : 'pending'),
        message: nightsNeeded > 0 
            ? `${nightsNeeded}박 중 ${accommodationCount}곳의 숙소가 예약되었습니다.` 
            : '당일치기 여행입니다.'
    });

    // 5. 예산 및 지출 (15%)
    const hasBudget = (trip.budget?.commonAllocated || 0) > 0 || (trip.budget?.individualAllocated || 0) > 0;
    const hasExpenses = (trip.budget?.expenses?.length || 0) > 0 || (trip.flights?.some(f => f.cost) || false) || (trip.accommodation?.some(a => a.price) || false);
    
    let budgetScore = 0;
    if (hasBudget) budgetScore += 7;
    if (hasExpenses) budgetScore += 8;
    
    breakdown.push({
        label: '예산 계획',
        score: budgetScore,
        maxScore: 15,
        status: budgetScore === 15 ? 'completed' : (budgetScore > 0 ? 'in-progress' : 'pending'),
        message: hasBudget ? '예산 설정이 완료되었습니다.' : '여행 예산을 설정해보세요.'
    });

    // 6. 체크리스트 (15%)
    const checklistCount = trip.checklist?.length || 0;
    let checklistScore = 0;
    if (checklistCount > 0) {
        const doneCount = trip.checklist?.filter(c => c.isDone).length || 0;
        const doneRatio = doneCount / checklistCount;
        checklistScore = Math.round(doneRatio * 15);
    }
    
    breakdown.push({
        label: '체크리스트',
        score: checklistScore,
        maxScore: 15,
        status: checklistScore === 15 ? 'completed' : (checklistScore > 0 ? 'in-progress' : 'pending'),
        message: checklistCount > 0 
            ? `준비물 ${checklistCount}개 중 ${breakdown.find(b => b.label === '체크리스트')?.score === 15 ? '모두' : '일부'} 완료`
            : '체크리스트를 작성해보세요.'
    });
    // 재계산 로직 수정 (위에서 참조 에러 방지)
    const checklistMsg = checklistCount > 0 
        ? `준비물 ${checklistCount}개 중 ${Math.round((checklistScore/15)*100)}% 완료`
        : '체크리스트를 작성해보세요.';
    breakdown[5].message = checklistMsg;

    const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
    
    let status: 'READY' | 'IN_PROGRESS' | 'INITIALIZING' = 'INITIALIZING';
    if (totalScore >= 90) status = 'READY';
    else if (totalScore >= 30) status = 'IN_PROGRESS';

    return {
        totalScore,
        status,
        breakdown
    };
}

import { Trip } from '../types/trip';
import { getTripDurationDays } from './utils';
import { generatePreparationItems } from './preparation-service';

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

    // 6. 준비물 (15%)
    //
    // 담은 항목 전체의 완료 비율로 매기면 항목을 담을수록 점수가 내려간다 —
    // 챙길 거리를 적어 두는 행동을 처벌하는 셈이라, 결국 아무것도 안 담는 게 유리해진다.
    // 그래서 '필수'로 분류된 항목만 본다. 선택 항목은 담아도 점수를 깎지 않고,
    // 체크하면 그건 그것대로 남는다.
    //
    // 필수 항목이 하나도 없으면(국내 단기 여행 등) 감점하지 않는다. 준비할 게 없는
    // 여행에 "준비가 덜 됐다"고 말하는 건 사실이 아니다.
    // 분모는 '담은 것'이 아니라 '이 여행에 꼭 필요한 것'이다. 담은 것을 분모로 삼으면
    // 아무것도 담지 않은 사람이 만점을 받고, 챙길 거리를 적어 둔 사람만 점수가 깎인다.
    const checklist = trip.checklist || [];
    const requiredKeys = new Map<string, string>();   // 열쇠 → 표시용 제목
    for (const p of generatePreparationItems(trip)) {
        if (p.priority === 'essential') requiredKeys.set(p.id, p.title);
    }
    // 사용자가 직접 필수로 담은 항목도 함께 센다(추천에 없던 개인 사정).
    for (const c of checklist) {
        if (c.priority === 'essential' && !requiredKeys.has(c.prepId || '')) {
            requiredKeys.set(c.prepId || c.title, c.title);
        }
    }

    const doneKeys = new Set<string>();
    for (const c of checklist) {
        if (!c.isDone) continue;
        if (c.prepId) doneKeys.add(c.prepId);
        doneKeys.add(c.title.trim());
    }
    const requiredTotal = requiredKeys.size;
    const requiredDone = [...requiredKeys.entries()]
        .filter(([key, title]) => doneKeys.has(key) || doneKeys.has(title.trim())).length;

    const checklistScore = requiredTotal === 0
        ? 15
        : Math.round((requiredDone / requiredTotal) * 15);

    const checklistMsg = requiredTotal > 0
        ? `꼭 챙길 것 ${requiredTotal}개 중 ${requiredDone}개 완료`
        : '이 여행에 꼭 필요한 준비물은 없어요.';

    breakdown.push({
        label: '체크리스트',
        score: checklistScore,
        maxScore: 15,
        status: checklistScore === 15 ? 'completed' : (checklistScore > 0 ? 'in-progress' : 'pending'),
        message: checklistMsg,
    });

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

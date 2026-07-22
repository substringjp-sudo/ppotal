import { Trip, TripEvent, TripWarning, MainCategory } from '../types/trip';
import { TravelStyle } from '../types/user';
import { validateTrip } from './trip-validator';

/**
 * 로그인 없이 여행 계획을 즉석에서 점검하기 위한 경량 입력 타입.
 * 전체 Trip 스키마를 몰라도 최소 정보(날짜/제목/시간)만으로 검증 엔진을 돌릴 수 있게 한다.
 */
export interface QuickCheckEventInput {
    id?: string;
    title: string;
    date: string;         // "YYYY-MM-DD"
    startTime?: string;   // "HH:mm"
    endTime?: string;     // "HH:mm"
    placeName?: string;   // 표시용 (현재 검증에는 사용하지 않음)
    category?: MainCategory;
}

export interface QuickCheckInput {
    startDate: string;    // "YYYY-MM-DD"
    endDate?: string;     // "YYYY-MM-DD" (미지정 시 startDate와 동일)
    events: QuickCheckEventInput[];
}

export interface QuickCheckResult {
    trip: Trip;
    warnings: TripWarning[];
}

/** startDate ~ endDate 사이의 날짜 문자열 목록 (최대 366일 가드) */
function eachDate(startDate: string, endDate: string): string[] {
    const out: string[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return startDate ? [startDate] : out;
    }
    const cur = new Date(start);
    let guard = 0;
    while (cur <= end && guard < 366) {
        out.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
        guard++;
    }
    return out;
}

let _seq = 0;
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

/**
 * 경량 입력을 검증 엔진이 받아들이는 완전한 Trip 객체로 변환한다.
 * 서브컬렉션 로드 범위를 'dailyTimeline'로 제한하여, 미입력 숙소/항공에 대한
 * 가짜 경고 없이 일정 충돌·중복·날짜 정합성 검증만 수행되도록 한다.
 */
export function buildQuickCheckTrip(input: QuickCheckInput): Trip {
    const startDate = input.startDate;
    const endDate = input.endDate || input.startDate;
    const days = eachDate(startDate, endDate);

    const dailyTimeline = (days.length ? days : [startDate]).map((date, i) => ({
        day: i + 1,
        date,
        events: input.events
            .filter((e) => e.date === date && e.title.trim())
            .map<TripEvent>((e) => ({
                id: e.id || genId('evt'),
                title: e.title.trim(),
                type: (e.category || 'sightseeing') as MainCategory,
                isFixedTime: !!e.startTime,
                startTime: e.startTime || undefined,
                endTime: e.endTime || undefined,
                maturity: 'planned',
            })),
    }));

    return {
        id: 'quick-check',
        title: '빠른 점검',
        dates: { startDate, endDate, flexibilityDays: 0, isUndecided: false },
        participants: [],
        locations: { regionNames: [], center: { lat: 37.5665, lng: 126.9780 }, regions: [] },
        budget: {
            commonAllocated: 0,
            individualAllocated: 0,
            totalAllocated: 0,
            baseCurrency: 'KRW',
            currency: 'KRW',
            expenses: [],
            activeCurrencies: [],
            exchanges: [],
            participantBudgets: [],
        },
        transportSettings: { useFlight: false, useDriving: false },
        flights: [],
        driving: [],
        publicTransport: [],
        accommodation: [],
        checklist: [],
        prepTimeline: [],
        reservations: [],
        bucketList: [],
        dailyTimeline,
        theme: 'nature',
        isOverseas: false,
        status: 'draft',
        planningStatus: 'planned',
        // 일정 검증만 수행 (숙소/항공/예산 서브컬렉션 미로드로 처리하여 노이즈 방지)
        _loadedSubCollections: ['dailyTimeline'],
    };
}

/**
 * 무료 점검 도구용 여행 타입(페르소나) 프리셋.
 * 같은 일정이라도 타입에 따라 경고의 심각도가 달라진다.
 * (/check는 일정 위주 검증만 하므로 timeline 관련 축만 실효가 있다.)
 */
export interface QuickCheckPersona {
    id: string;
    label: string;
    description: string;
    style?: TravelStyle;
}

export const QUICK_CHECK_PERSONAS: QuickCheckPersona[] = [
    {
        id: 'balanced',
        label: '균형',
        description: '기본 점검 강도',
    },
    {
        id: 'energetic',
        label: '빡빡해도 OK',
        description: '체력형·강행군 감수 — 과밀/충돌 경고를 완화',
        style: {
            planning: 'planned',
            active: 'energetic',
            budgetStrategy: 'value',
            crowdPreference: 'trendy',
            strictness: 'relaxed',
        },
    },
    {
        id: 'relaxed',
        label: '느긋하게',
        description: '여유 중시 — 과밀/충돌을 더 엄격히',
        style: {
            planning: 'planned',
            active: 'relaxed',
            budgetStrategy: 'value',
            crowdPreference: 'local',
            strictness: 'strict',
        },
    },
];

/**
 * 경량 입력을 받아 즉시 검증 결과를 돌려준다. (로그인/네트워크 불필요, 순수 함수)
 * style을 넘기면 여행 타입에 맞춰 경고 심각도가 조절된다.
 */
export function runQuickCheck(input: QuickCheckInput, style?: TravelStyle): QuickCheckResult {
    const trip = buildQuickCheckTrip(input);
    const warnings = validateTrip(trip, undefined, style);
    return { trip, warnings };
}

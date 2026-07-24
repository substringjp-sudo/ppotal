import { Trip, TripEvent, DailyPlan, FlightSegment, DrivingSegment, AccommodationSegment, SubCategory } from '../types/trip';
import { TravelStyle } from '../types/user';
import { resolveCountryProfile } from '../lib/data/country-profiles';

/**
 * 여행자 페르소나 × 목적지 시나리오 생성기 (테스트/시뮬레이션 전용).
 *
 * 6개 거주국 × 6개 여행 스타일 × 6개 목적지 = 216개 조합의 유효한 Trip 객체를
 * 온디맨드로 생성한다. 검증 엔진(validateTrip)과 준비물 생성기(generatePreparationItems)의
 * 정확도를 폭넓게 점검하기 위한 픽스처다.
 *
 * 프로덕션 번들에 포함되지 않도록 index.ts에서는 export하지 않는다.
 * 사용: import { ALL_SCENARIOS, buildScenarioTrip } from '../dev/traveler-simulation';
 */

// ─── 1. 거주국 (6개) ────────────────────────────────────────────
// 플러그/전압/운전방향/통화가 서로 다르도록 선택해 "거주국↔여행국 차이" 로직을 폭넓게 검증한다.

export interface HomeCountry {
    id: string;
    label: string;
    countryName: string; // resolveCountryProfile 별칭 매칭용
}

export const HOME_COUNTRIES: HomeCountry[] = [
    { id: 'KR', label: '한국', countryName: '대한민국' },
    { id: 'US', label: '미국', countryName: '미국' },
    { id: 'GB', label: '영국', countryName: '영국' },
    { id: 'CN', label: '중국', countryName: '중국' },
    { id: 'JP', label: '일본', countryName: '일본' },
    { id: 'AU', label: '호주', countryName: '호주' },
];

// ─── 2. 여행 스타일 페르소나 (6개) ──────────────────────────────
// 앞서 논의한 특성들을 TravelStyle 축에 매핑: 체력형·플렉스(럭셔리)형·즉흥형·
// 환승 여유형·쇼핑 특화형·아웃도어/익스트림 특화형.

export type PersonaFocus = 'general' | 'luxury' | 'spontaneous' | 'patient' | 'shopping' | 'outdoor';

export interface PersonaArchetype {
    id: string;
    label: string;
    description: string;
    focus: PersonaFocus;
    style: TravelStyle;
}

export const PERSONAS: PersonaArchetype[] = [
    {
        id: 'energetic-packed',
        label: '체력만렙 강행군형',
        description: '하루 8~10개 일정도 소화하는 체력파. 빡빡한 스케줄을 선호해요.',
        focus: 'general',
        style: { planning: 'planned', active: 'energetic', budgetStrategy: 'value', crowdPreference: 'trendy', strictness: 'strict', meticulousness: 'meticulous' },
    },
    {
        id: 'luxury-flex',
        label: '플렉스 럭셔리형',
        description: '비용보다 경험의 질을 우선해요. 예산 초과를 크게 개의치 않아요.',
        focus: 'luxury',
        style: { planning: 'planned', active: 'relaxed', budgetStrategy: 'luxury', crowdPreference: 'trendy', strictness: 'relaxed' },
    },
    {
        id: 'spontaneous',
        label: '무계획 즉흥형',
        description: '그날그날 정하는 스타일. 준비물을 깜빡하기 쉬워요.',
        focus: 'spontaneous',
        style: { planning: 'flexible', active: 'energetic', budgetStrategy: 'value', crowdPreference: 'local', strictness: 'relaxed', meticulousness: 'forgetful' },
    },
    {
        id: 'patient-layover',
        label: '여유만만 환승러',
        description: '환승 대기·이동 시간에 관대해요. 서두르지 않아요.',
        focus: 'patient',
        style: { planning: 'flexible', active: 'relaxed', budgetStrategy: 'value', crowdPreference: 'local', strictness: 'relaxed' },
    },
    {
        id: 'shopping',
        label: '쇼핑 특화형',
        description: '면세·쇼핑 위주 일정. 택스리펀과 바우처를 꼼꼼히 챙겨요.',
        focus: 'shopping',
        style: { planning: 'planned', active: 'relaxed', budgetStrategy: 'value', crowdPreference: 'trendy', strictness: 'relaxed', meticulousness: 'meticulous' },
    },
    {
        id: 'outdoor-extreme',
        label: '아웃도어·익스트림형',
        description: '등산·캠핑·수상스포츠 등 액티비티 위주로 여행해요.',
        focus: 'outdoor',
        style: { planning: 'flexible', active: 'energetic', budgetStrategy: 'value', crowdPreference: 'quiet', strictness: 'relaxed' },
    },
];

// ─── 3. 목적지 시나리오 (6개) ───────────────────────────────────
// 국제면허 정책(required/recommended/not-accepted)·운전방향·전압·연휴·반구(계절)를
// 고루 건드리도록 선택했다.

export interface AnchorEvent {
    title: string;
    subCategory: SubCategory;
    dayOffset: number; // 0-based
    startTime: string;
    endTime: string;
}

export interface DestinationScenario {
    id: string;
    label: string;
    countryName: string;
    center: { lat: number; lng: number };
    startDate: string;
    endDate: string;
    flightDurationMinutes: number;
    hasDriving: boolean;
    hasLayover: boolean;
    layoverMinutes: number;
    anchorEvents: AnchorEvent[];
}

export const DESTINATIONS: DestinationScenario[] = [
    {
        id: 'jp-onsen',
        label: '일본 도쿄·하코네 온천',
        countryName: '일본',
        center: { lat: 35.68, lng: 139.76 },
        startDate: '2026-08-13',
        endDate: '2026-08-16', // 오봉 연휴 겹침
        flightDurationMinutes: 150,
        hasDriving: true,
        hasLayover: false,
        layoverMinutes: 0,
        anchorEvents: [
            { title: '도쿄 디즈니랜드', subCategory: 'amusement', dayOffset: 1, startTime: '10:00', endTime: '21:00' },
            { title: '하코네 온천', subCategory: 'scenic', dayOffset: 2, startTime: '17:00', endTime: '19:00' },
        ],
    },
    {
        id: 'th-beach',
        label: '태국 방콕·푸켓 휴양',
        countryName: '태국',
        center: { lat: 13.75, lng: 100.5 },
        startDate: '2027-04-12',
        endDate: '2027-04-16', // 송끄란 겹침
        flightDurationMinutes: 360,
        hasDriving: false,
        hasLayover: false,
        layoverMinutes: 0,
        anchorEvents: [
            { title: '왕궁·왓포 사원 투어', subCategory: 'historical', dayOffset: 1, startTime: '09:00', endTime: '12:00' },
            { title: '푸켓 해변 휴식', subCategory: 'scenic', dayOffset: 3, startTime: '10:00', endTime: '16:00' },
        ],
    },
    {
        id: 'fr-europe',
        label: '프랑스 파리 배낭여행',
        countryName: '프랑스',
        center: { lat: 48.86, lng: 2.35 },
        startDate: '2026-12-20',
        endDate: '2026-12-26', // 크리스마스·연말 겹침
        flightDurationMinutes: 780,
        hasDriving: false,
        hasLayover: true,
        layoverMinutes: 75, // 짧은 환승 (경고 유발용)
        anchorEvents: [
            { title: '에펠탑 전망대', subCategory: 'landmark', dayOffset: 1, startTime: '18:30', endTime: '20:30' },
            { title: '루브르 박물관', subCategory: 'museum', dayOffset: 2, startTime: '10:00', endTime: '13:00' },
        ],
    },
    {
        id: 'us-roadtrip',
        label: '미국 서부 로드트립',
        countryName: '미국',
        center: { lat: 36.17, lng: -115.14 },
        startDate: '2026-11-24',
        endDate: '2026-12-01', // 추수감사절 겹침
        flightDurationMinutes: 660,
        hasDriving: true,
        hasLayover: true,
        layoverMinutes: 110,
        anchorEvents: [
            { title: '라스베가스 스트립', subCategory: 'landmark', dayOffset: 1, startTime: '20:00', endTime: '23:00' },
            { title: '그랜드캐니언 하이킹', subCategory: 'scenic', dayOffset: 3, startTime: '08:00', endTime: '14:00' },
        ],
    },
    {
        id: 'cn-city',
        label: '중국 상하이 도심',
        countryName: '중국',
        center: { lat: 31.23, lng: 121.47 },
        startDate: '2027-02-07',
        endDate: '2027-02-10', // 춘절 연휴 겹침
        flightDurationMinutes: 120,
        hasDriving: true, // 국제면허 불인정 국가 — 검증기 테스트용으로 의도적으로 포함
        hasLayover: false,
        layoverMinutes: 0,
        anchorEvents: [
            { title: '와이탄 야경 산책', subCategory: 'scenic', dayOffset: 0, startTime: '19:00', endTime: '21:00' },
            { title: '상하이 박물관', subCategory: 'museum', dayOffset: 1, startTime: '10:00', endTime: '12:30' },
        ],
    },
    {
        id: 'au-outdoor',
        label: '호주 블루마운틴 아웃도어',
        countryName: '호주',
        center: { lat: -33.71, lng: 150.31 },
        startDate: '2026-12-27',
        endDate: '2027-01-02', // 남반구 한여름 + 연말연시 겹침
        flightDurationMinutes: 600,
        hasDriving: true,
        hasLayover: true,
        layoverMinutes: 95,
        anchorEvents: [
            { title: '블루마운틴 하이킹', subCategory: 'scenic', dayOffset: 2, startTime: '08:00', endTime: '15:00' },
            { title: '시드니 하버브릿지 전망', subCategory: 'landmark', dayOffset: 4, startTime: '17:00', endTime: '19:00' },
        ],
    },
];

// ─── 4. 조합 & 생성기 ───────────────────────────────────────────

export interface ScenarioCombo {
    home: HomeCountry;
    persona: PersonaArchetype;
    destination: DestinationScenario;
}

export const ALL_SCENARIOS: ScenarioCombo[] = HOME_COUNTRIES.flatMap(home =>
    PERSONAS.flatMap(persona => DESTINATIONS.map(destination => ({ home, persona, destination })))
);

export function scenarioId(c: ScenarioCombo): string {
    return `${c.home.id}-${c.persona.id}-${c.destination.id}`;
}

export function scenarioLabel(c: ScenarioCombo): string {
    return `[${c.home.label} 거주 · ${c.persona.label}] → ${c.destination.label}`;
}

function eachDate(startDate: string, endDate: string): string[] {
    const out: string[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [startDate];
    const cur = new Date(start);
    let guard = 0;
    while (cur <= end && guard < 60) {
        out.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
        guard++;
    }
    return out;
}

function addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

let seq = 0;
const genId = (prefix: string) => `${prefix}-${(seq++).toString(36)}`;

function buildEvents(destination: DestinationScenario, persona: PersonaArchetype): DailyPlan[] {
    const days = eachDate(destination.startDate, destination.endDate);
    const timeline: DailyPlan[] = days.map((date, i) => ({ day: i + 1, date, events: [] as TripEvent[] }));

    // 목적지 고정 앵커 이벤트 (앵커마다 서로 다른 실제 장소이므로 좌표를 살짝 분산시킨다)
    destination.anchorEvents.forEach((a, aIdx) => {
        const day = timeline[Math.min(a.dayOffset, timeline.length - 1)];
        day.events.push({
            id: genId('anchor'),
            title: a.title,
            type: 'sightseeing',
            subCategory: a.subCategory,
            isFixedTime: true,
            startTime: a.startTime,
            endTime: a.endTime,
            location: {
                name: a.title,
                lat: destination.center.lat + 0.02 * (aIdx + 1),
                lng: destination.center.lng + 0.02 * (aIdx + 1),
            },
            maturity: 'confirmed',
        });
    });

    // 체력형(energetic)은 하루 일정을 추가로 채워 과밀 임계값을 시험한다
    // (날짜(i)마다 다른 장소를 방문하도록 좌표에 day index를 반영 — 안 그러면 "같은 장소 여러 날 방문"
    //  경고가 의도치 않게 매일 반복 발생한다)
    if (persona.style.active === 'energetic') {
        timeline.forEach((day, i) => {
            [{ t: '09:30', e: '11:00' }, { t: '15:30', e: '17:00' }].forEach((slot, k) => {
                day.events.push({
                    id: genId('extra'),
                    title: `현지 명소 탐방 ${i + 1}-${k + 1}`,
                    type: 'sightseeing',
                    subCategory: 'landmark',
                    isFixedTime: true,
                    startTime: slot.t,
                    endTime: slot.e,
                    location: { name: `${destination.label} 명소 ${i + 1}-${k + 1}`, lat: destination.center.lat - 0.03 * (i + 1) - 0.01 * (k + 1), lng: destination.center.lng - 0.03 * (i + 1) - 0.01 * (k + 1) },
                    maturity: 'planned',
                });
            });
        });
    }

    // 쇼핑 특화형: 쇼핑 이벤트 2건 (택스리펀/면세 준비물 트리거)
    if (persona.focus === 'shopping') {
        const day = timeline[Math.min(1, timeline.length - 1)];
        day.events.push(
            { id: genId('shop'), title: '면세점 쇼핑', type: 'shopping', subCategory: 'goods', isFixedTime: true, startTime: '14:00', endTime: '16:00', maturity: 'planned' },
            { id: genId('shop'), title: '아울렛/쇼핑몰', type: 'shopping', subCategory: 'clothes', isFixedTime: true, startTime: '16:30', endTime: '18:30', maturity: 'planned' }
        );
    }

    // 아웃도어·익스트림형: 액티비티 이벤트 2건 (아웃도어 장비/스포츠보험 준비물 트리거)
    if (persona.focus === 'outdoor') {
        const day = timeline[Math.min(1, timeline.length - 1)];
        day.events.push(
            { id: genId('out'), title: '하이킹/트레킹', type: 'sightseeing', subCategory: 'activity', isFixedTime: true, startTime: '08:00', endTime: '13:00', maturity: 'planned' },
            { id: genId('out'), title: '수상스포츠 액티비티', type: 'sightseeing', subCategory: 'activity', isFixedTime: true, startTime: '14:30', endTime: '17:00', maturity: 'planned' }
        );
    }

    // 매일 점심·저녁 (식사 공백 검증 노이즈 방지 + 현실성)
    timeline.forEach(day => {
        day.events.push(
            { id: genId('meal'), title: '점심 식사', type: 'meal', subCategory: 'food', isFixedTime: true, startTime: '12:30', endTime: '13:30', maturity: 'planned' },
            { id: genId('meal'), title: '저녁 식사', type: 'meal', subCategory: 'food', isFixedTime: true, startTime: '19:00', endTime: '20:00', maturity: 'planned' }
        );
    });

    return timeline;
}

function buildFlights(destination: DestinationScenario, persona: PersonaArchetype, isOverseas: boolean): FlightSegment[] {
    if (!isOverseas) return [];
    const layoverAdj = persona.id === 'patient-layover' ? 90 : 0; // 환승 여유형은 넉넉한 환승을 선택
    const totalOutbound = destination.flightDurationMinutes + (destination.hasLayover ? destination.layoverMinutes + layoverAdj : 0);

    const outbound: FlightSegment = {
        id: genId('flt'),
        type: 'outbound',
        isInternational: true,
        date: destination.startDate,
        departureTime: '09:00',
        arrivalTime: addMinutesToTime('09:00', totalOutbound),
        arrivalLat: destination.center.lat,
        arrivalLng: destination.center.lng,
        flightDurationMinutes: destination.flightDurationMinutes,
        layovers: destination.hasLayover
            ? [{ id: genId('lay'), airportCode: 'XXX', durationMinutes: destination.layoverMinutes + layoverAdj }]
            : undefined,
        reservations: [],
        isBooked: false,
    };
    const inbound: FlightSegment = {
        id: genId('flt'),
        type: 'inbound',
        isInternational: true,
        date: destination.endDate,
        departureTime: '18:00',
        arrivalTime: addMinutesToTime('18:00', destination.flightDurationMinutes),
        departureLat: destination.center.lat,
        departureLng: destination.center.lng,
        flightDurationMinutes: destination.flightDurationMinutes,
        reservations: [],
        isBooked: false,
    };
    return [outbound, inbound];
}

function buildDriving(destination: DestinationScenario): DrivingSegment[] {
    if (!destination.hasDriving) return [];
    const days = eachDate(destination.startDate, destination.endDate);
    const date = days[Math.min(1, days.length - 1)]; // 도착 다음날 픽업
    return [{
        id: genId('drv'),
        vehicleType: 'sedan',
        isRental: true,
        isReturnSameAsPickup: true,
        isBooked: false,
        date,
        pickupLocation: destination.label,
        pickupTime: '09:00',
        returnTime: '19:00',
        reservations: [],
    }];
}

function buildAccommodation(destination: DestinationScenario, persona: PersonaArchetype): AccommodationSegment[] {
    const type = persona.focus === 'luxury' ? 'resort' : (persona.focus === 'shopping' || persona.focus === 'outdoor' ? 'hostel' : 'hotel');
    const price = persona.focus === 'luxury' ? 450000 : persona.focus === 'shopping' ? 150000 : 180000;
    return [{
        id: genId('acc'),
        name: `${destination.label} 숙소`,
        location: destination.label,
        startDate: destination.startDate,
        endDate: destination.endDate,
        color: '#6366f1',
        status: 'tentative',
        type,
        price,
    }];
}

function buildBudget(destination: DestinationScenario, persona: PersonaArchetype) {
    const days = eachDate(destination.startDate, destination.endDate).length;
    const perDay = persona.focus === 'luxury' ? 300000 : persona.focus === 'shopping' ? 200000 : 120000;
    return {
        commonAllocated: perDay * days,
        individualAllocated: 0,
        totalAllocated: perDay * days,
        baseCurrency: 'KRW',
        currency: 'KRW',
        expenses: [],
        activeCurrencies: [],
        exchanges: [],
        participantBudgets: [],
    };
}

/** 조합(거주국·페르소나·목적지)으로부터 유효한 Trip 객체를 생성한다. */
export function buildScenarioTrip(combo: ScenarioCombo): Trip {
    const { home, persona, destination } = combo;
    const homeProfile = resolveCountryProfile(home.countryName);
    const destProfile = resolveCountryProfile(destination.countryName);
    const isOverseas = !homeProfile || !destProfile || homeProfile.key !== destProfile.key;

    const days = eachDate(destination.startDate, destination.endDate);
    const dailyTimeline = buildEvents(destination, persona);
    const flights = buildFlights(destination, persona, isOverseas);
    const driving = buildDriving(destination);
    const accommodation = buildAccommodation(destination, persona);
    const budget = buildBudget(destination, persona);

    return {
        id: scenarioId(combo),
        title: scenarioLabel(combo),
        status: 'active',
        theme: 'nature',
        isOverseas,
        dates: {
            startDate: destination.startDate,
            endDate: destination.endDate,
            flexibilityDays: 0,
            durationDays: days.length,
        },
        participants: [{ id: 'me', name: '나', role: 'me', status: 'accepted' }],
        memberCounts: { me: 1, partner: 0, family: 0, friends: 0 },
        budget,
        locations: {
            regionNames: [destination.countryName],
            center: destination.center,
            regions: [{ id: destination.id, type: 'country', name: destination.countryName }],
        },
        transportSettings: { useFlight: isOverseas, useDriving: destination.hasDriving },
        flights,
        driving,
        publicTransport: [],
        accommodation,
        checklist: [],
        prepTimeline: [],
        reservations: [],
        bucketList: [],
        dailyTimeline,
        warnings: [],
    };
}

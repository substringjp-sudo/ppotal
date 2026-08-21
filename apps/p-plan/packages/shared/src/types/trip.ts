/**
 * Trip 도메인 타입 정의
 * 
 * 여행 데이터의 핵심 스키마입니다.
 * 공통 타입은 ./common.ts에서 import합니다.
 */
import { GeoPoint, RegionIds, ISODateString, TimeString, FirestoreMetadata } from './common';

// ─── 참여자 ─────────────────────────────────────────────────────

export type ParticipantRole = 'me' | 'partner' | 'family' | 'group member' | 'viewer';
export type ParticipantStatus = 'accepted';

export interface TripComment {
    id: string;
    tripId: string;
    userId: string;
    userName: string;
    userPhotoURL?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    
    // Position/Targeting
    targetType: 'day' | 'event' | 'place' | 'budget' | 'general';
    targetId?: string; // e.g. eventId, day number
    position?: {
        x: number;
        y: number;
    };
    
    parentId?: string; // For nested replies
    isResolved: boolean;
    mentions?: string[]; // List of user IDs
}

export interface Participant {
    id: string;
    name: string;
    avatarUrl?: string;
    role: ParticipantRole;
    status: ParticipantStatus;
}

// ─── 날짜 범위 ──────────────────────────────────────────────────

export interface DateRange {
    startDate: ISODateString; // "YYYY-MM-DD"
    endDate: ISODateString;
    flexibilityDays: number; // +/- 일수
    isUndecided?: boolean;
    durationDays?: number;
}

// ─── 예산 ───────────────────────────────────────────────────────

export type BudgetCategory = 'transport' | 'accommodation' | 'food' | 'shopping' | 'activity' | 'other';
export type ExpenseSourceType = 'flight' | 'accommodation' | 'event' | 'manual';

export type ExpenseStatus = 'planned' | 'confirmed';

export type PaymentMethod = 
    | 'credit_card'    // 일반 신용카드 (글로벌 결제, KRW 청구)
    | 'prepaid_card'   // 트래블월랫, 트래블로그 등 (현지 통화 충전식)
    | 'cash'           // 현금 (현지 통화)
    | 'transfer'       // 계좌이체
    | 'other';

export type PaymentStatus = 
    | 'pre_paid'       // 여행 전 미리 결제됨 (KRW 또는 외화)
    | 'paid'           // 현지에서 결제 완료
    | 'pending';       // 결제 예정/현장 결제

export interface BudgetExpense {
    id: string;
    title: string;
    amount: number;
    currency: string;             // 결제 통화 (예: "KRW", "JPY", "USD")
    category: BudgetCategory;
    participantId?: string;       // undefined = 공동 경비
    date?: ISODateString;
    sourceType?: ExpenseSourceType;
    sourceId?: string;
    isAuto?: boolean;
    status: ExpenseStatus;
    paymentMethod: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus: PaymentStatus;
    exchangeRate?: number;        // 결제 시점의 환율 (KRW 환산용)
    isExcluded?: boolean;
    payerId?: string;             // 실제 결제한 사람의 ID (undefined = 공금/공동)
    splitWithIds?: string[];      // 비용을 함께 부담할 사람들의 ID 목록 (undefined = 전체)
    splitExact?: Record<string, number>; // 멤버별 정확 분담액(결제 통화 기준). 있으면 균등 대신 이 값을 사용(LV1)
    memo?: string;
}

export interface ParticipantBudget {
    participantId: string;
    allocatedAmount: number;
    personalExpenses: BudgetExpense[];
}

export interface CurrencyExchange {
    id: string;
    currencyCode: string;         // "JPY", "USD" 등
    amount: number;               // 외화 금액
    krwAmount: number;            // 투입된 KRW 금액
    exchangeRate: number;         // 적용 환율
    method: 'cash' | 'prepaid_card'; // 환전/충전 방식
    date: ISODateString;
    memo?: string;
}

export interface Budget {
    commonAllocated: number;
    individualAllocated?: number;
    totalAllocated?: number;
    spent?: number;               // 총 지출 (KRW 기준)
    baseCurrency: string;         // 보통 "KRW"
    currency: string;             // 메인 표시 통화 (하위 호환성 유지)
    targetCurrency?: string;      // 메인 타켓 통화 (하위 호환성 유지)
    exchangeRate?: number;        // 메인 환율 (하위 호환성 유지)
    
    // 신규 확장 필드
    activeCurrencies: {
        code: string;
        symbol: string;
        rate: number;             // 1 외화당 KRW
    }[];
    exchanges: CurrencyExchange[]; // 환전 및 충전 내역
    expenses: BudgetExpense[];
    participantBudgets: ParticipantBudget[];

    // Exclusion settings
    excludeFlights?: boolean;
    excludeAccommodations?: boolean;
    excludePublicTransport?: boolean;
    excludePrepCosts?: boolean;
}

// ─── 기획 성숙도 (Planning Maturity) ───────────────────────────

/**
 * 여행 기획의 전반적인 상태
 * - ideation: 위시리스트 단계
 * - planned: 정리/구성 중
 * - confirmed: 최종 정리 완료
 * - booked: 모든 예약 완료 (선택적)
 */
export type PlanningStatus = 'ideation' | 'planned' | 'confirmed' | 'booked' | 'tentative';

// ─── 교통 예약 (공통) ───────────────────────────────────────────

export interface TransportReservation {
    id: string;
    date: ISODateString;
    title: string;
    memo?: string;
    time?: TimeString;
    link?: string;
    number?: string;
}

// ─── 교통 - 항공편 ──────────────────────────────────────────────

export type FlightType = 'outbound' | 'inbound' | 'other';

export interface FlightLayover {
    id: string;
    airportCode: string;
    arrivalTime?: string;
    departureTime?: string;
    durationMinutes?: number; // 대기 시간
}

export interface FlightSegment {
    id: string;
    type: FlightType;

    // 출발 위치 (공항코드 기반)
    departureLocation?: string;
    departureTime?: string;        // 자유형식 (예: "10:45 AM")
    departureCountryId?: string;
    departurePrefectureId?: string;
    departureCityId?: string;
    departureLat?: number;
    departureLng?: number;

    // 도착 위치
    arrivalLocation?: string;
    arrivalTime?: string;
    arrivalCountryId?: string;
    arrivalPrefectureId?: string;
    arrivalCityId?: string;
    departureCountryName?: string;
    departurePrefectureName?: string;
    departureCityName?: string;
    arrivalCountryName?: string;
    arrivalPrefectureName?: string;
    arrivalCityName?: string;
    arrivalLat?: number;
    arrivalLng?: number;

    flightNumber?: string;
    airline?: string;
    cost?: number;
    isCostUndecided?: boolean;
    date?: ISODateString;
    isInternational?: boolean;
    isRoundTrip?: boolean;
    linkedFlightId?: string;
    isIndividualCost?: boolean;
    prepDurationMinutes?: number;  // 시간 (부트캠프/체크인 등 출발 전 공항 대기 시간)
    entryDurationMinutes?: number; // 시간 (입국 수속 등 도착 후 공항 대기 시간)
    flightDurationMinutes?: number; // 비행 시간 (분 단위)
    layovers?: FlightLayover[];
    reservations: TransportReservation[];
    isBooked?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
    payerId?: string;             // 정산: 실제 결제자
    splitWithIds?: string[];      // 정산: 함께 부담할 멤버 (undefined = 전체)
    splitExact?: Record<string, number>; // 정산: 멤버별 정확 분담액(해당 통화 기준, LV1)
}

// ─── 교통 - 운전/렌터카 ────────────────────────────────────────

export type VehicleType = 'sedan' | 'van' | 'electric' | 'motorcycle' | 'bicycle' | 'other';

export interface DrivingSegment {
    id: string;
    vehicleType: VehicleType;
    isRental: boolean;
    isReturnSameAsPickup?: boolean;
    date?: ISODateString;

    // 픽업 위치
    pickupLocation?: string;
    pickupTime?: string;
    pickupCountryId?: string;
    pickupPrefectureId?: string;
    pickupCityId?: string;
    pickupLat?: number;
    pickupLng?: number;

    // 반납 위치
    returnLocation?: string;
    returnTime?: string;
    returnCountryId?: string;
    returnPrefectureId?: string;
    returnCityId?: string;
    pickupCountryName?: string;
    pickupPrefectureName?: string;
    pickupCityName?: string;
    returnCountryName?: string;
    returnPrefectureName?: string;
    returnCityName?: string;
    returnLat?: number;
    returnLng?: number;

    cost?: number;
    isCostUndecided?: boolean;
    isDateUndecided?: boolean;
    reservations: TransportReservation[];
    isBooked?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    isReturnTimeManuallyEdited?: boolean;
    currency?: string;
    payerId?: string;             // 정산: 실제 결제자
    splitWithIds?: string[];      // 정산: 함께 부담할 멤버 (undefined = 전체)
    splitExact?: Record<string, number>; // 정산: 멤버별 정확 분담액(해당 통화 기준, LV1)
}

// ─── 교통 - 대중교통 ───────────────────────────────────────────

export type PublicTransportType = 'bus' | 'train' | 'ferry' | 'ropeway' | 'trolleybus' | 'taxi' | 'pass' | 'shuttle' | 'other';

export interface PublicTransportSegment {
    id: string;
    type: PublicTransportType;
    name?: string;
    date?: ISODateString;

    // 출발 위치
    departureLocation?: string;
    departureTime?: string;      // TimeString (HH:mm)
    departureCountryId?: string;
    departurePrefectureId?: string;
    departureCityId?: string;
    departureLat?: number;
    departureLng?: number;

    // 도착 위치
    arrivalLocation?: string;
    arrivalTime?: string;
    arrivalCountryId?: string;
    arrivalPrefectureId?: string;
    arrivalCityId?: string;
    departureCountryName?: string;
    departurePrefectureName?: string;
    departureCityName?: string;
    arrivalCountryName?: string;
    arrivalPrefectureName?: string;
    arrivalCityName?: string;
    arrivalLat?: number;
    arrivalLng?: number;

    isTimeUndecided?: boolean;
    isDateUndecided?: boolean;
    isNextDayArrival?: boolean;
    cost?: number;
    isCostUndecided?: boolean;
    duration?: number;
    reservations: TransportReservation[];
    isBooked?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
    payerId?: string;             // 정산: 실제 결제자
    splitWithIds?: string[];      // 정산: 함께 부담할 멤버 (undefined = 전체)
    splitExact?: Record<string, number>; // 정산: 멤버별 정확 분담액(해당 통화 기준, LV1)
}

// ─── 숙박 ───────────────────────────────────────────────────────

export type AccommodationType = 'hotel' | 'hostel' | 'guesthouse' | 'ryokan' | 'motel' | 'resort' | 'home' | 'pension' | 'camping' | 'other';
export type AccommodationStatus = 'booked' | 'tentative';

export interface AccommodationSegment {
    id: string;
    name: string;
    location: string;
    startDate: ISODateString; // YYYY-MM-DD
    endDate: ISODateString;
    color: string;
    status: AccommodationStatus;
    type: AccommodationType;
    checkInStartTime?: TimeString;
    checkInEndTime?: TimeString;
    checkOutStartTime?: TimeString;
    checkOutEndTime?: TimeString;
    expectedCheckInTime?: TimeString;  // (User's plan)
    expectedCheckOutTime?: TimeString; // (User's plan)
    hasParking?: boolean;
    hasBreakfast?: boolean;
    hasLunch?: boolean;
    hasDinner?: boolean;
    isAllInclusive?: boolean;
    hasShuttle?: boolean;
    hasWifi?: boolean;
    hasPool?: boolean;
    hasGym?: boolean;
    hasToiletries?: boolean;
    price?: number;
    isPriceUndecided?: boolean;
    roomCount?: number;
    bedCount?: number;
    bedType?: string;
    memo?: string;
    link?: string;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
    countryName?: string;
    prefectureName?: string;
    cityName?: string;
    lat?: number;
    lng?: number;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
    payerId?: string;             // 정산: 실제 결제자
    splitWithIds?: string[];      // 정산: 함께 부담할 멤버 (undefined = 전체)
    splitExact?: Record<string, number>; // 정산: 멤버별 정확 분담액(해당 통화 기준, LV1)
}

// ─── 체크리스트 / 버킷리스트 ────────────────────────────────────

export interface ChecklistItem {
    id: string;
    title: string;
    isDone: boolean;
    tags?: string[];
    /**
     * 이 항목이 속한 준비 카드(= PrepCategory). 카드는 "여권·입국", "돈·결제"처럼
     * 주제 하나에 체크 항목 몇 개가 들어 있는 묶음이다 — 사용자는 필요한 카드만 골라
     * 담고 그 안에서 체크한다. 목록 하나에 30개를 늘어놓으면 "다 해야 하는 것"으로
     * 읽히지만, 스스로 고른 카드 5장은 그렇지 않다.
     *
     * 카드 도입 이전에 만들어진 항목과 사용자가 직접 적은 항목은 이 값이 없다 —
     * 그런 항목은 "직접 추가" 카드로 모인다.
     */
    cardId?: string;
    /**
     * 이 항목을 만들어 낸 추천 항목의 id(예: 'prep-passport'). 직접 적은 항목엔 없다.
     * 이미 담은 항목을 다시 추천하지 않으려면 안정적인 열쇠가 필요하다 — 제목으로 맞추면
     * 같은 준비물을 표현만 달리한 두 항목이 서로를 못 알아본다.
     */
    prepId?: string;
    /**
     * 추천 엔진이 매긴 중요도. 사용자가 직접 적은 항목에는 없다.
     * 준비도 점수는 이 값이 'essential'인 항목만 본다 — 그래야 선택 항목을 담았다는
     * 이유로 점수가 깎이지 않는다(담는 걸 처벌하면 아무도 안 담는다).
     */
    priority?: 'essential' | 'recommended' | 'optional';
}

export interface BucketListItem {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    tags: string[];
    wishlistId?: string; // 연동된 위시리스트 아이템 ID
    place?: {
        name: string;
        address?: string;
        lat?: number;
        lng?: number;
    } & RegionIds;
    mainCategory?: string;
    subCategory?: string;
    status?: 'interested' | 'planned' | 'visited';
    price?: number;
    currency?: string;
}


// ─── 예약 ───────────────────────────────────────────────────────

export type ReservationStatus = 'confirmed' | 'missing' | 'planned';

export interface Reservation {
    id: string;
    title: string;
    date?: ISODateString;
    time?: TimeString;
    status: ReservationStatus;
    location?: string;
    lat?: number;
    lng?: number;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
    countryName?: string;
    prefectureName?: string;
    cityName?: string;
    cost?: number;
    link?: string;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
    payerId?: string;             // 정산: 실제 결제자
    splitWithIds?: string[];      // 정산: 함께 부담할 멤버 (undefined = 전체)
    splitExact?: Record<string, number>; // 정산: 멤버별 정확 분담액(해당 통화 기준, LV1)
    memo?: string;
}

export interface PrepTask {
    id: string;
    title: string;
    date?: ISODateString;
    status: 'upcoming' | 'active' | 'done';
    memo?: string;
    cost?: number;
    currency?: string;
    isExcluded?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
}



// ─── 일정 이벤트 ────────────────────────────────────────────────

import { MainCategory, SubCategory } from './wishlist';
export type { MainCategory, SubCategory };

export type TransportationMethod = 'walking' | 'bus' | 'train' | 'taxi' | 'bicycle' | 'flight' | 'ship';
export type AutoGeneratedType = 'flight' | 'check-in' | 'check-out' | 'stay' | 'public-transport' | 'flight-segment' | 'driving' | 'reservation' | 'flight-bundle';

export interface EventLocation extends Partial<GeoPoint>, RegionIds {
    name: string;
    address?: string;
    googlePlaceId?: string;
    url?: string;
    country?: string;
    prefecture?: string;
    city?: string;
    openingHours?: TimeString; // HH:mm
    closingHours?: TimeString; // HH:mm
    closedDays?: number[];     // [0, 6] (0: Sunday, 6: Saturday)
    openingMonths?: number[];  // [1, 2, 12] (Seasonal)
    notes?: string;
}

export interface TransportToNext {
    method: TransportationMethod;
    durationMinutes: number;
    note?: string;
}

/**
 * 개별 이벤트의 기획 성숙도
 * - ideation: 관심 장소/아이디어 (위시리스트)
 * - planned: 일정에 포함됨 (정리)
 * - confirmed: 확정된 일정
 */
export type EventMaturity = 'ideation' | 'planned' | 'confirmed';

export interface TripEvent {
    id: string;
    title: string;
    type: MainCategory;
    isFixedTime: boolean;
    isFlexible?: boolean;
    startTime?: TimeString;
    endTime?: TimeString;
    durationMinutes?: number;
    location?: EventLocation;
    maturity?: EventMaturity;
    memo?: string;
    imageUrls?: string[];
    links?: string[];
    category?: string;
    mainCategory?: MainCategory;
    subCategory?: SubCategory;
    wishlistId?: string;
    isAutoGenerated?: boolean;
    autoGeneratedType?: AutoGeneratedType;
    transportToNext?: TransportToNext;
    sourceId?: string; // 참조 원본 ID (항공편, 숙소 등)
    cost?: number;
    isCostUndecided?: boolean;
    prepDurationMinutes?: number;
    entryDurationMinutes?: number;
    isInternational?: boolean;
    checkInTime?: TimeString;
    checkOutTime?: TimeString;
    expectedCheckInTime?: TimeString;
    expectedCheckOutTime?: TimeString;
    possibleCheckInTime?: TimeString;
    isBooked?: boolean;
    isPointInTime?: boolean;
    isTimeAdjusted?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
    rangeStart?: TimeString;
    rangeEnd?: TimeString;
}

export interface DailyPlan {
    day: number;
    date: ISODateString;
    events: TripEvent[];
    memo?: string;
    dayOfWeek?: string;
    visitSummary?: string;
}

// ─── 여행 경고 ──────────────────────────────────────────────────

export type WarningType =
    | 'distance'
    | 'location'
    | 'overlap'
    | 'timeline_conflict'
    | 'impossible_transport'
    | 'impossible_travel'
    | 'budget_exceeded'
    | 'not_booked'
    | 'flight_time'
    | 'seasonal'
    | 'unrealistic_speed'
    // 확장 경고 타입
    | 'missing_essential'      // 필수 요소 누락 (숙소 0개, 공항→시내 교통 없음)
    | 'booking_urgent'         // 임박 예약 미완료
    | 'budget_anomaly'         // 비용 이상치/통화 불일치
    | 'route_inefficiency'     // 동선 비효율
    | 'duplicate_event'        // 중복 일정
    | 'health_safety'          // 건강/안전 정보 미비
    | 'time_pressure'          // 시간 압박 (식사/공항/마지막날)
    | 'logistics_gap';         // 물류 공백 (심야귀숙/체크아웃/통신)

export type WarningSeverity = 'critical' | 'warning' | 'info';

export type WarningSourceType =
    | 'flight'
    | 'accommodation'
    | 'driving'
    | 'publicTransport'
    | 'event'
    | 'budget'
    | 'checklist'
    | 'prep'
    | 'location'
    | 'other'
    | 'general';

/** 
 * 경고 메타데이터 (discriminated 아님, 하지만 any 대신 명시적 필드로 한정)
 * 추후 경고 유형별 discriminated union으로 확장 가능
 */
export interface WarningMetadata {
    distance?: number;
    otherId?: string;
    nextId?: string;
    dayIndex?: number;
    date?: string;
    [key: string]: unknown; // any 대신 unknown으로 안전성 확보
}

export interface TripWarning {
    id: string;
    type: WarningType;
    severity: WarningSeverity;
    message: string;
    suggestion?: string; // 해결 방안 제안
    actionLabel?: string; // 이동 버튼 등 액션 버튼에 들어갈 텍스트
    sourceType: WarningSourceType;
    sourceId?: string;
    metadata?: WarningMetadata;
}

// ─── 여행 지역 정보 ─────────────────────────────────────────────

export type RegionType = 'country' | 'prefecture' | 'city';

export interface TripRegion {
    id: string; // Migrated to String ID
    type: RegionType;
    name: string;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
}

export interface TripLocations {
    /** @deprecated Use regions instead for strict ID-based management */
    regionNames: string[];
    thumbnailUrl?: string;
    center: GeoPoint;
    regions?: TripRegion[];
}

// ─── 교통 설정 ──────────────────────────────────────────────────

export interface TransportSettings {
    useFlight: boolean;
    useDriving: boolean;
}

// ─── 건강 정보 ──────────────────────────────────────────────────

export interface HealthInfo {
    allergies: string[];
    medications: string[];
}

/**
 * Firestore 목록 조회용 경량 여행 요약 인터페이스
 */
export interface TripSummary extends FirestoreMetadata {
    id: string;
    title: string;
    dates: DateRange;
    locations: TripLocations;
    userId: string;
    createdAt: string;
    updatedAt: string;
    theme: string;
    isOverseas: boolean;
    // 신규 확장 필드 (통계용)
    flightCount?: number;
    accommodationCount?: number;
    transportCount?: number;
    warningCount?: number;
    criticalWarningCount?: number;
    participantCount?: number;
    planningStatus?: PlanningStatus;
}

/**
 * 여행 단위 정산 설정.
 * - enabled: 정산 모드 on/off. off면 결제자·분담 개념을 UI에서 숨긴다(솔로·커플용).
 * - mode: 'even' = 지출 기본 1/N(전원 균등), 'individual' = 각자(기본 미분담).
 * - defaultPayerId: 결제자 미지정 항목의 기본 결제자. 없으면 'me' 참가자로 유도.
 */
export interface SettlementSettings {
    enabled: boolean;
    mode: 'even' | 'individual';
    defaultPayerId?: string;
}

export interface Trip extends FirestoreMetadata {
    id: string;
    status?: 'draft' | 'active' | 'finished';
    title: string;
    titleSuggestion?: string;
    dates: DateRange;
    participants: Participant[];
    budget: Budget;
    locations: TripLocations;
    transportSettings: TransportSettings;
    flights: FlightSegment[];
    driving: DrivingSegment[];
    publicTransport: PublicTransportSegment[];
    accommodation: AccommodationSegment[];
    checklist: ChecklistItem[];
    /**
     * 사용자가 "이 여행엔 필요 없다"고 접어 둔 준비 카드(PrepCategory). 추천 엔진은
     * 여행 조건이 맞으면 계속 같은 카드를 제안하므로, 거절한 기억이 없으면 지운 카드가
     * 매번 되살아난다. 제안을 거절하는 것도 준비의 일부다 — 그 판단을 보존한다.
     */
    dismissedPrepCards?: string[];
    prepTimeline: PrepTask[];
    reservations: Reservation[];
    bucketList: BucketListItem[];
    dailyTimeline: DailyPlan[];
    healthInfo?: HealthInfo;
    healthKitCheckedItems?: string[]; // 구급함 체크리스트 ID 목록
    timeDifference?: string;
    memo?: string;
    theme: string;
    isOverseas: boolean; // 사용자의 거주지와 여행지가 다른지 여부
    settlement?: SettlementSettings; // 정산 모드 설정 (없으면 off로 간주)
    warnings?: TripWarning[];
    inviteToken?: string;

    // 통계 및 요약 필드 (메인 문서에 저장하여 목록 조회 시 활용)
    flightCount?: number;
    accommodationCount?: number;
    transportCount?: number;
    warningCount?: number;
    criticalWarningCount?: number;
    planningStatus?: PlanningStatus;

    comments?: TripComment[];
    _loadedSubCollections?: string[];

    // 신규 추가: 백그라운드 기록 설정
    recordingSettings?: TripRecordingSettings;

    // 신규 추가: 기록 모드 (기본: standard)
    recordingMode?: 'standard' | 'simple';

    // 구성원 유형별 인원수 (MembersEditor에서 설정)
    memberCounts?: {
        me: number;
        partner: number;
        family: number;
        friends: number;
    };
}

/**
 * 백그라운드 기록 및 배터리 최적화 설정
 */
export interface TripRecordingSettings {
    isRecordingEnabled: boolean;
    locationIntervals: {
        high: number;    // 배터리 > 50% (ms)
        medium: number;  // 배터리 20-50% (ms)
        low: number;     // 배터리 < 20% (ms)
    };
    autoSyncPhotos: boolean;
}

/**
 * Firestore 문서로서의 Trip (전체 데이터)
 */
export interface TripDocument extends Trip {
    userId: string;
    members: string[]; // UID array for security rules (synced from participants)
    createdAt: string;
    updatedAt: string;
}

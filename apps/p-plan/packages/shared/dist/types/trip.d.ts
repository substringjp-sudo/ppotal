/**
 * Trip 도메인 타입 정의
 *
 * 여행 데이터의 핵심 스키마입니다.
 * 공통 타입은 ./common.ts에서 import합니다.
 */
import { GeoPoint, RegionIds, ISODateString, TimeString, FirestoreMetadata } from './common';
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
    targetType: 'day' | 'event' | 'place' | 'budget' | 'general';
    targetId?: string;
    position?: {
        x: number;
        y: number;
    };
    parentId?: string;
    isResolved: boolean;
    mentions?: string[];
}
export interface Participant {
    id: string;
    name: string;
    avatarUrl?: string;
    role: ParticipantRole;
    status: ParticipantStatus;
}
export interface DateRange {
    startDate: ISODateString;
    endDate: ISODateString;
    flexibilityDays: number;
    isUndecided?: boolean;
    durationDays?: number;
}
export type BudgetCategory = 'transport' | 'accommodation' | 'food' | 'shopping' | 'activity' | 'other';
export type ExpenseSourceType = 'flight' | 'accommodation' | 'event' | 'manual';
export type ExpenseStatus = 'planned' | 'confirmed';
export type PaymentMethod = 'credit_card' | 'prepaid_card' | 'cash' | 'transfer' | 'other';
export type PaymentStatus = 'pre_paid' | 'paid' | 'pending';
export interface BudgetExpense {
    id: string;
    title: string;
    amount: number;
    currency: string;
    category: BudgetCategory;
    participantId?: string;
    date?: ISODateString;
    sourceType?: ExpenseSourceType;
    sourceId?: string;
    isAuto?: boolean;
    status: ExpenseStatus;
    paymentMethod: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus: PaymentStatus;
    exchangeRate?: number;
    isExcluded?: boolean;
    payerId?: string;
    splitWithIds?: string[];
    memo?: string;
}
export interface ParticipantBudget {
    participantId: string;
    allocatedAmount: number;
    personalExpenses: BudgetExpense[];
}
export interface CurrencyExchange {
    id: string;
    currencyCode: string;
    amount: number;
    krwAmount: number;
    exchangeRate: number;
    method: 'cash' | 'prepaid_card';
    date: ISODateString;
    memo?: string;
}
export interface Budget {
    commonAllocated: number;
    individualAllocated?: number;
    totalAllocated?: number;
    spent?: number;
    baseCurrency: string;
    currency: string;
    targetCurrency?: string;
    exchangeRate?: number;
    activeCurrencies: {
        code: string;
        symbol: string;
        rate: number;
    }[];
    exchanges: CurrencyExchange[];
    expenses: BudgetExpense[];
    participantBudgets: ParticipantBudget[];
    excludeFlights?: boolean;
    excludeAccommodations?: boolean;
    excludePublicTransport?: boolean;
    excludePrepCosts?: boolean;
}
/**
 * 여행 기획의 전반적인 상태
 * - ideation: 위시리스트 단계
 * - planned: 정리/구성 중
 * - confirmed: 최종 정리 완료
 * - booked: 모든 예약 완료 (선택적)
 */
export type PlanningStatus = 'ideation' | 'planned' | 'confirmed' | 'booked' | 'tentative';
export interface TransportReservation {
    id: string;
    date: ISODateString;
    title: string;
    memo?: string;
    time?: TimeString;
    link?: string;
    number?: string;
}
export type FlightType = 'outbound' | 'inbound' | 'other';
export interface FlightLayover {
    id: string;
    airportCode: string;
    arrivalTime?: string;
    departureTime?: string;
    durationMinutes?: number;
}
export interface FlightSegment {
    id: string;
    type: FlightType;
    departureLocation?: string;
    departureTime?: string;
    departureCountryId?: string;
    departurePrefectureId?: string;
    departureCityId?: string;
    departureLat?: number;
    departureLng?: number;
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
    prepDurationMinutes?: number;
    entryDurationMinutes?: number;
    flightDurationMinutes?: number;
    layovers?: FlightLayover[];
    reservations: TransportReservation[];
    isBooked?: boolean;
    paymentMethod?: PaymentMethod;
    paymentDate?: ISODateString;
    paymentStatus?: PaymentStatus;
    currency?: string;
}
export type VehicleType = 'sedan' | 'van' | 'electric' | 'motorcycle' | 'bicycle' | 'other';
export interface DrivingSegment {
    id: string;
    vehicleType: VehicleType;
    isRental: boolean;
    isReturnSameAsPickup?: boolean;
    date?: ISODateString;
    pickupLocation?: string;
    pickupTime?: string;
    pickupCountryId?: string;
    pickupPrefectureId?: string;
    pickupCityId?: string;
    pickupLat?: number;
    pickupLng?: number;
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
}
export type PublicTransportType = 'bus' | 'train' | 'ferry' | 'ropeway' | 'trolleybus' | 'taxi' | 'pass' | 'shuttle' | 'other';
export interface PublicTransportSegment {
    id: string;
    type: PublicTransportType;
    name?: string;
    date?: ISODateString;
    departureLocation?: string;
    departureTime?: string;
    departureCountryId?: string;
    departurePrefectureId?: string;
    departureCityId?: string;
    departureLat?: number;
    departureLng?: number;
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
}
export type AccommodationType = 'hotel' | 'hostel' | 'guesthouse' | 'ryokan' | 'motel' | 'resort' | 'home' | 'pension' | 'camping' | 'other';
export type AccommodationStatus = 'booked' | 'tentative';
export interface AccommodationSegment {
    id: string;
    name: string;
    location: string;
    startDate: ISODateString;
    endDate: ISODateString;
    color: string;
    status: AccommodationStatus;
    type: AccommodationType;
    checkInStartTime?: TimeString;
    checkInEndTime?: TimeString;
    checkOutStartTime?: TimeString;
    checkOutEndTime?: TimeString;
    expectedCheckInTime?: TimeString;
    expectedCheckOutTime?: TimeString;
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
}
export interface ChecklistItem {
    id: string;
    title: string;
    isDone: boolean;
    tags?: string[];
}
export interface BucketListItem {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    tags: string[];
    wishlistId?: string;
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
    openingHours?: TimeString;
    closingHours?: TimeString;
    closedDays?: number[];
    openingMonths?: number[];
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
    sourceId?: string;
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
export type WarningType = 'distance' | 'location' | 'overlap' | 'timeline_conflict' | 'impossible_transport' | 'impossible_travel' | 'budget_exceeded' | 'not_booked' | 'flight_time' | 'seasonal' | 'unrealistic_speed' | 'missing_essential' | 'booking_urgent' | 'budget_anomaly' | 'route_inefficiency' | 'duplicate_event' | 'health_safety' | 'time_pressure' | 'logistics_gap';
export type WarningSeverity = 'critical' | 'warning' | 'info';
export type WarningSourceType = 'flight' | 'accommodation' | 'driving' | 'publicTransport' | 'event' | 'budget' | 'checklist' | 'prep' | 'location' | 'other' | 'general';
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
    [key: string]: unknown;
}
export interface TripWarning {
    id: string;
    type: WarningType;
    severity: WarningSeverity;
    message: string;
    suggestion?: string;
    actionLabel?: string;
    sourceType: WarningSourceType;
    sourceId?: string;
    metadata?: WarningMetadata;
}
export type RegionType = 'country' | 'prefecture' | 'city';
export interface TripRegion {
    id: string;
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
export interface TransportSettings {
    useFlight: boolean;
    useDriving: boolean;
}
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
    flightCount?: number;
    accommodationCount?: number;
    transportCount?: number;
    warningCount?: number;
    criticalWarningCount?: number;
    participantCount?: number;
    planningStatus?: PlanningStatus;
}
export interface Trip extends FirestoreMetadata {
    id: string;
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
    prepTimeline: PrepTask[];
    reservations: Reservation[];
    bucketList: BucketListItem[];
    dailyTimeline: DailyPlan[];
    healthInfo?: HealthInfo;
    healthKitCheckedItems?: string[];
    timeDifference?: string;
    memo?: string;
    theme: string;
    isOverseas: boolean;
    warnings?: TripWarning[];
    inviteToken?: string;
    flightCount?: number;
    accommodationCount?: number;
    transportCount?: number;
    warningCount?: number;
    criticalWarningCount?: number;
    planningStatus?: PlanningStatus;
    comments?: TripComment[];
    _loadedSubCollections?: string[];
    recordingSettings?: TripRecordingSettings;
    recordingMode?: 'standard' | 'simple';
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
        high: number;
        medium: number;
        low: number;
    };
    autoSyncPhotos: boolean;
}
/**
 * Firestore 문서로서의 Trip (전체 데이터)
 */
export interface TripDocument extends Trip {
    userId: string;
    members: string[];
    createdAt: string;
    updatedAt: string;
}

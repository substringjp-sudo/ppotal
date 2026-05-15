import { Trip, TripDocument, TripSummary, TripRecordingSettings } from '../types/trip';
export declare const DAILY_PLANS_SUB = "dailyPlans";
export declare const CHECKLIST_SUB = "checklist";
export declare const BUCKET_LIST_SUB = "bucketList";
export declare const FLIGHTS_SUB = "flights";
export declare const ACCOMMODATION_SUB = "accommodation";
export declare const DRIVING_SUB = "driving";
export declare const PUBLIC_TRANSPORT_SUB = "publicTransport";
export declare const PREP_TIMELINE_SUB = "prepTimeline";
export declare const RESERVATIONS_SUB = "reservations";
export declare const COMMENTS_SUB = "comments";
export declare const LOCATION_HISTORY_SUB = "locationHistory";
export declare const PHOTO_HISTORY_SUB = "photoHistory";
/**
 * 여행을 Firestore에 저장 (하위 컬렉션 분산 저장 구조 고도화)
 */
export declare const saveTrip: (trip: Trip, user: {
    uid: string;
    name: string;
    photoURL?: string;
}) => Promise<void>;
/**
 * 단일 여행의 메인 정보만 조회 (기본 설정 및 메타데이터)
 */
export declare const getTripMain: (tripId: string) => Promise<TripDocument | null>;
/**
 * 특정 하위 컬렉션 데이터만 조회 (On-demand loading)
 */
export declare const getTripSubCollection: (tripId: string, subCollection: string) => Promise<any[]>;
/**
 * 단일 여행 조회 (메인 문서 + 모든 하위 컬렉션 병렬 로드 - 레거시/풀 로드용)
 */
export declare const getTrip: (tripId: string) => Promise<TripDocument | null>;
/**
 * 사용자의 모든 여행 요약 목록 조회
 */
export declare const getUserTrips: (userId: string) => Promise<TripSummary[]>;
/**
 * 사용자의 여행 데이터를 요약하여 통계 및 최근 활동 반환
 */
export declare const getUserTripSummary: (userId: string) => Promise<{
    totalTrips: number;
    locationCount: number;
    recentTrips: {
        id: string;
        title: string;
        dates: import("../types/trip").DateRange;
        theme: string;
    }[];
    uniqueRegions: string[];
}>;
/**
 * 사용자의 모든 여행 요약 목록을 실시간으로 구독
 */
export declare const subscribeToUserTrips: (userId: string, callback: (trips: TripSummary[]) => void) => import("@firebase/firestore").Unsubscribe;
/**
 * 여행 정보의 특정 부분만 업데이트 (효율적인 필드별 업데이트)
 */
export declare const updateTripInDb: (tripId: string, updates: Partial<Trip>, user?: {
    uid: string;
    name: string;
    photoURL?: string;
}) => Promise<void>;
/**
 * 여행 삭제 (하위 컬렉션 포함 권장)
 * 주의: 클라이언트 측에서 모든 하위 문서를 찾아 지우는 것은 비효율적일 수 있습니다.
 * 가급적 Cloud Functions의 recursive delete 기능을 활용하는 것을 권장합니다.
 */
/**
 * 여행 삭제 (하위 컬렉션 포함)
 * 주의: 클라이언트 측에서 모든 하위 문서를 찾아 지우는 것은 문서 수가 많을 경우 비효율적일 수 있습니다.
 * 500개 이상의 문서를 삭제해야 하는 대규모 여행의 경우 Cloud Functions의 recursive delete 기능을 권장합니다.
 */
export declare const deleteTrip: (tripId: string) => Promise<void>;
/**
 * @deprecated Use recordService.saveFootprintsBatch instead for offline-first capabilities.
 * 모바일기기에서 기록된 위치 정보들을 일괄 동기화 (Firestore 서브컬렉션)
 */
export declare const syncRecordedLocations: (tripId: string, locations: {
    latitude: number;
    longitude: number;
    timestamp: number;
}[]) => Promise<void>;
/**
 * 사용자의 여행 목록을 실시간으로 구독합니다.
 */
export declare const subscribeUserTrips: (userId: string, onUpdate: (trips: Trip[]) => void) => import("@firebase/firestore").Unsubscribe;
/**
 * 인스턴트 여행(계획 없이 시작)을 생성합니다.
 */
export declare const createInstantTrip: (userId: string, userName: string) => Promise<Trip>;
/**
 * 빠른 여행 시작(Fast Start)용 여행 생성
 */
export declare const createFastTrip: (userId: string, userName: string, title: string, startDate: string, endDate: string, settings: TripRecordingSettings) => Promise<Trip>;

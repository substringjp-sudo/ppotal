/**
 * PPLANER Travel Record & Journal Types
 *
 * 모바일(에이전트)이 수집하는 '실시간 기계적 데이터(Footprint)'와
 * 웹/앱에서 사용자가 정제하는 '스토리텔링 데이터(Travelog)'를 분리 정의합니다.
 */
export type ActivityType = 'stationary' | 'walking' | 'running' | 'automotive' | 'cycling' | 'unknown';
export type MediaType = 'image' | 'video';
/**
 * @privacy STRICTLY LOCAL SECURE STORAGE ONLY
 * 이 데이터 모델은 사용자의 실시간 위치를 담고 있는 극도로 민감한 개인 정보입니다.
 * 절대 서버(Firestore 등)로 동기화되거나 공유되어서는 안 됩니다.
 * 모바일 앱(Mobile Agent) 환경에서만 생성되며 기기 내 암호화 스토리지(예: SecureStore, MMKV 암호화)에 저장됩니다.
 */
export interface TripFootprint {
    id: string;
    tripId: string;
    userId: string;
    timestamp: string;
    timezone: string;
    localTime: string;
    lat: number;
    lng: number;
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
    altitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    activityType?: ActivityType;
    batteryLevel?: number;
    hasMedia: boolean;
    mediaUrl?: string;
    mediaType?: MediaType;
    mediaMetadata?: {
        cameraMake?: string;
        cameraModel?: string;
        width?: number;
        height?: number;
        isDeleted?: boolean;
    };
}
/**
 * @privacy PUBLIC OR SELECTIVELY SHARED
 * 발자취(Footprint) 데이터를 바탕으로 사용자가 취사선택하여 작성한 여행기입니다.
 * 이 데이터는 Firestore로 동기화되며, 웹 에디터(Web) 및 타인과 공유될 수 있습니다.
 * 여행기에 삽입되는 위치 정보는 원시 발자취 배열이 아닌, 사용자가 추출을 허용한 "주요 거점(Landmark)" 좌표로 제한되어야 합니다.
 */
export type TravelogStatus = 'draft' | 'published' | 'private';
export type SectionType = 'text' | 'route_map' | 'photo_gallery' | 'day_header' | 'event_block';
/**
 * 트래블로그 작성의 시작점 (컨텍스트)
 */
export type TravelogSourceContext = 'plan_only' | 'plan_with_trace' | 'trace_only' | 'scratch';
import { EventLocation } from './trip';
export type TravelogEventType = 'event' | 'activity';
export interface TravelogEvent {
    id: string;
    title: string;
    date?: string;
    type: TravelogEventType;
    time?: string;
    startTime?: string;
    endTime?: string;
    location?: EventLocation;
    memo?: string;
    imageUrls?: string[];
    mainCategory?: string;
    subCategory?: string;
    isPointInTime?: boolean;
    cost?: number;
    currency?: string;
    link?: string;
    details?: {
        transportType?: string;
        vehicleName?: string;
        seatInfo?: string;
        rating?: number;
        menu?: string;
        hotelName?: string;
        nights?: number;
        heads?: number;
        roomCount?: number;
        bedCount?: number;
        checkInTime?: string;
        checkOutTime?: string;
        items?: string[];
        [key: string]: any;
    };
    emotion?: {
        joy: number;
        sadness: number;
        anger: number;
    };
    subEvents?: TravelogEvent[];
}
export declare const TRAVELOG_ACTIVITY_CATEGORIES: {
    readonly 식사: readonly ["끼니", "카페", "디저트", "간식", "야식", "음주"];
    readonly 방문: readonly ["쇼핑", "관광지", "유적지", "전시관", "미술관", "영화관", "수족관", "동물원", "유원지", "자연경관"];
    readonly 참여: readonly ["학습", "공연", "콘서트", "축제", "물놀이", "설상", "등산", "하이킹"];
    readonly 이동: readonly ["걷기", "달리기", "마라톤", "자전거", "오토바이", "운전", "버스", "지하철", "기차", "페리", "비행기", "로프웨이", "케이블카", "전차", "모노레일", "인력거", "기타"];
    readonly 숙박: readonly ["호텔", "호스텔", "모텔", "료칸", "게스트하우스", "민박", "노숙", "캠핑", "가정집"];
    readonly 기타: readonly [];
};
export declare const TRAVELOG_EVENT_CATEGORIES: {
    readonly 섭취: readonly ["편의점", "마트", "상점", "간식", "노점", "선물"];
    readonly 구매: readonly ["편의점", "마트", "상점", "선물", "일용품", "노점"];
    readonly 방문: readonly ["건물", "친구", "관공서", "유적", "거리"];
    readonly 행동: readonly ["사진촬영", "멈춤", "구경", "장난", "기타"];
};
export type TravelogActivityMajor = keyof typeof TRAVELOG_ACTIVITY_CATEGORIES;
export type TravelogEventMajor = keyof typeof TRAVELOG_EVENT_CATEGORIES;
export interface TravelogDailyPlan {
    day: number;
    date: string;
    events: TravelogEvent[];
    memo?: string;
}
export interface TravelogSection {
    id: string;
    type: SectionType;
    content: string;
    contentJson?: any;
    imageUrls?: string[];
    linkedFootprintIds?: string[];
    linkedEventId?: string;
}
export interface TravelogMemberCounts {
    me: number;
    partner: number;
    family: number;
    friends: number;
}
export interface Travelog {
    id: string;
    tripId?: string;
    userId: string;
    title: string;
    summary: string;
    theme: string;
    memberCounts: TravelogMemberCounts;
    coverImageUrl?: string;
    sourceContext: TravelogSourceContext;
    startDate?: string;
    endDate?: string;
    status: TravelogStatus;
    isPublic: boolean;
    recordingMode?: 'standard' | 'simple';
    timeline: TravelogDailyPlan[];
    sections: TravelogSection[];
    createdAt: string;
    updatedAt: string;
}

/**
 * PPLANER Travel Record & Journal Types
 * 
 * 모바일(에이전트)이 수집하는 '실시간 기계적 데이터(Footprint)'와
 * 웹/앱에서 사용자가 정제하는 '스토리텔링 데이터(Travelog)'를 분리 정의합니다.
 */

export type ActivityType = 'stationary' | 'walking' | 'running' | 'automotive' | 'cycling' | 'unknown';
export type MediaType = 'image' | 'video';

// ─── 실시간 발자취 (Raw Telemetry Data) ───────────────────────────

/**
 * @privacy STRICTLY LOCAL SECURE STORAGE ONLY
 * 이 데이터 모델은 사용자의 실시간 위치를 담고 있는 극도로 민감한 개인 정보입니다.
 * 절대 서버(Firestore 등)로 동기화되거나 공유되어서는 안 됩니다.
 * 모바일 앱(Mobile Agent) 환경에서만 생성되며 기기 내 암호화 스토리지(예: SecureStore, MMKV 암호화)에 저장됩니다.
 */
export interface TripFootprint {
    id: string;             // 타임스탬프 또는 생성된 UUID
    tripId: string;
    userId: string;         // 생성 주체
    
    // 시간 정보 (Temporal Context)
    timestamp: string;      // UTC 기준 절대 시간 (ISO)
    timezone: string;       // 예: "Asia/Tokyo"
    localTime: string;      // 현지 시간 기준 포맷 (ISO)
    
    // 공간 정보 (Spatial Geolocation)
    lat: number;
    lng: number;
    countryId?: string;     // 오버랩/역지오코딩 처리 결과
    prefectureId?: string;
    cityId?: string;
    
    // 모바일 센서 컨텍스트 (Advanced Telemetry)
    altitude?: number;      // 해발 고도 (m)
    accuracy?: number;      // GPS 오차 반경 (m) - 낮을수록 정확함
    speed?: number;         // 이동 속도 (m/s)
    heading?: number;       // 이동 방향 (Degree, 0-359)
    activityType?: ActivityType; // 모바일 OS가 판정한 운동 상태
    batteryLevel?: number;  // 기기 배터리 상태 (0.0 ~ 1.0)
    
    // 연결된 미디어 정보 (Media Metadata)
    hasMedia: boolean;
    mediaUrl?: string;
    mediaType?: MediaType;
    mediaMetadata?: {
        cameraMake?: string;
        cameraModel?: string;
        width?: number;
        height?: number;
        isDeleted?: boolean; // 미디어 원본이 삭제되었더라도 발자취는 흔적으로 유지 가능
    };
}

// ─── 사후 여행기 (Curated Journal) ──────────────────────────────

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
export type TravelogSourceContext = 
    | 'plan_only'          // 1. 여행 계획 기반
    | 'plan_with_trace'    // 2. 계획 + 앱 발자취 병합
    | 'trace_only'         // 3. 무계획 앱 발자취 기반
    | 'scratch';           // 4. 사진/기억 기반 (백지 시작)

import { MainCategory, SubCategory, EventLocation } from './trip';

export type TravelogEventType = 'event' | 'activity';

export interface TravelogEvent {
    id: string;
    title: string;
    date?: string;               // YYYY-MM-DD
    type: TravelogEventType;     // 이벤트 vs 활동 구분
    time?: string;              // HH:mm (Event용 단일 시점)
    startTime?: string;         // HH:mm (Activity용 시작 시점)
    endTime?: string;           // HH:mm (Activity용 종료 시점)
    location?: EventLocation;
    memo?: string;
    imageUrls?: string[];
    mainCategory?: string;
    subCategory?: string;
    isPointInTime?: boolean;    // 하위 호환성을 위해 유지하되 type 사용 권장
    
    // 추가 정보 (Detailed Context)
    cost?: number;              // 지출 금액
    currency?: string;          // 통화 (KRW, JPY 등)
    link?: string;              // 관련 웹 링크 (구글 맵, 예약 사이트 등)
    details?: {                 // 카테고리별 세부 정보
        // 공통
        transportType?: string; // 항공, 기차, 버스 등
        vehicleName?: string;   // 편명, 노선 번호
        seatInfo?: string;      // 좌석 번호
        rating?: number;        // 별점 (1-5)
        
        // 식사 (Meal)
        menu?: string;          // 메뉴 이름
        
        // 숙박 (Stay)
        hotelName?: string;     // 숙소 명칭
        nights?: number;        // 숙박 일수
        heads?: number;         // 인원 수
        roomCount?: number;     // 방 수
        bedCount?: number;      // 침대 수
        checkInTime?: string;   // 체크인 가능 시작 시각
        checkOutTime?: string;  // 체크아웃 마감 시각

        // 구매 (Purchase)
        items?: string[];       // 구매 물품 목록

        [key: string]: any;
    };
    emotion?: {                 // 감정 상태 (Barycentric weights)
        joy: number;
        sadness: number;
        anger: number;
    };
    subEvents?: TravelogEvent[]; // 하위 이벤트 (활동 내부에 종속된 이벤트들)
}

// ─── 카테고리 기수 데이터 ──────────────────────────────────────────

export const TRAVELOG_ACTIVITY_CATEGORIES = {
    '식사': ['끼니', '카페', '디저트', '간식', '야식', '음주'],
    '방문': ['쇼핑', '관광지', '유적지', '전시관', '미술관', '영화관', '수족관', '동물원', '유원지', '자연경관'],
    '참여': ['학습', '공연', '콘서트', '축제', '물놀이', '설상', '등산', '하이킹'],
    '이동': ['걷기', '달리기', '마라톤', '자전거', '오토바이', '운전', '버스', '지하철', '기차', '페리', '비행기', '로프웨이', '케이블카', '전차', '모노레일', '인력거', '기타'],
    '숙박': ['호텔', '호스텔', '모텔', '료칸', '게스트하우스', '민박', '노숙', '캠핑', '가정집'],
    '기타': []
} as const;

export const TRAVELOG_EVENT_CATEGORIES = {
    '섭취': ['편의점', '마트', '상점', '간식', '노점', '선물'],
    '구매': ['편의점', '마트', '상점', '선물', '일용품', '노점'],
    '방문': ['건물', '친구', '관공서', '유적', '거리'],
    '행동': ['사진촬영', '멈춤', '구경', '장난', '기타']
} as const;

export type TravelogActivityMajor = keyof typeof TRAVELOG_ACTIVITY_CATEGORIES;
export type TravelogEventMajor = keyof typeof TRAVELOG_EVENT_CATEGORIES;

export interface TravelogDailyPlan {
    day: number;
    date: string;           // YYYY-MM-DD
    events: TravelogEvent[];
    memo?: string;
}

/**
 * 장소 중심 뷰의 1급 엔티티 (Place-centric substrate).
 *
 * 같은 여행기를 (1) 블로그 흐름으로 읽을 수도, (2) 지도/목록에서 장소마다 사진·소감을
 * 정리해 볼 수도 있게 하려면, "장소"가 이벤트에 달린 좌표가 아니라 안정된 정체성을 가진
 * 하나의 실체여야 한다. 이 엔티티가 그 정체성을 부여한다.
 *
 * - 뷰어의 지도/목록 뷰가 이 배열을 그대로 렌더한다(핀 = place, 카드 = 사진+소감+평점).
 * - "여행지도" 템플릿, 커스텀 분류(collectionIds/category)도 같은 배열을 소비한다.
 * - 타임라인 이벤트(TravelogEvent)와는 linkedEventIds로 느슨하게 연결되며,
 *   장소는 이벤트 없이 독립적으로도 작성될 수 있다(사진/기억만으로 시작한 경우).
 */
export interface TravelogPlace {
    id: string;                     // 안정적 장소 식별자 (place_...)
    name: string;                   // 표시 이름
    googlePlaceId?: string;         // 구글 Place ID (중복 판별 · POI 연결)
    location?: EventLocation;       // 좌표 + 주소 (지도 렌더용)
    visitDate?: string;             // 방문일 (YYYY-MM-DD)
    day?: number;                   // 방문 일차

    // 장소 뷰의 본문 (사용자가 이 장소에 대해 남긴 것)
    impression?: string;            // 소감/후기 (텍스트 fallback)
    impressionJson?: any;           // 리치 텍스트(TipTap) 버전
    photoUrls?: string[];           // 이 장소에서 찍은 사진들
    rating?: number;                // 별점 (1-5)
    emotion?: {                     // 감정 (Barycentric weights)
        joy: number;
        sadness: number;
        anger: number;
    };

    // 분류 (커스텀 분류 갭과 공유되는 부착점)
    category?: string;              // 사용자 지정 분류
    collectionIds?: string[];       // 사용자 정의 컬렉션(태그) 참조

    // 타임라인과의 연결 및 정렬
    linkedEventIds?: string[];      // 이 장소를 구성하는 타임라인 이벤트들
    order?: number;                 // 장소 뷰/지도 목록 정렬 순서
}

export interface TravelogSection {
    id: string;
    type: SectionType;
    content: string;               // 텍스트 fallback 또는 마크다운
    contentJson?: any;             // TipTap 등 블록 에디터용 JSON 데이터
    imageUrls?: string[];          // 섹션 전용 이미지들
    linkedFootprintIds?: string[];  // 이 섹션의 바탕이 되는 원시 발자취 ID 목록 (모바일 전용)
    linkedEventId?: string;        // 타임라인 내 특정 일정(TravelogEvent)과 연결된 경우
}

export interface TravelogMemberCounts {
    me: number;
    partner: number;
    family: number;
    friends: number;
}

export interface Travelog {
    id: string;
    tripId?: string;        // 계획에서 생성된 경우 연동 ID
    userId: string;         // 작성자
    
    title: string;
    summary: string;
    theme: string;
    memberCounts: TravelogMemberCounts;
    coverImageUrl?: string;
    sourceContext: TravelogSourceContext; // 작성 시작 시점의 맥락
    
    startDate?: string;     // 여행 시작일 (YYYY-MM-DD)
    endDate?: string;       // 여행 종료일 (YYYY-MM-DD)
    
    status: TravelogStatus;
    isPublic: boolean;      // 외부 공유 허용 여부
    
    // 신규 추가: 기록 모드 (기본: standard)
    recordingMode?: 'standard' | 'simple';
    
    // 단순화된 타임라인 데이터
    timeline: TravelogDailyPlan[];
    
    // 블로그 형식의 고급 섹션 에디팅 데이터
    sections: TravelogSection[];

    // 장소 중심 뷰의 데이터 (지도/목록 토글 · "여행지도" 템플릿의 원천)
    // 이벤트 좌표에서 파생되거나 사용자가 직접 작성할 수 있다.
    places?: TravelogPlace[];

    createdAt: string;
    updatedAt: string;
}

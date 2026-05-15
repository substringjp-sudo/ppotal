/**
 * 공통 타입 정의 (Common Types)
 * 
 * 프로젝트 전반에서 재사용되는 기본 타입들을 정의합니다.
 * trip.ts, wishlist.ts 등 도메인 타입에서 이 파일을 import 합니다.
 */

// ─── 날짜/시간 형식 브랜드 타입 ─────────────────────────────────
// 런타임에서는 일반 string이지만, 의도를 코드에서 명시합니다.

/** ISO 날짜 문자열 (예: "2024-08-15") */
export type ISODateString = string;

/** 24시간 시각 문자열 (예: "14:30") */
export type TimeString = string;

/** ISO datetime 문자열 (예: "2024-08-15T10:00:00Z") */
export type ISODateTimeString = string;

// ─── 지리 정보 공통 타입 ────────────────────────────────────────

/** 위도/경도 좌표 */
export interface GeoPoint {
    lat: number;
    lng: number;
}

/** 검색 결과 (국가/지역/도시) */
export interface SearchResult {
    id: string;
    type: 'country' | 'prefecture' | 'city';
    name: string;
    fullName: string;
    center?: GeoPoint;
    ids: RegionIds;
    region?: any; // 상세 국가/지역 정보 (currency, timezone 등)
}

/** 
 * 계층적 지역 ID (국가 > 광역 > 도시)
 * region-service.ts의 데이터 구조와 일치
 */
export interface RegionIds {
    countryId?: string;
    prefectureId?: string;
    cityId?: string;
    countryName?: string;
    prefectureName?: string;
    cityName?: string;
}

/**
 * 완전한 위치 정보 (좌표 + 지역 ID + 표시명)
 * 
 * FlightSegment의 departure/arrival, DrivingSegment의 pickup/return,
 * PublicTransportSegment의 departure/arrival, AccommodationSegment의 위치 등
 * 모든 "장소"를 이 하나의 인터페이스로 표현합니다.
 */
export interface LocationInfo extends Partial<GeoPoint>, RegionIds {
    /** 표시용 이름 (공항코드, 장소명, 주소 등) */
    name?: string;
    /** 상세 주소 */
    address?: string;
    /** Google Place ID */
    googlePlaceId?: string;
    /** 관련 URL (Google Maps 등) */
    url?: string;
}

// ─── ID 생성 유틸리티 ───────────────────────────────────────────

/** 9자리 영숫자 랜덤 ID 생성 (클라이언트 측 임시 ID) */
export function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

// ─── Firestore 메타데이터 ───────────────────────────────────────

/** Firestore에 저장될 때 추가되는 메타데이터 */
export interface FirestoreMetadata {
    /** 소유자 Firebase UID */
    userId?: string;
    /** 생성 일시 (ISO 8601) */
    createdAt?: ISODateTimeString;
    /** 마지막 수정 일시 (ISO 8601) */
    updatedAt?: ISODateTimeString;
    /** 공유/협업 사용자 UID 목록 */
    sharedWith?: string[];
}

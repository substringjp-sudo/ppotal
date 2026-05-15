/**
 * PPLANER 공통 상수 정의
 *
 * 로직 내 하드코딩된 매직 넘버를 관리하기 위한 중앙 저장소입니다.
 */
/** 하루의 총 시간 (분) */
export declare const MINUTES_IN_DAY = 1440;
/** 하루의 총 시간 (밀리초) */
export declare const MS_PER_DAY = 86400000;
/** 타임라인 안전 상한선 (최대 1년) */
export declare const TIMELINE_SAFETY_MAX_DAYS = 366;
export declare const MASTERY_EXP_VALUES: {
    COUNTRY_VISIT: number;
    PREFECTURE_VISIT: number;
    CITY_VISIT: number;
    DAY_STAY: number;
    MAX_DAY_BONUS_COUNTRY: number;
    MAX_DAY_BONUS_PREF: number;
};
export declare const MASTERY_THRESHOLDS: {
    COUNTRY: number;
    PREFECTURE: number;
    CITY: number;
};
/** 환율정보 등 외부 API 기본 타임아웃 (ms) */
export declare const DEFAULT_API_TIMEOUT = 3000;
/** 여행 ID 최소 길이 (더미 데이터 필터링용) */
export declare const MIN_VALID_ID_LENGTH = 5;

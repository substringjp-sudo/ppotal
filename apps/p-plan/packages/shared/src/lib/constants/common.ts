/**
 * PPLANER 공통 상수 정의
 * 
 * 로직 내 하드코딩된 매직 넘버를 관리하기 위한 중앙 저장소입니다.
 */

// --- 시간 관련 상수 ---
/** 하루의 총 시간 (분) */
export const MINUTES_IN_DAY = 1440;
/** 하루의 총 시간 (밀리초) */
export const MS_PER_DAY = 86400000;
/** 타임라인 안전 상한선 (최대 1년) */
export const TIMELINE_SAFETY_MAX_DAYS = 366;

// --- 경험치 및 레벨 (Maturity) 관련 상수 ---
export const MASTERY_EXP_VALUES = {
    COUNTRY_VISIT: 100, // 방문 국가
    PREFECTURE_VISIT: 20, // 방문 광역자치단체
    CITY_VISIT: 5, // 방문 도시
    DAY_STAY: 10, // 체류 일수당 가점
    MAX_DAY_BONUS_COUNTRY: 500, // 국가별 체류 보너스 상한
    MAX_DAY_BONUS_PREF: 100, // 지역별 체류 보너스 상한
};

export const MASTERY_THRESHOLDS = {
    COUNTRY: 1000,
    PREFECTURE: 200,
    CITY: 50,
};

// --- 네트워크 및 API 관련 ---
/** 환율정보 등 외부 API 기본 타임아웃 (ms) */
export const DEFAULT_API_TIMEOUT = 3000;

// --- 시스템 구성 ---
/** 여행 ID 최소 길이 (더미 데이터 필터링용) */
export const MIN_VALID_ID_LENGTH = 5;

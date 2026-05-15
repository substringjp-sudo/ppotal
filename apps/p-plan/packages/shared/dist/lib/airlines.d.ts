export interface Airline {
    code: string;
    nameKo: string;
    nameEn: string;
    countryKo?: string;
    logoUrl?: string;
}
/**
 * CORE_AIRLINES: 자주 사용되는 주요 항공사 리스트 (로컬 캐시용)
 * 전체 항공사 데이터(8,000+)는 data/airlines.json에 위치하며,
 * Firebase Functions를 통해 실시간 검색이 가능합니다.
 * 여기에 정의된 항공사는 타이핑 즉시(0ms) 결과를 보여주기 위한 최적화용입니다.
 */
export declare const CORE_AIRLINES: Airline[];
export declare const AIRLINES: Airline[];

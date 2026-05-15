/**
 * 국가/지역명 기반 통화 매핑 및 환율 유틸리티
 */
import { TripRegion } from '../types/trip';
export declare const COUNTRY_CURRENCY_MAP: Record<string, string>;
export declare const WORLD_CURRENCIES: {
    code: string;
    name: string;
    symbol: string;
}[];
export declare const CURRENCY_SYMBOLS: Record<string, string>;
export declare const DEFAULT_EXCHANGE_RATES: Record<string, number>;
/**
 * 전용 환율 계산 함수. dynamicRates가 있으면 사용하고, 없으면 기본값 사용.
 * 모든 환율은 1 단위 통화당 KRW 가격 기준입니다.
 */
export declare function getExchangeRate(code: string, dynamicRates?: Record<string, number>): number;
/**
 * 두 통화 간의 환율을 계산합니다. (1 from = ? to)
 */
export declare function convertCurrency(amount: number, fromCode: string, toCode: string, dynamicRates?: Record<string, number>): number;
interface RegionSummary {
    id: string;
    name: string;
    currencies?: string[];
}
/**
 * 지역 목록에서 해당 통화 코드를 유추함
 * @param regions 지역 이름 목록 또는 TripRegion 객체 배열
 * @param countryData (선택) 로드된 국가 데이터
 */
export declare function inferCurrencyFromRegions(regions: (string | TripRegion)[] | undefined, countryData?: RegionSummary[]): string;
/**
 * 특정 국가가 사용하는 모든 통화 목록을 반환 (ID 우선, 이름 폴백)
 */
export declare function getCountryCurrencies(countryNameOrId: string, countryData: RegionSummary[]): string[];
/**
 * 통화 코드에 따른 심볼 반환
 */
export declare function getCurrencySymbol(code: string): string;
/**
 * 전날 대비 혹은 과거 데이터 기반 추천 환전 날짜 계산 (Mock)
 * 여행 시작일 기준 5~10일 전 중 하나를 무작위로 선택하거나 규칙에 따라 제안
 */
export declare function calculateRecommendedExchangeDate(startDateStr: string): string;
export {};

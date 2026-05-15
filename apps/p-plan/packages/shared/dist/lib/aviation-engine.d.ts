import { Airport } from './airports';
import { Airline } from './airlines';
export type { Airport, Airline };
/**
 * 항공 데이터 프로바이더 인터페이스
 */
export interface IAviationProvider {
    readonly isReady: boolean;
    initialize(): Promise<void>;
    /**
     * 특정 코드로 공항 정보를 조회합니다.
     */
    getAirport(code: string): Promise<Airport | null>;
    /**
     * 특정 코드로 항공사 정보를 조회합니다.
     */
    getAirline(code: string): Promise<Airline | null>;
    /**
     * 검색어 기반 공항 검색
     */
    searchAirports(query: string, options?: {
        limit?: number;
        location?: {
            lat: number;
            lng: number;
        };
        departureCode?: string;
    }): Promise<Airport[]>;
    /**
     * 추천 공항 조회 (거주지, 방문지 등 기반)
     */
    getRecommendedAirports(options: {
        limit?: number;
    }): Promise<Airport[]>;
    /**
     * 항공사 검색
     */
    searchAirlines(query: string): Promise<Airline[]>;
}
/**
 * 전역 항공 데이터 엔진 매니저
 */
declare class AviationEngine {
    private provider;
    private initialized;
    setProvider(provider: IAviationProvider): void;
    ensureInitialized(): Promise<void>;
    getAirport(code: string): Promise<Airport | null>;
    getAirline(code: string): Promise<Airline | null>;
    searchAirports(query: string, options?: {
        limit?: number;
        location?: {
            lat: number;
            lng: number;
        };
        departureCode?: string;
    }): Promise<Airport[]>;
    getRecommendedAirports(options: {
        favorites?: string[];
        residenceCountryId?: string;
        visitedCountryIds?: string[];
        limit?: number;
    }): Promise<Airport[]>;
    searchAirlines(query: string): Promise<Airline[]>;
}
export declare const aviationEngine: AviationEngine;

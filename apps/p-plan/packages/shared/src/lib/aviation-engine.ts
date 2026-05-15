import { Airport } from './airports';
import { Airline } from './airlines';
import { RegionIds } from '../types/common';

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
        location?: { lat: number, lng: number };
        departureCode?: string; // 특정 공항 출발 노선 필터링 시
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
class AviationEngine {
    private provider: IAviationProvider | null = null;
    private initialized: boolean = false;

    setProvider(provider: IAviationProvider) {
        this.provider = provider;
        this.initialized = false;
    }

    async ensureInitialized() {
        if (!this.provider) return;
        if (!this.initialized) {
            await this.provider.initialize();
            this.initialized = true;
        }
    }

    async getAirport(code: string): Promise<Airport | null> {
        if (!this.provider) return null;
        await this.ensureInitialized();
        return this.provider.getAirport(code);
    }

    async getAirline(code: string): Promise<Airline | null> {
        if (!this.provider) return null;
        await this.ensureInitialized();
        return this.provider.getAirline(code);
    }

    async searchAirports(query: string, options?: { limit?: number; location?: { lat: number, lng: number }; departureCode?: string }): Promise<Airport[]> {
        if (!this.provider) return [];
        await this.ensureInitialized();
        return this.provider.searchAirports(query, options);
    }

    async getRecommendedAirports(options: { favorites?: string[]; residenceCountryId?: string; visitedCountryIds?: string[]; limit?: number }): Promise<Airport[]> {
        if (!this.provider) return [];
        await this.ensureInitialized();
        return this.provider.getRecommendedAirports(options);
    }

    async searchAirlines(query: string): Promise<Airline[]> {
        if (!this.provider) return [];
        await this.ensureInitialized();
        return this.provider.searchAirlines(query);
    }
}

export const aviationEngine = new AviationEngine();

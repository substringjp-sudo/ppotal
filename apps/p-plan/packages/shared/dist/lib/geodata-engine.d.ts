import { RegionIds } from '../types/common';
/**
 * 지리 정보 데이터 레코드의 기본 구조
 */
export interface GeodataRecord {
    id: string;
    type: 'country' | 'region' | 'city';
    name: string;
    parentId: string | null;
    bbox: [number, number, number, number];
    geometry: any;
    properties?: Record<string, any>;
}
/**
 * 지리 정보 프로바이더 인터페이스
 */
export interface IGeodataProvider {
    readonly isReady: boolean;
    initialize(): Promise<void>;
    /**
     * 특정 좌표에 해당하는 행정구역 계층 정보를 조회합니다.
     */
    lookup(lat: number, lng: number): Promise<RegionIds | null>;
    /**
     * 특정 ID를 가진 지역의 하위 지역 목록을 조회합니다.
     */
    getChildren(parentId: string | null, type: 'country' | 'region' | 'city', includeGeometry?: boolean): Promise<GeodataRecord[]>;
    /**
     * 특정 ID의 메타데이터를 조회합니다.
     */
    getMetadata(id: string, includeGeometry?: boolean): Promise<GeodataRecord | null>;
    /**
     * 검색어 기반 지역 검색
     */
    searchRegions(query: string, options?: {
        type?: 'country' | 'region' | 'city';
        parentId?: string;
        limit?: number;
    }): Promise<GeodataRecord[]>;
}
/**
 * 전역 지리 정보 엔진 매니저
 */
declare class GeodataEngine {
    private provider;
    setProvider(provider: IGeodataProvider): void;
    initialize(): Promise<void>;
    lookup(lat: number, lng: number): Promise<RegionIds | null>;
    getChildren(parentId: string | null, type: 'country' | 'region' | 'city', includeGeometry?: boolean): Promise<GeodataRecord[]>;
    getMetadata(id: string, includeGeometry?: boolean): Promise<GeodataRecord | null>;
    searchRegions(query: string, options?: {
        type?: 'country' | 'region' | 'city';
        parentId?: string;
        limit?: number;
    }): Promise<GeodataRecord[]>;
}
export declare const geodataEngine: GeodataEngine;
export {};

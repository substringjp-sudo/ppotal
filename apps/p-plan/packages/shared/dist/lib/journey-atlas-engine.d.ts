/**
 * Journey Atlas Engine
 *
 * Trip 데이터를 세계지도 위 시각화용 GeoJSON 데이터로 변환합니다.
 * - AtlasNode: 체류/방문 지점 (점)
 * - AtlasEdge: 이동 경로 (선/Arc)
 */
import { Trip, TripDocument } from '../types/trip';
import { Travelog } from '../types/record';
export interface AtlasNode {
    id: string;
    tripId: string;
    tripTitle: string;
    tripColor: string;
    lat: number;
    lng: number;
    timestamp: string;
    type: 'flight-departure' | 'flight-arrival' | 'accommodation' | 'event' | 'transport-departure' | 'transport-arrival';
    label: string;
    dayIndex: number;
    durationMinutes?: number;
    category?: string;
    subCategory?: string;
    memo?: string;
}
export interface AtlasEdge {
    id: string;
    tripId: string;
    tripColor: string;
    from: {
        lat: number;
        lng: number;
        label?: string;
    };
    to: {
        lat: number;
        lng: number;
        label?: string;
    };
    type: 'flight' | 'drive' | 'transit' | 'walk' | 'intra-city' | 'simple-route';
    distanceKm: number;
    durationMinutes?: number;
    timestamp?: string;
}
export interface TripMeta {
    id: string;
    title: string;
    color: string;
    startDate: string;
    endDate: string;
    nodeCount: number;
    edgeCount: number;
    isOverseas: boolean;
}
export interface JourneyAtlasData {
    nodes: AtlasNode[];
    edges: AtlasEdge[];
    tripMeta: TripMeta[];
}
/**
 * Trip 배열을 JourneyAtlasData로 변환합니다.
 * TripSummary는 좌표 데이터가 부족하므로 TripDocument/Trip을 권장합니다.
 */
export declare function buildJourneyAtlas(trips: (Trip | TripDocument)[]): JourneyAtlasData;
/**
 * Travelog 배열을 JourneyAtlasData로 변환합니다.
 */
export declare function buildJourneyAtlasFromTravelogs(travelogs: Travelog[]): JourneyAtlasData;
/**
 * AtlasNode 배열을 GeoJSON FeatureCollection으로 변환합니다.
 * MapLibre의 Source로 직접 사용 가능합니다.
 */
export declare function nodesToGeoJSON(nodes: AtlasNode[]): GeoJSON.FeatureCollection;
/**
 * AtlasEdge 배열을 GeoJSON FeatureCollection으로 변환합니다.
 * flight 타입은 Great Circle Arc로 변환됩니다.
 */
export declare function edgesToGeoJSON(edges: AtlasEdge[]): GeoJSON.FeatureCollection;

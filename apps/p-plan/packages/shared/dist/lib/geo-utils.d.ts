/**
 * 지리 정보 처리를 위한 유틸리티 함수 모음
 */
import { TripRegion } from '../types/trip';
/**
 * 점(Point)이 폴리곤(Polygon) 내부에 있는지 확인합니다. (Ray Casting Algorithm)
 * @param point [lng, lat]
 * @param polygon [[[lng, lat], ...], ...] (GeoJSON Polygon coordinates)
 */
export declare function isPointInPolygon(point: [number, number], polygon: number[][][]): boolean;
/**
 * 점(Point)이 멀티폴리곤(MultiPolygon) 내부에 있는지 확인합니다.
 * @param point [lng, lat]
 * @param multiPolygon [[[[lng, lat], ...], ...], ...]
 */
export declare function isPointInMultiPolygon(point: [number, number], multiPolygon: number[][][][]): boolean;
/**
 * 하버사인 공식을 사용하여 두 좌표 사이의 거리(km)를 계산합니다.
 */
export declare function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * 점 P에서 선분 AB까지의 최단 거리(km)를 구합니다.
 */
export declare function getDistanceToSegment(p: [number, number], a: [number, number], b: [number, number]): number;
/**
 * 점 P에서 폴리곤 경계까지의 최단 거리(km)를 구합니다.
 */
export declare function getDistanceToPolygon(p: [number, number], polygon: number[][][]): number;
/**
 * 점 P에서 멀티폴리곤 경계까지의 최단 거리(km)를 구합니다.
 */
export declare function getDistanceToMultiPolygon(p: [number, number], multiPolygon: number[][][][]): number;
/**
 * GeoJSON Geometry 데이터 구조 인터페이스
 */
export interface GeoJSONGeometry {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
}
/**
 * GeoJSON Geometry 데이터에서 점의 포함 여부와 경계까지의 거리를 계산합니다.
 */
export declare function checkLocationBoundary(lat: number, lng: number, geometry: GeoJSONGeometry): {
    isInside: boolean;
    distance: number;
};
/**
 * 여러 지역 중 하나라도 점이 포함되어 있는지 확인합니다.
 */
export declare function checkPointInRegions(lat: number, lng: number, regions: TripRegion[], geometries: Record<string, GeoJSONGeometry>): {
    isInside: boolean;
    minDistance: number;
};
/**
 * Ramer-Douglas-Peucker 알고리즘을 사용하여 좌표 배열을 단순화합니다.
 * @param points 좌표 배열 [[lng, lat], ...]
 * @param tolerance 허용 오차 (단위: lng/lat 도단위)
 */
export declare function simplifyPoints(points: number[][], tolerance: number): number[][];
/**
 * GeoJSON Geometry를 주어진 오차 범위 내로 단순화합니다.
 */
export declare function simplifyGeometry(geometry: any, tolerance: number): any;

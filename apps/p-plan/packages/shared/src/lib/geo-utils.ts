/**
 * 지리 정보 처리를 위한 유틸리티 함수 모음
 */
import { TripRegion } from '../types/trip';

/**
 * 점(Point)이 폴리곤(Polygon) 내부에 있는지 확인합니다. (Ray Casting Algorithm)
 * @param point [lng, lat]
 * @param polygon [[[lng, lat], ...], ...] (GeoJSON Polygon coordinates)
 */
export function isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
    const [lng, lat] = point;
    let inside = false;

    for (const ring of polygon) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];

            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    }

    return inside;
}

/**
 * 점(Point)이 멀티폴리곤(MultiPolygon) 내부에 있는지 확인합니다.
 * @param point [lng, lat]
 * @param multiPolygon [[[[lng, lat], ...], ...], ...]
 */
export function isPointInMultiPolygon(point: [number, number], multiPolygon: number[][][][]): boolean {
    return multiPolygon.some(polygon => isPointInPolygon(point, polygon));
}

/**
 * 하버사인 공식을 사용하여 두 좌표 사이의 거리(km)를 계산합니다.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 점 P에서 선분 AB까지의 최단 거리(km)를 구합니다.
 */
export function getDistanceToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
    const [px, py] = p; // [lng, lat]
    const [ax, ay] = a;
    const [bx, by] = b;

    const l2 = Math.pow(bx - ax, 2) + Math.pow(by - ay, 2);
    if (l2 === 0) return calculateDistance(py, px, ay, ax);

    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));

    const closestPoint: [number, number] = [
        ax + t * (bx - ax),
        ay + t * (by - ay)
    ];

    return calculateDistance(py, px, closestPoint[1], closestPoint[0]);
}

/**
 * 점 P에서 폴리곤 경계까지의 최단 거리(km)를 구합니다.
 */
export function getDistanceToPolygon(p: [number, number], polygon: number[][][]): number {
    let minDistance = Infinity;

    for (const ring of polygon) {
        for (let i = 0; i < ring.length - 1; i++) {
            const dist = getDistanceToSegment(p, ring[i] as [number, number], ring[i+1] as [number, number]);
            if (dist < minDistance) minDistance = dist;
        }
        // 마지막 점과 첫 점 연결
        const dist = getDistanceToSegment(p, ring[ring.length - 1] as [number, number], ring[0] as [number, number]);
        if (dist < minDistance) minDistance = dist;
    }

    return minDistance;
}

/**
 * 점 P에서 멀티폴리곤 경계까지의 최단 거리(km)를 구합니다.
 */
export function getDistanceToMultiPolygon(p: [number, number], multiPolygon: number[][][][]): number {
    let minDistance = Infinity;
    for (const polygon of multiPolygon) {
        const dist = getDistanceToPolygon(p, polygon);
        if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
}

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
export function checkLocationBoundary(lat: number, lng: number, geometry: GeoJSONGeometry): { isInside: boolean, distance: number } {
    const p: [number, number] = [lng, lat];
    let isInside = false;
    let distance = 0;

    if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates as number[][][];
        isInside = isPointInPolygon(p, coords);
        if (!isInside) {
            distance = getDistanceToPolygon(p, coords);
        }
    } else if (geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates as number[][][][];
        isInside = isPointInMultiPolygon(p, coords);
        if (!isInside) {
            distance = getDistanceToMultiPolygon(p, coords);
        }
    }

    return { isInside, distance };
}

/**
 * 여러 지역 중 하나라도 점이 포함되어 있는지 확인합니다.
 */
export function checkPointInRegions(lat: number, lng: number, regions: TripRegion[], geometries: Record<string, GeoJSONGeometry>) {
    let isInside = false;
    let minDistance = Infinity;

    for (const region of regions) {
        const geoId = `${region.type}-${region.id}`;
        if (geoId && geometries[geoId]) {
            const check = checkLocationBoundary(lat, lng, geometries[geoId]);
            if (check.isInside) {
                isInside = true;
                minDistance = 0;
                break;
            }
            if (check.distance < minDistance) {
                minDistance = check.distance;
            }
        }
    }

    return { isInside, minDistance: isInside ? 0 : (minDistance === Infinity ? 0 : minDistance) };
}

/**
 * Ramer-Douglas-Peucker 알고리즘을 사용하여 좌표 배열을 단순화합니다.
 * @param points 좌표 배열 [[lng, lat], ...]
 * @param tolerance 허용 오차 (단위: lng/lat 도단위)
 */
export function simplifyPoints(points: number[][], tolerance: number): number[][] {
    if (points.length <= 2) return points;

    let maxSqDist = 0;
    let index = 0;
    const last = points.length - 1;

    for (let i = 1; i < last; i++) {
        const sqDist = getSqDist(points[i], points[0], points[last]);
        if (sqDist > maxSqDist) {
            maxSqDist = sqDist;
            index = i;
        }
    }

    if (maxSqDist > tolerance * tolerance) {
        const res1 = simplifyPoints(points.slice(0, index + 1), tolerance);
        const res2 = simplifyPoints(points.slice(index), tolerance);
        return res1.slice(0, -1).concat(res2);
    } else {
        return [points[0], points[last]];
    }
}

/**
 * 점 p에서 선분 v-w까지의 수직 거리의 제곱을 계산합니다.
 */
function getSqDist(p: number[], v: number[], w: number[]): number {
    let x = v[0], y = v[1];
    let dx = w[0] - x, dy = w[1] - y;

    if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = w[0];
            y = w[1];
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
}

/**
 * GeoJSON Geometry를 주어진 오차 범위 내로 단순화합니다.
 */
export function simplifyGeometry(geometry: any, tolerance: number): any {
    if (!geometry || typeof geometry !== 'object' || tolerance <= 0) return geometry;

    if (!('type' in geometry)) {
        return geometry;
    }

    if (geometry.type === 'Polygon') {
        const coordinates = (geometry.coordinates as number[][][]).map(ring => 
            simplifyPoints(ring, tolerance)
        );
        return { ...geometry, coordinates };
    } else if (geometry.type === 'MultiPolygon') {
        const coordinates = (geometry.coordinates as number[][][][]).map(polygon => 
            polygon.map(ring => simplifyPoints(ring, tolerance))
        );
        return { ...geometry, coordinates };
    }

    return geometry;
}

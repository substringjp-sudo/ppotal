import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { decodePolyline } from "../utils/polyline";

// 최단 경로 탐색 데이터 전역 인메모리 캐시
const routeCache = new Map<string, any>();

/**
 * 서버 상에서 최단 경로를 탐색합니다.
 */
export async function findRouteRemote(startId: string, endId: string, allowedLines?: string[]) {
    const cacheKey = `${startId}_${endId}_${(allowedLines || []).sort().join(',')}`;
    if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey);
    }

    const findPathFn = httpsCallable<any, any>(functions, "findPath");
    const response = await findPathFn({ startId, endId, allowedLines });
    
    // 서버에서 받은 폴리라인들을 디코딩하여 [lon, lat][] 배열로 변환
    const result = response.data;
    if (result.geometries) {
        result.decodedGeometries = result.geometries.map((poly: string) => decodePolyline(poly));
    }
    
    routeCache.set(cacheKey, result);
    return result;
}

/**
 * 역 상세 정보를 서버에서 가져옵니다.
 */
export async function getStationInfoRemote(stationId: string) {
    const getStationInfoFn = httpsCallable<any, any>(functions, "getStationInfo");
    const response = await getStationInfoFn({ stationId });
    return response.data;
}

/**
 * 노선 상세 정보를 서버에서 가져옵니다.
 */
export async function getLineInfoRemote(lineId: string) {
    const getLineInfoFn = httpsCallable<any, any>(functions, "getLineInfo");
    const response = await getLineInfoFn({ lineId });
    return response.data;
}

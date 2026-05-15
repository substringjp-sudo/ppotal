export { type GeoJSONGeometry } from './geo-utils';
import { GeoJSONGeometry } from './geo-utils';
import { TripRegion } from '../types/trip';

/**
 * 지역별 기하학(GeoJSON) 데이터 관리를 위한 서비스
 * (현재 썸네일 실루엣 기능 제거로 인해 비활성화됨)
 */

const geometryCache: Record<string, GeoJSONGeometry> = {};

/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
export const loadRegionGeometry = async (_region: TripRegion): Promise<GeoJSONGeometry | null> => {
    return null;
};

/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
export const loadTripGeometries = async (_regions: TripRegion[]): Promise<Record<string, GeoJSONGeometry>> => {
    return {};
};

export const getCachedGeometries = () => geometryCache;

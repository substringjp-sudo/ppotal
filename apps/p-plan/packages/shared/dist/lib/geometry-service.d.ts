export { type GeoJSONGeometry } from './geo-utils';
import { GeoJSONGeometry } from './geo-utils';
import { TripRegion } from '../types/trip';
/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
export declare const loadRegionGeometry: (_region: TripRegion) => Promise<GeoJSONGeometry | null>;
/**
 * @deprecated 썸네일 실루엣 기능 제거로 사용되지 않음
 */
export declare const loadTripGeometries: (_regions: TripRegion[]) => Promise<Record<string, GeoJSONGeometry>>;
export declare const getCachedGeometries: () => Record<string, GeoJSONGeometry>;

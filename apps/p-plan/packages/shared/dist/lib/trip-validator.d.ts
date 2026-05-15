import { Trip, TripWarning } from '../types/trip';
import { GeoJSONGeometry } from './geo-utils';
import { TravelStyle } from '../types/user';
/**
 * 여행 일정 검증 엔진 - 분리된 검증 로직들을 통합하여 수행합니다.
 */
export declare function validateTrip(trip: Trip, geometries?: Record<string, GeoJSONGeometry>, style?: TravelStyle): TripWarning[];

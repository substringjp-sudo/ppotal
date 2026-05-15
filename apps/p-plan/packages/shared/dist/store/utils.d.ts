import { Trip } from '../types/trip';
import { TripState } from './types';
/**
 * currentTrip의 상태를 업데이트하는 공통 유틸리티 함수입니다.
 * null 체크, 데이터 동기화(syncTripData), 및 자동 유효성 검사(validateTrip)를 통합하여
 * 원자적이고 일관된 상태 업데이트를 보장합니다.
 */
export declare const updateTripState: (set: (fn: (state: TripState) => Partial<TripState>) => void, get: () => TripState, updateFn: (trip: Trip) => void | Partial<Trip>) => void;

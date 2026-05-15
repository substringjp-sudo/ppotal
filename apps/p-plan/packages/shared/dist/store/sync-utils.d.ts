import { Trip } from '../types/trip';
/**
 * 여행 데이터의 세그먼트(항공, 숙박 등)와 타임라인/예산 간의 데이터를 동기화합니다.
 */
export declare const syncTripData: (trip: Trip) => void;

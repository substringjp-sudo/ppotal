/**
 * exportService.ts
 * 여행 데이터를 다양한 형식으로 내보내는 순수 함수 모음.
 * 외부 라이브러리 없이 브라우저 내장 API만 사용.
 */
import { Trip, TripDocument } from '../types/trip';
export declare function exportToICS(trip: Trip | TripDocument): void;
export declare function exportToJSON(trip: Trip | TripDocument): void;
export declare function exportToCSV(trip: Trip | TripDocument): void;
export declare function exportToPrint(trip: Trip | TripDocument): void;

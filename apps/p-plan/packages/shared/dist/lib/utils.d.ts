import { type ClassValue } from 'clsx';
export declare function cn(...inputs: ClassValue[]): string;
export declare function removeUndefined<T>(obj: T): T;
export declare const timeToMinutes: (timeStr?: string) => number;
export declare const minutesToTime: (totalMinutes: number) => string;
export declare function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function getTripDurationDays(startDate?: string, endDate?: string): number;
export declare function formatTripDuration(startDate?: string, endDate?: string, durationDays?: number): string;
export interface AccommodationGap {
    start: string;
    end: string;
    days: number;
}
export declare function getAccommodationGaps(trip: {
    dates?: {
        startDate?: string;
        endDate?: string;
    };
    accommodation?: Array<{
        startDate: string;
        endDate: string;
    }>;
}): AccommodationGap[];
/**
 * Google Maps API가 사용 가능한지 확인합니다.
 * 브라우저 환경에서만 동작하며, 서버 사이드에서는 항상 false를 반환합니다.
 */
export declare function isGoogleMapsReady(libraries?: string[]): boolean;

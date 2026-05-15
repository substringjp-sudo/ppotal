import { RegionIds } from '../types/common';
export interface Airport {
    code: string;
    nameKo: string;
    nameEn: string;
    lat: number;
    lng: number;
    timezone: number;
    regionIds: RegionIds;
}
export declare const AIRPORTS: Airport[];
import { TripRegion } from '../types/trip';
export declare function getRecommendedAirports(regions: TripRegion[], currentLocation?: {
    lat: number;
    lng: number;
}, options?: {
    favorites?: string[];
    residence?: {
        countryId?: string;
        countryKo?: string;
        regionKo?: string;
        cityKo?: string;
    };
    intent?: 'departure' | 'arrival';
}): Airport[];
export declare function isInternationalFlight(depCode: string, arrCode: string): boolean;

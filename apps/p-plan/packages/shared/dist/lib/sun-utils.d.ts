/**
 * Sunrise and Sunset calculation utility
 * Based on simplified astronomical formulas
 */
export interface SunPhase {
    sunrise: string;
    sunset: string;
    sunriseMins: number;
    sunsetMins: number;
}
/**
 * Calculates sunrise and sunset for a given location and date.
 * If lat/lng is missing, defaults to 07:00 and 19:00.
 */
export declare function getSunPhases(date: string | Date, lat?: number, lng?: number): SunPhase;

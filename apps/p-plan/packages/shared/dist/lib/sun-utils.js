"use strict";
/**
 * Sunrise and Sunset calculation utility
 * Based on simplified astronomical formulas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSunPhases = getSunPhases;
/**
 * Calculates sunrise and sunset for a given location and date.
 * If lat/lng is missing, defaults to 07:00 and 19:00.
 */
function getSunPhases(date, lat, lng) {
    // Default values if location is missing
    const defaultPhase = {
        sunrise: '07:00',
        sunset: '19:00',
        sunriseMins: 7 * 60,
        sunsetMins: 19 * 60
    };
    if (lat === undefined || lng === undefined)
        return defaultPhase;
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return defaultPhase;
        // Simple approximation for sunrise/sunset
        // In a real production app, suncalc library is recommended.
        // For p-planer, we use a basic seasonal approximation.
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
        // Base sunrise at 6:00, sunset at 18:00 (equinox)
        // Adjust based on latitude and season (simplified)
        // Latitude effect: max +- 2 hours at high latitudes in summer/winter
        const latRad = lat * Math.PI / 180;
        const seasonOffset = Math.cos(2 * Math.PI * (dayOfYear + 10) / 365); // Winter solstice offset
        // Day length variation (very simplified)
        const dayLengthVariation = 4 * Math.sin(latRad) * seasonOffset; // in hours
        const sunriseHour = 6 + dayLengthVariation + (lng / 15); // longitude adjustment (rough)
        const sunsetHour = 18 - dayLengthVariation + (lng / 15);
        // Normalize to 24h
        const norm = (h) => (h + 24) % 24;
        // Since we don't have a timezone library easily available here, 
        // we'll stick to a reasonable local approximation.
        // Most users are in KST (GMT+9) or JST.
        // Let's assume the provided date is already in the local timezone of the location.
        // Actually, a safer way for a "visual only" feature is to use the default 7/7 
        // but shift it slightly if we have lat/lng to feel "correct" relative to the season.
        const sunriseMins = Math.max(240, Math.min(600, (6 * 60) + Math.round(dayLengthVariation * 60)));
        const sunsetMins = Math.max(960, Math.min(1320, (18 * 60) - Math.round(dayLengthVariation * 60)));
        const pad = (n) => n.toString().padStart(2, '0');
        return {
            sunrise: `${pad(Math.floor(sunriseMins / 60))}:${pad(sunriseMins % 60)}`,
            sunset: `${pad(Math.floor(sunsetMins / 60))}:${pad(sunsetMins % 60)}`,
            sunriseMins,
            sunsetMins
        };
    }
    catch (e) {
        return defaultPhase;
    }
}

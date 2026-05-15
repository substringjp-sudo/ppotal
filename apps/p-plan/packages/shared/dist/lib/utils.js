"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minutesToTime = exports.timeToMinutes = void 0;
exports.cn = cn;
exports.removeUndefined = removeUndefined;
exports.getDistance = getDistance;
exports.getTripDurationDays = getTripDurationDays;
exports.formatTripDuration = formatTripDuration;
exports.getAccommodationGaps = getAccommodationGaps;
exports.isGoogleMapsReady = isGoogleMapsReady;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function removeUndefined(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item));
    }
    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                newObj[key] = removeUndefined(value);
            }
        }
    }
    return newObj;
}
const timeToMinutes = (timeStr) => {
    if (!timeStr)
        return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};
exports.timeToMinutes = timeToMinutes;
const minutesToTime = (totalMinutes) => {
    const mins = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
exports.minutesToTime = minutesToTime;
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function getTripDurationDays(startDate, endDate) {
    if (!startDate || !endDate)
        return 0;
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()))
            return 0;
        // 하루를 포함하기 위해 +1
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    catch (e) {
        return 0;
    }
}
function formatTripDuration(startDate, endDate, durationDays) {
    let days = getTripDurationDays(startDate, endDate);
    if (days <= 0 && durationDays && durationDays > 0) {
        days = durationDays;
    }
    if (days <= 0)
        return '일정 미정';
    if (days === 1)
        return '당일치기';
    return `${days - 1}박 ${days}일`;
}
function getAccommodationGaps(trip) {
    if (!trip.dates?.startDate || !trip.dates?.endDate)
        return [];
    const sortedAcc = [...(trip.accommodation || [])].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const gaps = [];
    const tripStart = new Date(trip.dates.startDate);
    const tripEnd = new Date(trip.dates.endDate);
    // 1. 여행 시작일과 첫 숙소 사이의 공백 체크
    if (sortedAcc.length > 0) {
        const firstAccStart = new Date(sortedAcc[0].startDate);
        if (firstAccStart > tripStart) {
            const diff = Math.ceil((firstAccStart.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
            if (diff > 0)
                gaps.push({ start: trip.dates.startDate, end: sortedAcc[0].startDate, days: diff });
        }
    }
    else {
        // 숙소가 하나도 없는 경우 전체 기간이 공백
        const diff = getTripDurationDays(trip.dates.startDate, trip.dates.endDate) - 1;
        if (diff > 0)
            gaps.push({ start: trip.dates.startDate, end: trip.dates.endDate, days: diff });
        return gaps;
    }
    // 2. 숙소와 숙소 사이의 공백 체크
    for (let i = 0; i < sortedAcc.length - 1; i++) {
        const currentEnd = new Date(sortedAcc[i].endDate);
        const nextStart = new Date(sortedAcc[i + 1].startDate);
        if (nextStart > currentEnd) {
            const diff = Math.ceil((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
            gaps.push({ start: sortedAcc[i].endDate, end: sortedAcc[i + 1].startDate, days: diff });
        }
    }
    // 3. 마지막 숙소와 여행 종료일 사이의 공백 체크
    const lastAccEnd = new Date(sortedAcc[sortedAcc.length - 1].endDate);
    if (tripEnd > lastAccEnd) {
        const diff = Math.ceil((tripEnd.getTime() - lastAccEnd.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0)
            gaps.push({ start: sortedAcc[sortedAcc.length - 1].endDate, end: trip.dates.endDate, days: diff });
    }
    return gaps;
}
/**
 * Google Maps API가 사용 가능한지 확인합니다.
 * 브라우저 환경에서만 동작하며, 서버 사이드에서는 항상 false를 반환합니다.
 */
function isGoogleMapsReady(libraries = []) {
    if (typeof window === 'undefined')
        return false;
    const google = window.google;
    if (!google?.maps)
        return false;
    for (const lib of libraries) {
        if (lib === 'places' && !google.maps.places)
            return false;
        if (lib === 'geometry' && !google.maps.geometry)
            return false;
        if (lib === 'marker' && !google.maps.marker)
            return false;
        if (lib === 'visualization' && !google.maps.visualization)
            return false;
    }
    return true;
}

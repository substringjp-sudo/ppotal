import type { Trip } from '../types/trip';
import { AIRPORTS } from './airports';

/**
 * 지도에 찍을 게 하나라도 있는지 빠르게 판단한다 — 좌표가 전혀 없으면
 * TripMap이 빈 회색 박스만 그리므로, 그 전에 안내 문구로 대체하기 위한 신호.
 * TripMap 내부 마커 생성 로직을 그대로 따르지 않고, 있는지 없는지만 본다.
 */
export function tripHasMapMarkers(trip: Trip | null | undefined): boolean {
    if (!trip) return false;

    const hasFlightPoint = (trip.flights || []).some((f) => {
        if (f.departureLat || f.arrivalLat) return true;
        const dep = AIRPORTS.find((a) => a.code === f.departureLocation);
        const arr = AIRPORTS.find((a) => a.code === f.arrivalLocation);
        return !!(dep || arr);
    });
    if (hasFlightPoint) return true;

    const hasAccommodationPoint = (trip.accommodation || []).some((a) => !!(a.lat && a.lng));
    if (hasAccommodationPoint) return true;

    const hasEventPoint = (trip.dailyTimeline || []).some((day) =>
        (day.events || []).some((e) => !!(e.location?.lat && e.location?.lng))
    );
    if (hasEventPoint) return true;

    const hasBucketListPoint = (trip.bucketList || []).some((b) => !!(b.place?.lat && b.place?.lng));
    return hasBucketListPoint;
}

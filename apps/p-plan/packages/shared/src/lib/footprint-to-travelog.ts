import { generateId } from '../types/common';
import type { FootprintActivity, ActivityPlace, TravelogPlace } from '../types/record';

const hhmm = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined
        : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * 발자취 장소 하나를 여행기 카드(TravelogPlace)로 복사한다 — 참조가 아니라 스냅샷.
 * "발자취에서 가져오기"는 원본을 그대로 옮기는 게 아니라 그 순간 값을 여행기에 박아넣는
 * 것이어야 한다(발자취가 나중에 다시 정리돼도 이미 쓴 여행기는 흔들리면 안 되므로).
 */
export function activityPlaceToTravelogPlace(
    place: ActivityPlace,
    fallbackDate: string,
    order: number,
): TravelogPlace {
    const name = place.name || '이름 없는 장소';
    return {
        id: `place_${generateId()}`,
        name,
        googlePlaceId: place.googlePlaceId,
        location: { name, lat: place.lat, lng: place.lng, address: place.address },
        visitDate: (place.arrivedAt || fallbackDate).slice(0, 10),
        startTime: hhmm(place.arrivedAt),
        endTime: hhmm(place.departedAt),
        photoUrls: place.photoUrls,
        order,
    };
}

/** 활동 하나(그 안의 장소 전부)를 여행기 카드들로 변환한다. */
export function activityToTravelogPlaces(activity: FootprintActivity, startOrder: number): TravelogPlace[] {
    return activity.places.map((place, i) =>
        activityPlaceToTravelogPlace(place, activity.startAt, startOrder + i),
    );
}

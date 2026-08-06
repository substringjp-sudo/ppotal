import { clusterByTimeAndDistance } from './footprint-clustering';
import { generateId } from '../types/common';
import type { FootprintPoint, FootprintActivity, FootprintActivityType, ActivityPlace } from '../types/record';

/**
 * FootprintPoint[] → 초기 FootprintActivity[] 자동 구간화.
 *
 * 활동 경계는 거리가 아니라 시간 간격으로만 나눈다 — 배회(wander)형 활동은 정의상
 * 넓은 공간을 이동하므로, 거리 기준으로 나누면 산책 하나가 여러 활동으로 쪼개져버린다.
 * 사용자는 이 자동 구간을 타임라인에서 드래그로 합치거나 나눌 수 있다(편집 UI 쪽 책임).
 */
export function seedActivitiesFromPoints(
    points: FootprintPoint[],
    opts: { maxGapHours?: number } = {},
): Array<Omit<FootprintActivity, 'id' | 'createdAt' | 'updatedAt'>> {
    if (points.length === 0) return [];
    const maxGapHours = opts.maxGapHours ?? 2;

    const clusters = clusterByTimeAndDistance(points, {
        maxGapHours,
        maxDistanceKm: Number.POSITIVE_INFINITY, // 거리로는 쪼개지 않는다
    });

    return clusters.map((cluster, order) => activityFromPointCluster(cluster, order));
}

function activityFromPointCluster(
    cluster: FootprintPoint[],
    order: number,
): Omit<FootprintActivity, 'id' | 'createdAt' | 'updatedAt'> {
    const sorted = [...cluster].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // 이름/체류 정보가 있으면 "장소"(정지), 없으면 "경로 샘플"(통과 지점).
    // 사진 소스는 전부 역지오코딩을 거쳐 이름이 붙으므로 항상 장소로만 잡힌다.
    const placePoints = sorted.filter((p) => p.placeName || p.googlePlaceId || p.departedAt);
    const tracePoints = sorted.filter((p) => !(p.placeName || p.googlePlaceId || p.departedAt));

    const places: ActivityPlace[] = placePoints.map((p) => ({
        id: generateId(),
        name: p.placeName,
        googlePlaceId: p.googlePlaceId,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        arrivedAt: p.timestamp,
        departedAt: p.departedAt,
        photoUrls: p.photoUrls,
        pointIds: [p.id],
    }));

    const path = tracePoints.length > 0
        ? tracePoints.map((p) => ({ lat: p.lat, lng: p.lng }))
        : undefined;

    const photoUrls = sorted.flatMap((p) => p.photoUrls || []);

    const type: FootprintActivityType =
        places.length === 0 && path ? 'transit' :
        places.length > 1 ? 'wander' :
        'visit';

    return {
        userId: first.userId,
        tripId: first.tripId,
        startAt: first.timestamp,
        endAt: last.departedAt || last.timestamp,
        order,
        type,
        places,
        path,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        source: first.source, // 한 클러스터는 보통 한 소스에서 옴(사진 일괄 업로드, PATHWALK 일괄 동기화 등)
        travelogIds: [],
    };
}

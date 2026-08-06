import { calculateDistance } from './geo-utils';

/**
 * 시간·거리 기준 클러스터링 — 발자취 소스(사진, 나중엔 PATHWALK)가 공통으로 쓰는 순수 함수.
 * 원래 사진 인테이크(travelogPhotoIntake.ts)에 있던 2시간/50m 클러스터링을 일반화했다.
 */
export interface TimedPoint {
    timestamp: string; // ISO
    lat?: number;
    lng?: number;
}

export interface ClusterOptions {
    maxGapHours?: number;
    maxDistanceKm?: number;
}

export function clusterByTimeAndDistance<T extends TimedPoint>(
    items: T[],
    opts: ClusterOptions = {},
): T[][] {
    const maxGapHours = opts.maxGapHours ?? 2;
    const maxDistanceKm = opts.maxDistanceKm ?? 0.05;

    const sorted = [...items].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const clusters: T[][] = [];
    let current: T[] = [];
    // 거리는 "직전 점"이 아니라 지금까지 클러스터의 평균 좌표(centroid)에 대해 잰다.
    // 직전 점과만 비교하면 한 걸음씩은 반경 안이어도 누적되면 클러스터 전체가
    // 서서히 멀리까지 드리프트해, 실제로는 몇 km 떨어진 지점들이 "같은 장소"로
    // 묶여버린다(연쇄 결합 문제).
    let sumLat = 0;
    let sumLng = 0;
    let coordCount = 0;

    const startCluster = (item: T) => {
        current = [item];
        if (item.lat != null && item.lng != null) {
            sumLat = item.lat; sumLng = item.lng; coordCount = 1;
        } else {
            sumLat = 0; sumLng = 0; coordCount = 0;
        }
    };

    sorted.forEach((item, idx) => {
        if (current.length === 0) {
            startCluster(item);
        } else {
            const last = current[current.length - 1];
            const gapHrs = (new Date(item.timestamp).getTime() - new Date(last.timestamp).getTime()) / 3_600_000;
            const distKm = (item.lat != null && item.lng != null && coordCount > 0)
                ? calculateDistance(item.lat, item.lng, sumLat / coordCount, sumLng / coordCount) : 0;
            if (gapHrs > maxGapHours || distKm > maxDistanceKm) {
                clusters.push(current);
                startCluster(item);
            } else {
                current.push(item);
                if (item.lat != null && item.lng != null) {
                    sumLat += item.lat; sumLng += item.lng; coordCount++;
                }
            }
        }
        if (idx === sorted.length - 1 && current.length > 0) clusters.push(current);
    });
    return clusters;
}

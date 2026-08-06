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
    sorted.forEach((item, idx) => {
        if (current.length === 0) {
            current.push(item);
        } else {
            const last = current[current.length - 1];
            const gapHrs = (new Date(item.timestamp).getTime() - new Date(last.timestamp).getTime()) / 3_600_000;
            const distKm = (item.lat != null && item.lng != null && last.lat != null && last.lng != null)
                ? calculateDistance(item.lat, item.lng, last.lat, last.lng) : 0;
            if (gapHrs > maxGapHours || distKm > maxDistanceKm) {
                clusters.push(current);
                current = [item];
            } else {
                current.push(item);
            }
        }
        if (idx === sorted.length - 1 && current.length > 0) clusters.push(current);
    });
    return clusters;
}

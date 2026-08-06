'use client';

import ExifReader from 'exifreader';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    storage,
    generateId,
    batchReverseGeocodeNames,
    clusterByTimeAndDistance,
    seedActivitiesFromPoints,
    saveFootprintPoints,
    saveFootprintActivities,
    type TravelogPlace,
    type FootprintPoint,
} from '@pplaner/shared';

/**
 * 사진 업로드 → 클러스터링 → 장소 카드 파이프라인.
 *
 * 기존 에디터는 사진을 `URL.createObjectURL(file)`로만 다뤄 Storage에 올라가지 않는
 * blob URL을 그대로 photoUrls에 저장했다 — 새로고침·공유·스팟피드 전부에서 깨진다.
 * 이 모듈은 실제 Storage 업로드로 교체하고, 그 결과를 바로 TravelogPlace[]로 만든다
 * (타임라인을 거치지 않는다 — 카드 스트림 에디터는 장소를 직접 쓴다).
 *
 * 같은 클러스터링 결과를 발자취(FootprintPoint/FootprintActivity)에도 그대로 심는다 —
 * 여행기에 안 쓴 사진도 "다녀왔다"는 사실 자체는 발자취에 남아야 하니까. 이 부분은
 * 곁가지 기록이라 실패해도 여행기 작성 자체는 막지 않는다(로그만 남기고 무시).
 */

interface RawPhoto {
    file: File;
    lat?: number;
    lng?: number;
    timestamp: string; // ISO
}

function parseGPS(values: number[] | undefined, ref?: string): number | undefined {
    if (!values || values.length < 3) return undefined;
    let res = values[0] + values[1] / 60 + values[2] / 3600;
    if (ref === 'S' || ref === 'W') res = -res;
    return res;
}

async function readPhotoExif(file: File): Promise<{ lat?: number; lng?: number; timestamp: string }> {
    try {
        const tags = await ExifReader.load(file);
        let lat: number | undefined;
        let lng: number | undefined;
        if (tags['GPSLatitude'] && tags['GPSLongitude']) {
            const latRef = (tags['GPSLatitudeRef'] as any)?.value?.[0];
            const lngRef = (tags['GPSLongitudeRef'] as any)?.value?.[0];
            lat = parseGPS(tags['GPSLatitude'].value as any, latRef);
            lng = parseGPS(tags['GPSLongitude'].value as any, lngRef);
        }
        let timestamp = new Date(file.lastModified || Date.now()).toISOString();
        if (tags['DateTimeOriginal']) {
            const dateStr = tags['DateTimeOriginal'].description as string;
            const [datePart, timePart] = dateStr.split(' ');
            const parsed = new Date(`${datePart.replace(/:/g, '-')}T${timePart}`);
            if (!isNaN(parsed.getTime())) timestamp = parsed.toISOString();
        }
        return { lat, lng, timestamp };
    } catch {
        return { timestamp: new Date(file.lastModified || Date.now()).toISOString() };
    }
}

/** Firebase Storage에 실제로 올리고 영구 다운로드 URL을 받는다. */
export async function uploadTravelogPhoto(file: File, userId: string, travelogId: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8);
    const path = `users/${userId}/travelogs/${travelogId}/${generateId()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export interface IntakeProgress {
    stage: 'uploading' | 'clustering' | 'geocoding' | 'done';
    done: number;
    total: number;
}

/**
 * 사진 파일들을 받아 업로드 + 시간/거리 클러스터링 + 역지오코딩까지 마친
 * 장소 카드(TravelogPlace) 배열을 돌려준다. 사진이 하나도 위치 정보가 없으면
 * 이름 없는 단일 장소 카드로 묶는다.
 *
 * 곁가지로, 같은 클러스터를 FootprintPoint/FootprintActivity로도 저장한다(실패해도 무시).
 */
export async function intakePhotosToPlaces(
    files: File[],
    userId: string,
    travelogId: string,
    startOrder: number,
    onProgress?: (p: IntakeProgress) => void,
): Promise<TravelogPlace[]> {
    const total = files.length;
    onProgress?.({ stage: 'uploading', done: 0, total });

    // 1. EXIF 읽기 + Storage 업로드를 파일별로 병렬 수행
    let uploaded = 0;
    const photos: (RawPhoto & { url: string })[] = await Promise.all(
        files.map(async (file) => {
            const [exif, url] = await Promise.all([
                readPhotoExif(file),
                uploadTravelogPhoto(file, userId, travelogId),
            ]);
            uploaded++;
            onProgress?.({ stage: 'uploading', done: uploaded, total });
            return { file, ...exif, url };
        }),
    );

    // 2. 시간(2시간)/거리(50m) 기준 클러스터링 — 발자취와 공유하는 순수 함수
    onProgress?.({ stage: 'clustering', done: 0, total: 1 });
    const clusters = clusterByTimeAndDistance(photos);

    // 3. 클러스터 대표 좌표 → 배치 역지오코딩
    onProgress?.({ stage: 'geocoding', done: 0, total: clusters.length });
    const centroids = clusters.map((cluster) => {
        const withCoords = cluster.filter((p) => p.lat != null && p.lng != null);
        if (withCoords.length === 0) return undefined;
        const lat = withCoords.reduce((s, p) => s + p.lat!, 0) / withCoords.length;
        const lng = withCoords.reduce((s, p) => s + p.lng!, 0) / withCoords.length;
        return { lat, lng };
    });
    const validCentroids = centroids.filter((c): c is { lat: number; lng: number } => !!c && !Number.isNaN(c.lat) && !Number.isNaN(c.lng));
    const geoResults = validCentroids.length ? await batchReverseGeocodeNames(validCentroids) : [];

    let geoIdx = 0;
    const clusterNames: (string | undefined)[] = [];
    const places: TravelogPlace[] = clusters.map((cluster, i) => {
        const centroid = centroids[i];
        let name: string | undefined;
        if (centroid && !Number.isNaN(centroid.lat) && !Number.isNaN(centroid.lng)) {
            const geo = geoResults[geoIdx++];
            name = geo?.city || geo?.prefecture || geo?.country;
        }
        clusterNames.push(name);
        const displayName = name || '이름 없는 장소';
        const first = cluster[0];
        const last = cluster[cluster.length - 1];
        const hhmm = (iso: string) => {
            const d = new Date(iso);
            return isNaN(d.getTime()) ? undefined
                : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        const startTime = hhmm(first.timestamp);
        const endTime = hhmm(last.timestamp);
        onProgress?.({ stage: 'geocoding', done: i + 1, total: clusters.length });
        return {
            id: generateId(),
            name: displayName,
            location: centroid ? { name: displayName, lat: centroid.lat, lng: centroid.lng } : undefined,
            visitDate: first.timestamp.slice(0, 10),
            startTime,
            endTime: endTime !== startTime ? endTime : undefined,
            photoUrls: cluster.map((p) => p.url),
            order: startOrder + i,
        };
    });

    onProgress?.({ stage: 'done', done: total, total });

    // 발자취 저장은 곁가지 — 실패해도 여행기 작성 흐름을 막지 않는다.
    persistFootprint(clusters, centroids, clusterNames, userId).catch((err) => {
        console.error('[travelogPhotoIntake] Failed to persist footprint (non-fatal):', err);
    });

    return places;
}

async function persistFootprint(
    clusters: (RawPhoto & { url: string })[][],
    centroids: ({ lat: number; lng: number } | undefined)[],
    names: (string | undefined)[],
    userId: string,
): Promise<void> {
    const pointInputs: Omit<FootprintPoint, 'id' | 'createdAt'>[] = [];
    clusters.forEach((cluster, i) => {
        const centroid = centroids[i];
        if (!centroid) return; // 좌표 없는 사진은 발자취 점을 만들지 않는다
        const first = cluster[0];
        const last = cluster[cluster.length - 1];
        pointInputs.push({
            userId,
            lat: centroid.lat,
            lng: centroid.lng,
            placeName: names[i],
            timestamp: first.timestamp,
            departedAt: last.timestamp !== first.timestamp ? last.timestamp : undefined,
            photoUrls: cluster.map((p) => p.url),
            source: 'photo',
        });
    });
    if (pointInputs.length === 0) return;

    const points = await saveFootprintPoints(pointInputs);
    const activityInputs = seedActivitiesFromPoints(points);
    await saveFootprintActivities(activityInputs);
}

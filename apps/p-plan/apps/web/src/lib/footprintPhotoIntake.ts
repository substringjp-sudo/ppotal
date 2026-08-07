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
    type FootprintPoint,
    type FootprintActivity,
} from '@pplaner/shared';

/**
 * 사진 → 발자취(FootprintPoint/FootprintActivity) 직행 파이프라인.
 * travelogPhotoIntake.ts와 EXIF/클러스터링/역지오코딩 로직은 같지만, 여행기를 거치지
 * 않고 곧장 발자취에 쌓는다 — "그냥 사진만 넣기"가 여행기 쓰기보다 훨씬 가벼운 진입이어야
 * 더 많은 사람이 쓸 수 있다는 판단.
 */

interface RawPhoto {
    file: File;
    lat?: number;
    lng?: number;
    timestamp: string;
}

function parseGPS(values: number[] | undefined, ref?: string): number | undefined {
    if (!values || values.length < 3) return undefined;
    let res = values[0] + values[1] / 60 + values[2] / 3600;
    if (ref === 'S' || ref === 'W') res = -res;
    return res;
}

/**
 * EXIF DateTimeOriginal은 시간대가 없는 '현지 벽시계' 문자열이라, 그냥 new Date(...)로
 * 파싱하면 업로더 브라우저의 시간대로 해석돼 몇 시간이 밀린다(travelogPhotoIntake.ts의
 * PLAN-3 수정과 동일한 문제). 이 경로는 여행 컨텍스트(tzOffsetMinutes)가 없어 폴백 오프셋을
 * 못 받지만, 사진 자체의 OffsetTimeOriginal 태그(EXIF 2.31+)가 있으면 그것만으로도 교정된다.
 */
function parseExifLocalTime(dateStr: string, offsetMinutes?: number): Date | undefined {
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart || !timePart) return undefined;
    const iso = `${datePart.replace(/:/g, '-')}T${timePart}`;
    if (offsetMinutes == null) {
        const naive = new Date(iso);
        return isNaN(naive.getTime()) ? undefined : naive;
    }
    const sign = offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const withZone = new Date(`${iso}${sign}${hh}:${mm}`);
    return isNaN(withZone.getTime()) ? undefined : withZone;
}

/** "+09:00" / "+0900" → 540 */
function parseOffsetTag(value?: string): number | undefined {
    if (!value) return undefined;
    const m = value.trim().match(/^([+-])(\d{2}):?(\d{2})$/);
    if (!m) return undefined;
    const mins = Number(m[2]) * 60 + Number(m[3]);
    return m[1] === '-' ? -mins : mins;
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
            const offset = parseOffsetTag((tags as any)['OffsetTimeOriginal']?.description);
            const parsed = parseExifLocalTime(tags['DateTimeOriginal'].description as string, offset);
            if (parsed) timestamp = parsed.toISOString();
        }
        return { lat, lng, timestamp };
    } catch {
        return { timestamp: new Date(file.lastModified || Date.now()).toISOString() };
    }
}

async function uploadFootprintPhoto(file: File, userId: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8);
    const path = `users/${userId}/footprint/${generateId()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export interface FootprintIntakeProgress {
    stage: 'uploading' | 'clustering' | 'geocoding' | 'saving' | 'done';
    done: number;
    total: number;
}

/** 사진들을 업로드하고 FootprintPoint/FootprintActivity로 저장한다. */
export async function intakePhotosToFootprint(
    files: File[],
    userId: string,
    onProgress?: (p: FootprintIntakeProgress) => void,
): Promise<FootprintActivity[]> {
    const total = files.length;
    onProgress?.({ stage: 'uploading', done: 0, total });

    let uploaded = 0;
    const photos: (RawPhoto & { url: string })[] = await Promise.all(
        files.map(async (file) => {
            const [exif, url] = await Promise.all([
                readPhotoExif(file),
                uploadFootprintPhoto(file, userId),
            ]);
            uploaded++;
            onProgress?.({ stage: 'uploading', done: uploaded, total });
            return { file, ...exif, url };
        }),
    );

    onProgress?.({ stage: 'clustering', done: 0, total: 1 });
    const clusters = clusterByTimeAndDistance(photos);

    onProgress?.({ stage: 'geocoding', done: 0, total: clusters.length });
    const centroids = clusters.map((cluster) => {
        const withCoords = cluster.filter((p) => p.lat != null && p.lng != null);
        if (withCoords.length === 0) return undefined;
        const lat = withCoords.reduce((s, p) => s + p.lat!, 0) / withCoords.length;
        const lng = withCoords.reduce((s, p) => s + p.lng!, 0) / withCoords.length;
        return { lat, lng };
    });
    const validCentroids = centroids.filter((c): c is { lat: number; lng: number } => !!c);
    const geoResults = validCentroids.length ? await batchReverseGeocodeNames(validCentroids) : [];

    let geoIdx = 0;
    const pointInputs: Omit<FootprintPoint, 'id' | 'createdAt'>[] = [];
    clusters.forEach((cluster, i) => {
        const centroid = centroids[i];
        onProgress?.({ stage: 'geocoding', done: i + 1, total: clusters.length });
        if (!centroid) return; // 좌표 없는 사진은 발자취 점을 만들지 않는다

        const geo = geoResults[geoIdx++];
        const placeName = geo?.city || geo?.prefecture || geo?.country;
        const first = cluster[0];
        const last = cluster[cluster.length - 1];
        pointInputs.push({
            userId,
            lat: centroid.lat,
            lng: centroid.lng,
            placeName,
            timestamp: first.timestamp,
            departedAt: last.timestamp !== first.timestamp ? last.timestamp : undefined,
            photoUrls: cluster.map((p) => p.url),
            source: 'photo',
        });
    });

    onProgress?.({ stage: 'saving', done: 0, total: 1 });
    if (pointInputs.length === 0) {
        onProgress?.({ stage: 'done', done: total, total });
        return [];
    }
    const points = await saveFootprintPoints(pointInputs);
    const activityInputs = seedActivitiesFromPoints(points);
    const activities = await saveFootprintActivities(activityInputs);

    onProgress?.({ stage: 'done', done: total, total });
    return activities;
}

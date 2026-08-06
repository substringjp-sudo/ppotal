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
    matchPlannedPlace,
    type TravelogPlace,
    type FootprintPoint,
    type TripPriors,
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

/**
 * EXIF DateTimeOriginal은 시간대가 없는 '현지 벽시계' 문자열이다.
 * 그냥 `new Date("2026-08-03T09:12:00")`로 파싱하면 **업로더 브라우저의 시간대**로
 * 해석돼, 한국에서 태국(UTC+7) 사진을 올리면 09:12가 07:12(UTC)가 아니라 00:12(UTC)로
 * 저장돼 두 시간이 밀린다. 그러면 시각 기반 POI 신호(점심/저녁)와 클러스터 경계가 같이 틀어진다.
 *
 * 우선순위: OffsetTimeOriginal 태그(EXIF 2.31+) → 호출부가 알려준 여행 현지 오프셋 → 기존 동작.
 */
function parseExifLocalTime(dateStr: string, offsetMinutes?: number): Date | undefined {
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart || !timePart) return undefined;
    const iso = `${datePart.replace(/:/g, '-')}T${timePart}`;
    if (offsetMinutes == null) {
        const naive = new Date(iso);           // 폴백: 예전 그대로(브라우저 로컬 해석)
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

async function readPhotoExif(
    file: File,
    fallbackOffsetMinutes?: number,
): Promise<{ lat?: number; lng?: number; timestamp: string }> {
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
            const offset = parseOffsetTag((tags as any)['OffsetTimeOriginal']?.description)
                ?? fallbackOffsetMinutes;
            const parsed = parseExifLocalTime(tags['DateTimeOriginal'].description as string, offset);
            if (parsed) timestamp = parsed.toISOString();
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

export interface IntakeOptions {
    /**
     * 이 여행기가 속한 여행의 계획 사전 정보.
     * 있으면 장소 이름을 계획에서 바로 가져오고 EXIF 시각을 현지 시간대로 해석한다.
     * 없으면(계획 없이 사진만 올린 경우) 지금까지와 똑같이 동작한다 — 전제가 아니라 증폭기.
     */
    priors?: TripPriors;
    /** 여행 현지 UTC 오프셋(분). EXIF에 OffsetTimeOriginal이 없을 때만 쓰인다. */
    tzOffsetMinutes?: number;
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
    options: IntakeOptions = {},
): Promise<TravelogPlace[]> {
    const total = files.length;
    onProgress?.({ stage: 'uploading', done: 0, total });

    // 1. EXIF 읽기 + Storage 업로드를 파일별로 병렬 수행
    let uploaded = 0;
    const photos: (RawPhoto & { url: string })[] = await Promise.all(
        files.map(async (file) => {
            const [exif, url] = await Promise.all([
                readPhotoExif(file, options.tzOffsetMinutes),
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
    // 3-a. 계획에 적힌 장소가 이 좌표 위에 있으면 그 이름을 먼저 쓴다.
    // 역지오코딩은 잘해야 동네 이름("오사카시")을 주지만, 계획에는 사용자가 직접
    // "오사카성"이라고 적어놨다. 계획이 없으면 빈 배열이라 아래 폴백으로 그냥 흘러간다.
    const plannedPlaces = options.priors?.plannedPlaces || [];
    const plannedHits = clusters.map((cluster, i) => {
        const c = centroids[i];
        if (!c || Number.isNaN(c.lat) || Number.isNaN(c.lng) || plannedPlaces.length === 0) return undefined;
        return matchPlannedPlace(plannedPlaces, {
            lat: c.lat, lng: c.lng, date: cluster[0].timestamp.slice(0, 10),
        });
    });

    // 3-b. 역지오코딩은 계획과 맞은 클러스터에도 그대로 돌린다.
    // 표시 이름은 계획에서 가져오더라도(예: "오사카성"), 발자취의 **지역**은 따로
    // 필요하기 때문이다 — 지역별 누적("도쿄 4번 방문")은 도시명으로 묶여야 한다.
    const needGeo: { idx: number; lat: number; lng: number }[] = [];
    centroids.forEach((c, i) => {
        if (!c || Number.isNaN(c.lat) || Number.isNaN(c.lng)) return;
        needGeo.push({ idx: i, lat: c.lat, lng: c.lng });
    });
    const geoResults = needGeo.length
        ? await batchReverseGeocodeNames(needGeo.map((g) => ({ lat: g.lat, lng: g.lng })))
        : [];
    const regionByIdx = new Map<number, string | undefined>();
    needGeo.forEach((g, k) => {
        const geo = geoResults[k];
        regionByIdx.set(g.idx, geo?.city || geo?.prefecture || geo?.country);
    });

    const clusterNames: (string | undefined)[] = [];
    const clusterRegions: (string | undefined)[] = [];
    const places: TravelogPlace[] = clusters.map((cluster, i) => {
        const centroid = centroids[i];
        const hit = plannedHits[i];
        const region = regionByIdx.get(i);
        // 계획에 적힌 이름이 있으면 그게 정확하다. 없으면 역지오코딩이 준 동네 이름으로 폴백.
        const name = hit?.name ?? region;
        clusterNames.push(name);
        clusterRegions.push(region);
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
            // 계획의 일정 항목은 구글 장소 ID까지 갖고 있는 경우가 있다 —
            // 그러면 "확인" 배지 없이 처음부터 확정된 장소로 시작한다.
            googlePlaceId: hit?.googlePlaceId,
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
    persistFootprint(clusters, centroids, clusterNames, clusterRegions, userId, {
        tripId: options.priors?.tripId,
        travelogId,
    }).catch((err) => {
        console.error('[travelogPhotoIntake] Failed to persist footprint (non-fatal):', err);
    });

    return places;
}

async function persistFootprint(
    clusters: (RawPhoto & { url: string })[][],
    centroids: ({ lat: number; lng: number } | undefined)[],
    names: (string | undefined)[],
    regions: (string | undefined)[],
    userId: string,
    link: { tripId?: string; travelogId?: string } = {},
): Promise<void> {
    const pointInputs: Omit<FootprintPoint, 'id' | 'createdAt'>[] = [];
    clusters.forEach((cluster, i) => {
        const centroid = centroids[i];
        if (!centroid) return; // 좌표 없는 사진은 발자취 점을 만들지 않는다
        const first = cluster[0];
        const last = cluster[cluster.length - 1];
        pointInputs.push({
            userId,
            tripId: link.tripId,
            lat: centroid.lat,
            lng: centroid.lng,
            placeName: names[i],
            region: regions[i],
            timestamp: first.timestamp,
            departedAt: last.timestamp !== first.timestamp ? last.timestamp : undefined,
            photoUrls: cluster.map((p) => p.url),
            source: 'photo',
        });
    });
    if (pointInputs.length === 0) return;

    const points = await saveFootprintPoints(pointInputs);
    const activityInputs = seedActivitiesFromPoints(points).map((a) => ({
        ...a,
        tripId: link.tripId,
        // 이 사진들이 이미 여행기로 들어갔다는 사실을 남긴다 —
        // "여행기 안 쓴 기록"을 골라내려면 쓴 것과 안 쓴 것이 구분돼야 한다.
        travelogIds: link.travelogId ? [link.travelogId] : undefined,
    }));
    await saveFootprintActivities(activityInputs);
}

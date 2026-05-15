import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Trip, TripEvent, DESIGN_TOKENS } from '@pplaner/shared';
import { format } from 'date-fns';
import { saveRecordedPhoto } from '../lib/database';
import { SQLiteGeodataProvider } from '../lib/sqlite-geodata-provider';

// 지오데이터 프로바이더 싱글톤 인스턴스
const geodataProvider = new SQLiteGeodataProvider();
let isGeodataInitialized = false;

const initGeodataIfNeeded = async () => {
    if (!isGeodataInitialized) {
        await geodataProvider.initialize();
        isGeodataInitialized = true;
    }
};

/**
 * 카메라 또는 갤러리 접근 권한 요청
 */
export const requestPhotoPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
    
    return cameraStatus === 'granted' && libraryStatus === 'granted' && mediaLibraryStatus === 'granted';
};

/**
 * 사진 선택 및 EXIF 메타데이터 추출
 */
export const pickAndProcessPhoto = async (tripId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: true, // EXIF 메타데이터 포함
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
    }

    const asset = result.assets[0];
    const exif = asset.exif;
    
    // EXIF에서 촬영 시간 및 위치 추출
    // Note: exif 필드는 플랫폼마다 차이가 있을 수 있음
    let timestamp = Date.now();
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (exif) {
        // DateTimeOriginal: "YYYY:MM:DD HH:MM:SS"
        if (exif.DateTimeOriginal) {
            const dateStr = (exif.DateTimeOriginal as string).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            timestamp = new Date(dateStr).getTime();
        }
        
        if (exif.GPSLatitude && exif.GPSLongitude) {
            latitude = exif.GPSLatitude;
            longitude = exif.GPSLongitude;
        }
    }

    // SQLite에 사진 메타데이터 기록
    saveRecordedPhoto({
        tripId,
        uri: asset.uri,
        timestamp,
        latitude,
        longitude,
        type: 'photo',
    });

    return { uri: asset.uri, timestamp, latitude, longitude };
};

/**
 * 여러 장의 사진을 선택하고 메타데이터를 일괄 분석합니다.
 */
export const pickMultiplePhotosAndProcess = async () => {
    const hasPermission = await requestPhotoPermissions();
    if (!hasPermission) {
        throw new Error('사진첩 접근 권한이 필요합니다.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
    }

    const processedAssets = result.assets.map(asset => {
        const exif = asset.exif;
        let timestamp = asset.creationTime || Date.now();
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (exif) {
            if (exif.DateTimeOriginal) {
                const dateStr = (exif.DateTimeOriginal as string).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                timestamp = new Date(dateStr).getTime();
            }
            if (exif.GPSLatitude && exif.GPSLongitude) {
                latitude = exif.GPSLatitude;
                longitude = exif.GPSLongitude;
            }
        }

        return {
            uri: asset.uri,
            timestamp,
            latitude,
            longitude,
            width: asset.width,
            height: asset.height
        };
    }).sort((a, b) => a.timestamp - b.timestamp);

    return processedAssets;
};

/**
 * 촬영 시간 기반 타임라인 이벤트 매칭 추천
 */
export const matchPhotoToTimeline = (photoTimestamp: number, trip: Trip): TripEvent | null => {
    const photoDate = new Date(photoTimestamp);
    const photoDateStr = format(photoDate, 'yyyy-MM-dd');
    const photoTimeStr = format(photoDate, 'HH:mm');

    // 해당 날짜의 일정을 찾음
    const dailyPlan = trip.dailyTimeline.find(plan => plan.date === photoDateStr);
    if (!dailyPlan || !dailyPlan.events) return null;

    // 시간이 겹치는 이벤트를 찾음 (시작 시간 ~ 다음 이벤트 시작 전까지)
    const sortedEvents = [...dailyPlan.events].sort((a, b) => (a.startTime || '00:00') > (b.startTime || '00:00') ? 1 : -1);
    
    for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        if (!event.startTime) continue;

        const nextEvent = sortedEvents[i + 1];
        if (photoTimeStr >= event.startTime) {
            if (!nextEvent || !nextEvent.startTime || photoTimeStr < nextEvent.startTime) {
                return event;
            }
        }
    }

    return null;
};

/**
 * 특정 기간의 사진을 스캔하고, 시간/거리 기반으로 클러스터링하여 여행 이벤트를 제안합니다.
 * 서버 호출 없이 기기 내에서 모든 분석이 이루어집니다.
 */
export const scanAndClusterPhotos = async (
    startDate: string,
    endDate: string
): Promise<Partial<TripEvent>[]> => {
    const hasPermission = await requestPhotoPermissions();
    if (!hasPermission) throw new Error('사진첩 접근 권한이 필요합니다.');

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

    // 1. 기간 내 사진 메타데이터 긁어오기 (최대 500개)
    const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        createdAfter: startTimestamp,
        createdBefore: endTimestamp,
        sortBy: ['creationTime'],
        first: 500,
    });

    const clusters: { assets: MediaLibrary.AssetInfo[]; center: { lat: number, lng: number } }[] = [];
    const TIME_THRESHOLD = 30 * 60 * 1000; // 30분
    const DIST_THRESHOLD = 0.005; // 약 500m (좌표 차이 기준 단순화)

    for (const asset of assets) {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        if (!info.location) continue;

        let matched = false;
        // 기존 클러스터와 시간/거리가 가까운지 확인
        for (const cluster of clusters) {
            const lastAsset = cluster.assets[cluster.assets.length - 1];
            const timeDiff = Math.abs(info.creationTime - lastAsset.creationTime);
            const distDiff = Math.sqrt(
                Math.pow(info.location.latitude - cluster.center.lat, 2) + 
                Math.pow(info.location.longitude - cluster.center.lng, 2)
            );

            if (timeDiff < TIME_THRESHOLD && distDiff < DIST_THRESHOLD) {
                cluster.assets.push(info);
                matched = true;
                break;
            }
        }

        if (!matched) {
            clusters.push({
                assets: [info],
                center: { lat: info.location.latitude, lng: info.location.longitude }
            });
        }
    }

    // 2. 클러스터를 TripEvent로 변환
    await initGeodataIfNeeded();
    
    const suggestedEvents: Partial<TripEvent>[] = [];
    for (const cluster of clusters) {
        const firstPhoto = cluster.assets[0];
        
        // 로컬 지오데이터에서 지명 조회 (오프라인)
        const regionInfo = await geodataProvider.lookup(cluster.center.lat, cluster.center.lng);
        const placeName = regionInfo 
            ? `${regionInfo.cityName || regionInfo.prefectureName || regionInfo.countryName}`
            : '알 수 없는 장소';

        suggestedEvents.push({
            title: `${placeName} 방문 (${cluster.assets.length}장의 사진)`,
            startTime: format(new Date(firstPhoto.creationTime), 'HH:mm'),
            location: {
                name: placeName,
                latitude: cluster.center.lat,
                longitude: cluster.center.lng,
            },
            memo: `${cluster.assets.length}장의 사진을 기반으로 자동 분석되었습니다.`,
            imageUrls: cluster.assets.slice(0, 4).map(a => a.localUri || a.uri),
        });
    }

    return suggestedEvents;
};

export const autoSyncTripPhotos = async (tripId: string, startDate: string, endDate: string) => {
    try {
        const suggestedEvents = await scanAndClusterPhotos(startDate, endDate);
        console.log(`PPLANER: Generated ${suggestedEvents.length} suggested events from photos.`);
        
        // TODO: suggestedEvents를 SQLite의 trip_events 테이블에 즉시 저장
        // 현재는 생성된 이벤트 개수만 반환하여 위저드 진행
        return suggestedEvents.length;
    } catch (error) {
        console.error('PPLANER: Failed to auto-sync photos:', error);
        return 0;
    }
};

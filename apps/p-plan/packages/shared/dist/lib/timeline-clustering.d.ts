import { RegionIds } from '../types/common';
export interface PhotoMetadata {
    id: string;
    lat: number;
    lng: number;
    timestamp: number;
    url?: string;
}
export interface ClusteredLocation {
    centerLat: number;
    centerLng: number;
    startTime: number;
    endTime: number;
    photoIds: string[];
    mainPhotoUrl?: string;
    suggestedTitle: string;
    regionIds?: RegionIds;
}
/**
 * DBSCAN 스타일의 단순 거리/시간 기반 클러스터링 알고리즘
 * @param photos 사진 메타데이터 목록
 * @param maxDistanceMeter 같은 장소로 간주할 최대 거리 (기본값 200m)
 * @param maxTimeGapMs 같은 방문으로 간주할 최대 시간 간격 (기본값 2시간)
 */
export declare function clusterPhotos(photos: PhotoMetadata[], maxDistanceMeter?: number, maxTimeGapMs?: number): ClusteredLocation[];

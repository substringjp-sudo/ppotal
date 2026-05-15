"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterPhotos = clusterPhotos;
/**
 * DBSCAN 스타일의 단순 거리/시간 기반 클러스터링 알고리즘
 * @param photos 사진 메타데이터 목록
 * @param maxDistanceMeter 같은 장소로 간주할 최대 거리 (기본값 200m)
 * @param maxTimeGapMs 같은 방문으로 간주할 최대 시간 간격 (기본값 2시간)
 */
function clusterPhotos(photos, maxDistanceMeter = 50, maxTimeGapMs = 2 * 60 * 60 * 1000) {
    if (photos.length === 0)
        return [];
    // 시간을 기준으로 정렬
    const sortedPhotos = [...photos].sort((a, b) => a.timestamp - b.timestamp);
    const clusters = [];
    let currentCluster = [sortedPhotos[0]];
    for (let i = 1; i < sortedPhotos.length; i++) {
        const prev = sortedPhotos[i - 1];
        const curr = sortedPhotos[i];
        // 대략적인 거리 계산 (Haversine 공식의 단순화 버전)
        const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        const timeGap = curr.timestamp - prev.timestamp;
        // 거리와 시간 차이가 임계값 이내면 같은 클러스터로 유지
        if (distance <= maxDistanceMeter && timeGap <= maxTimeGapMs) {
            currentCluster.push(curr);
        }
        else {
            // 새로운 클러스터 시작
            clusters.push(finalizeCluster(currentCluster));
            currentCluster = [curr];
        }
    }
    clusters.push(finalizeCluster(currentCluster));
    return clusters;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 지구 반경 (m)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function finalizeCluster(photos) {
    const avgLat = photos.reduce((sum, p) => sum + p.lat, 0) / photos.length;
    const avgLng = photos.reduce((sum, p) => sum + p.lng, 0) / photos.length;
    return {
        centerLat: avgLat,
        centerLng: avgLng,
        startTime: photos[0].timestamp,
        endTime: photos[photos.length - 1].timestamp,
        photoIds: photos.map(p => p.id),
        mainPhotoUrl: photos[0].url,
        suggestedTitle: '알 수 없는 장소'
    };
}

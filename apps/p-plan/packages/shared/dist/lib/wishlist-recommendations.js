"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendedWishlistItems = getRecommendedWishlistItems;
const geo_utils_1 = require("./geo-utils");
/**
 * 여행 정보와 위시리스트 항목들을 비교하여 추천 순위가 포함된 목록을 반환합니다.
 */
function getRecommendedWishlistItems(wishlist, trip) {
    const { center, regions } = trip.locations;
    const recommendations = [];
    wishlist.forEach(item => {
        let reason = 'none';
        let distance;
        // 1. ID 매칭 확인 (엄격한 계층형 ID 비교)
        const inRegion = regions?.some(tr => (tr.type === 'country' && item.place?.countryId === tr.id) ||
            (tr.type === 'prefecture' && item.place?.prefectureId === tr.id) ||
            (tr.type === 'city' && item.place?.cityId === tr.id));
        if (inRegion) {
            reason = 'in_region';
        }
        // 2. 물리적 거리 확인 (위도/경도가 있는 경우)
        if (item.place?.lat && item.place?.lng && center?.lat && center?.lng) {
            distance = (0, geo_utils_1.calculateDistance)(center.lat, center.lng, item.place.lat, item.place.lng);
            // 50km 이내면 가까운 곳으로 간주
            if (distance < 50) {
                if (reason === 'none') {
                    reason = 'nearby';
                }
            }
        }
        recommendations.push({ item, reason, distance });
    });
    // 정렬: 지역 내 항목 -> 가까운 항목(거리순) -> 기타
    return recommendations.sort((a, b) => {
        const priority = { in_region: 0, nearby: 1, none: 2 };
        if (priority[a.reason] !== priority[b.reason]) {
            return priority[a.reason] - priority[b.reason];
        }
        if (a.reason === 'nearby' && b.reason === 'nearby') {
            return (a.distance || 0) - (b.distance || 0);
        }
        return 0;
    });
}

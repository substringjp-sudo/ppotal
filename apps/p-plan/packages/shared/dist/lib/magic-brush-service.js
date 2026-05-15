"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlacesInPolygon = searchPlacesInPolygon;
/// <reference types="@types/google.maps" />
const geo_utils_1 = require("./geo-utils");
const utils_1 = require("./utils");
/**
 * 폴리곤 영역 내의 장소들을 검색합니다.
 */
async function searchPlacesInPolygon(path, placesService) {
    if (!(0, utils_1.isGoogleMapsReady)(['geometry', 'places'])) {
        console.warn('Google Maps API not ready for Magic Brush');
        return [];
    }
    if (path.length < 3)
        return [];
    // 1. 폴리곤의 중심점과 반경 계산
    const bounds = new google.maps.LatLngBounds();
    path.forEach(pos => bounds.extend(pos));
    const center = bounds.getCenter();
    // 북동쪽 코너와의 거리를 반경으로 사용 (영역을 모두 포함하도록)
    const ne = bounds.getNorthEast();
    const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
    // 2. Google Places Nearby Search 수행
    const request = {
        location: center,
        radius: Math.min(radius, 50000), // 최대 50km 제한
        type: 'tourist_attraction', // 기본값으로 관광 명소 검색
    };
    return new Promise((resolve, reject) => {
        placesService.nearbySearch(request, (results, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    resolve([]);
                }
                else {
                    reject(new Error(`Places Search failed: ${status}`));
                }
                return;
            }
            // 3. 폴리곤 내부에 있는지 필터링
            const geoPolygon = [path.map(p => [p.lng, p.lat])];
            const filteredResults = results
                .filter(place => {
                if (!place.geometry?.location)
                    return false;
                const point = [place.geometry.location.lng(), place.geometry.location.lat()];
                return (0, geo_utils_1.isPointInPolygon)(point, geoPolygon);
            })
                .map(place => ({
                placeId: place.place_id,
                name: place.name,
                address: place.vicinity || '',
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                rating: place.rating,
                userRatingsTotal: place.user_ratings_total,
                types: place.types || [],
                photos: place.photos?.map((p) => p.getUrl()),
                priceLevel: place.price_level,
                openingHours: place.opening_hours ? {
                    openNow: place.opening_hours.isOpen()
                } : undefined
            }));
            resolve(filteredResults);
        });
    });
}

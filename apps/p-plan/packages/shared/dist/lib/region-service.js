"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = exports.checkIsOverseas = exports.resolveRegionIdsFromLocation = exports.geocode = exports.extractLocationComponents = exports.resolveRegionIdsFromPlace = exports.getRegionNamesByIds = exports.reverseGeocodeIds = exports.reverseGeocodeNames = exports.batchReverseGeocodeNames = exports.batchReverseGeocodeIds = exports.setSearchRegionsHandler = exports.setReverseGeocodeHandler = void 0;
const airports_1 = require("./airports");
const utils_1 = require("./utils");
/**
 * 서버 사이드 지능형 기능 핸들러
 */
let reverseGeocodeHandler = null;
let batchReverseGeocodeHandler = null;
let searchRegionsHandler = null;
const setReverseGeocodeHandler = (handler, batchHandler) => {
    reverseGeocodeHandler = handler;
    if (batchHandler) {
        batchReverseGeocodeHandler = batchHandler;
    }
};
exports.setReverseGeocodeHandler = setReverseGeocodeHandler;
const setSearchRegionsHandler = (handler) => {
    searchRegionsHandler = handler;
};
exports.setSearchRegionsHandler = setSearchRegionsHandler;
/**
 * [MIGRATED] 서버 사이드 지역 검색 수행
 */
const searchRegions = async (query) => {
    if (searchRegionsHandler) {
        try {
            return await searchRegionsHandler(query);
        }
        catch (e) {
            console.error('[SearchRegions] Server call failed:', e);
            return [];
        }
    }
    console.warn('[SearchRegions] No handler registered. Returning empty results.');
    return [];
};
/**
 * [MIGRATED] 서버 사이드 배치 역지오코딩
 */
const batchReverseGeocodeIds = async (locations) => {
    if (batchReverseGeocodeHandler) {
        try {
            const results = await batchReverseGeocodeHandler(locations);
            return results || locations.map(() => ({}));
        }
        catch (e) {
            console.error('[BatchReverseGeocode] Server call failed:', e);
            return locations.map(() => ({}));
        }
    }
    // 개별 호출로 폴백
    return Promise.all(locations.map(loc => (0, exports.reverseGeocodeIds)(loc.lat, loc.lng)));
};
exports.batchReverseGeocodeIds = batchReverseGeocodeIds;
const batchReverseGeocodeNames = async (locations) => {
    const allIds = await (0, exports.batchReverseGeocodeIds)(locations);
    return allIds.map(ids => ({
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    }));
};
exports.batchReverseGeocodeNames = batchReverseGeocodeNames;
/**
 * [BACKWARD COMPATIBILITY] 좌표로부터 지역 명칭만을 추출합니다.
 */
const reverseGeocodeNames = async (lat, lng) => {
    const ids = await (0, exports.reverseGeocodeIds)(lat, lng);
    return {
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    };
};
exports.reverseGeocodeNames = reverseGeocodeNames;
/**
 * [MIGRATED] 서버 사이드 역지오코딩 (좌표 -> ID/명칭)
 */
const reverseGeocodeIds = async (lat, lng) => {
    if (reverseGeocodeHandler) {
        try {
            const result = await reverseGeocodeHandler(lat, lng);
            return result || {};
        }
        catch (e) {
            console.error('[ReverseGeocode] Server call failed:', e.message);
            return {};
        }
    }
    console.warn('[ReverseGeocode] No handler registered.');
    return {};
};
exports.reverseGeocodeIds = reverseGeocodeIds;
/**
 * ID로부터 지역명 조회 (이제 ID 객체에 이름이 포함되어 있으므로 단순 반환)
 */
const getRegionNamesByIds = async (ids) => {
    return {
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    };
};
exports.getRegionNamesByIds = getRegionNamesByIds;
/**
 * [MIGRATED] PlaceResult로부터 시스템 행정구역 ID/명칭 식별
 */
const resolveRegionIdsFromPlace = async (place) => {
    if (!place)
        return {};
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();
    // 서버 사이드 분석 수행
    if (lat !== undefined && lng !== undefined) {
        const ids = await (0, exports.reverseGeocodeIds)(lat, lng);
        if (ids.countryId)
            return ids;
    }
    // 폴백: Google address_components 활용 (최소한의 텍스트 정보라도 확보)
    const components = (0, exports.extractLocationComponents)(place.address_components || []);
    return {
        countryName: components.country,
        prefectureName: components.prefecture,
        cityName: components.city
    };
};
exports.resolveRegionIdsFromPlace = resolveRegionIdsFromPlace;
const extractLocationComponents = (components) => {
    const country = components.find(c => c.types.includes('country'))?.long_name;
    const prefecture = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name ||
        components.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
    const city = components.find(c => c.types.includes('locality'))?.long_name ||
        components.find(c => c.types.includes('sublocality_level_1'))?.long_name ||
        components.find(c => c.types.includes('sublocality'))?.long_name ||
        components.find(c => c.types.includes('neighborhood'))?.long_name;
    return { country, prefecture, city };
};
exports.extractLocationComponents = extractLocationComponents;
const geocode = async (address) => {
    if (!(0, utils_1.isGoogleMapsReady)())
        return null;
    const geocoder = new window.google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                const loc = results[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            }
            else {
                resolve(null);
            }
        });
    });
};
exports.geocode = geocode;
const resolveRegionIdsFromLocation = async (location, lat, lng) => {
    if (lat !== undefined && lng !== undefined) {
        return (0, exports.reverseGeocodeIds)(lat, lng);
    }
    if (location) {
        // 공항 코드 체크
        const airportMatch = airports_1.AIRPORTS.find(a => a.code === location);
        if (airportMatch) {
            return {
                countryName: airportMatch.regionIds.countryName,
                prefectureName: airportMatch.regionIds.prefectureName,
                cityName: airportMatch.regionIds.cityName
            };
        }
        const searchResults = await searchRegions(location);
        if (searchResults && searchResults.length > 0) {
            return searchResults[0].ids;
        }
    }
    return {};
};
exports.resolveRegionIdsFromLocation = resolveRegionIdsFromLocation;
/**
 * [MIGRATED] 여행지가 사용자의 거주 국가 외부에 있는지 확인합니다.
 * @param regions 여행에 포함된 지역 목록
 * @param userCountryId 사용자의 거주 국가 ID
 * @param userCountryName 사용자의 거주 국가명 (백업)
 */
const checkIsOverseas = (regions, userCountryId, userCountryName) => {
    if (!regions || regions.length === 0)
        return false;
    // 기본 홈 국가: 한국 (ID가 지정되지 않은 경우 대비)
    const homeId = userCountryId || "001";
    return regions.some(r => {
        if (!r.countryId)
            return false;
        // ID가 다르면 해외로 간주
        return String(r.countryId) !== String(homeId);
    });
};
exports.checkIsOverseas = checkIsOverseas;
/**
 * [DEPRECATED] 이제 서버 사이드로 통합되어 로컬 데이터 처리가 필요 없습니다.
 */
const normalize = (s) => {
    if (!s)
        return '';
    return s.toLowerCase().trim();
};
exports.normalize = normalize;

import { AIRPORTS } from './airports';
import { RegionIds } from '../types/common';
import { isGoogleMapsReady } from './utils';

/**
 * 서버 사이드 지능형 기능 핸들러
 */
let reverseGeocodeHandler: ((lat: number, lng: number) => Promise<RegionIds>) | null = null;
let batchReverseGeocodeHandler: ((locations: { lat: number, lng: number }[]) => Promise<RegionIds[]>) | null = null;
let searchRegionsHandler: ((query: string) => Promise<any[]>) | null = null;

export const setReverseGeocodeHandler = (
    handler: (lat: number, lng: number) => Promise<RegionIds>,
    batchHandler?: (locations: { lat: number, lng: number }[]) => Promise<RegionIds[]>
) => {
    reverseGeocodeHandler = handler;
    if (batchHandler) {
        batchReverseGeocodeHandler = batchHandler;
    }
};

export const setSearchRegionsHandler = (handler: (query: string) => Promise<any[]>) => {
    searchRegionsHandler = handler;
};

/**
 * [MIGRATED] 서버 사이드 지역 검색 수행
 */
const searchRegions = async (query: string): Promise<any[]> => {
    if (searchRegionsHandler) {
        try {
            return await searchRegionsHandler(query);
        } catch (e) {
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
export const batchReverseGeocodeIds = async (locations: { lat: number, lng: number }[]): Promise<RegionIds[]> => {
    if (batchReverseGeocodeHandler) {
        try {
            const results = await batchReverseGeocodeHandler(locations);
            return results || locations.map(() => ({}));
        } catch (e) {
            console.error('[BatchReverseGeocode] Server call failed:', e);
            return locations.map(() => ({}));
        }
    }
    
    // 개별 호출로 폴백
    return Promise.all(locations.map(loc => reverseGeocodeIds(loc.lat, loc.lng)));
};

export const batchReverseGeocodeNames = async (locations: { lat: number, lng: number }[]): Promise<Array<{ country?: string, prefecture?: string, city?: string }>> => {
    const allIds = await batchReverseGeocodeIds(locations);
    return allIds.map(ids => ({
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    }));
};

/**
 * [BACKWARD COMPATIBILITY] 좌표로부터 지역 명칭만을 추출합니다.
 */
export const reverseGeocodeNames = async (lat: number, lng: number): Promise<{ country?: string, prefecture?: string, city?: string }> => {
    const ids = await reverseGeocodeIds(lat, lng);
    return {
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    };
};

/**
 * [MIGRATED] 서버 사이드 역지오코딩 (좌표 -> ID/명칭)
 */
export const reverseGeocodeIds = async (lat: number, lng: number): Promise<RegionIds> => {
    if (reverseGeocodeHandler) {
        try {
            const result = await reverseGeocodeHandler(lat, lng);
            return result || {};
        } catch (e: any) {
            console.error('[ReverseGeocode] Server call failed:', e.message);
            return {};
        }
    }
    console.warn('[ReverseGeocode] No handler registered.');
    return {};
};

/**
 * ID로부터 지역명 조회 (이제 ID 객체에 이름이 포함되어 있으므로 단순 반환)
 */
export const getRegionNamesByIds = async (ids: RegionIds): Promise<{ country?: string, prefecture?: string, city?: string }> => {
    return {
        country: ids.countryName,
        prefecture: ids.prefectureName,
        city: ids.cityName
    };
};

/**
 * [MIGRATED] PlaceResult로부터 시스템 행정구역 ID/명칭 식별
 */
export const resolveRegionIdsFromPlace = async (place: any): Promise<RegionIds> => {
    if (!place) return {};

    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();

    // 서버 사이드 분석 수행
    if (lat !== undefined && lng !== undefined) {
        const ids = await reverseGeocodeIds(lat, lng);
        if (ids.countryId) return ids;
    }

    // 폴백: Google address_components 활용 (최소한의 텍스트 정보라도 확보)
    const components = extractLocationComponents(place.address_components || []);
    return {
        countryName: components.country,
        prefectureName: components.prefecture,
        cityName: components.city
    };
};

export const extractLocationComponents = (components: any[]): { country?: string, prefecture?: string, city?: string } => {
    const country = components.find(c => c.types.includes('country'))?.long_name;
    const prefecture = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name ||
                       components.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
    const city = components.find(c => c.types.includes('locality'))?.long_name ||
                 components.find(c => c.types.includes('sublocality_level_1'))?.long_name ||
                 components.find(c => c.types.includes('sublocality'))?.long_name ||
                 components.find(c => c.types.includes('neighborhood'))?.long_name;
    
    return { country, prefecture, city };
};

export const geocode = async (address: string): Promise<{ lat: number, lng: number } | null> => {
    if (!isGoogleMapsReady()) return null;
    
    const geocoder = new (window as any).google.maps.Geocoder();
    return new Promise((resolve) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
            if (status === 'OK' && results?.[0]) {
                const loc = results[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
                resolve(null);
            }
        });
    });
};

export const resolveRegionIdsFromLocation = async (
    location?: string,
    lat?: number,
    lng?: number
): Promise<RegionIds> => {
    if (lat !== undefined && lng !== undefined) {
        return reverseGeocodeIds(lat, lng);
    }

    if (location) {
        // 공항 코드 체크
        const airportMatch = AIRPORTS.find(a => a.code === location);
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

/**
 * [MIGRATED] 여행지가 사용자의 거주 국가 외부에 있는지 확인합니다.
 * @param regions 여행에 포함된 지역 목록
 * @param userCountryId 사용자의 거주 국가 ID
 * @param userCountryName 사용자의 거주 국가명 (백업)
 */
export const checkIsOverseas = (
    regions: any[], 
    userCountryId?: string,
    userCountryName?: string
): boolean => {
    if (!regions || regions.length === 0) return false;
    
    // 기본 홈 국가: 한국 (ID가 지정되지 않은 경우 대비)
    const homeId = userCountryId || "001"; 
    
    return regions.some(r => {
        if (!r.countryId) return false;
        // ID가 다르면 해외로 간주
        return String(r.countryId) !== String(homeId);
    });
};

/**
 * [DEPRECATED] 이제 서버 사이드로 통합되어 로컬 데이터 처리가 필요 없습니다.
 */
export const normalize = (s: string) => {
    if (!s) return '';
    return s.toLowerCase().trim();
};

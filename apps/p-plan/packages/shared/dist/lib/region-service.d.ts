import { RegionIds } from '../types/common';
export declare const setReverseGeocodeHandler: (handler: (lat: number, lng: number) => Promise<RegionIds>, batchHandler?: (locations: {
    lat: number;
    lng: number;
}[]) => Promise<RegionIds[]>) => void;
export declare const setSearchRegionsHandler: (handler: (query: string) => Promise<any[]>) => void;
/**
 * [MIGRATED] 서버 사이드 배치 역지오코딩
 */
export declare const batchReverseGeocodeIds: (locations: {
    lat: number;
    lng: number;
}[]) => Promise<RegionIds[]>;
export declare const batchReverseGeocodeNames: (locations: {
    lat: number;
    lng: number;
}[]) => Promise<Array<{
    country?: string;
    prefecture?: string;
    city?: string;
}>>;
/**
 * [BACKWARD COMPATIBILITY] 좌표로부터 지역 명칭만을 추출합니다.
 */
export declare const reverseGeocodeNames: (lat: number, lng: number) => Promise<{
    country?: string;
    prefecture?: string;
    city?: string;
}>;
/**
 * [MIGRATED] 서버 사이드 역지오코딩 (좌표 -> ID/명칭)
 */
export declare const reverseGeocodeIds: (lat: number, lng: number) => Promise<RegionIds>;
/**
 * ID로부터 지역명 조회 (이제 ID 객체에 이름이 포함되어 있으므로 단순 반환)
 */
export declare const getRegionNamesByIds: (ids: RegionIds) => Promise<{
    country?: string;
    prefecture?: string;
    city?: string;
}>;
/**
 * [MIGRATED] PlaceResult로부터 시스템 행정구역 ID/명칭 식별
 */
export declare const resolveRegionIdsFromPlace: (place: any) => Promise<RegionIds>;
export declare const extractLocationComponents: (components: any[]) => {
    country?: string;
    prefecture?: string;
    city?: string;
};
export declare const geocode: (address: string) => Promise<{
    lat: number;
    lng: number;
} | null>;
export declare const resolveRegionIdsFromLocation: (location?: string, lat?: number, lng?: number) => Promise<RegionIds>;
/**
 * [MIGRATED] 여행지가 사용자의 거주 국가 외부에 있는지 확인합니다.
 * @param regions 여행에 포함된 지역 목록
 * @param userCountryId 사용자의 거주 국가 ID
 * @param userCountryName 사용자의 거주 국가명 (백업)
 */
export declare const checkIsOverseas: (regions: any[], userCountryId?: string, userCountryName?: string) => boolean;
/**
 * [DEPRECATED] 이제 서버 사이드로 통합되어 로컬 데이터 처리가 필요 없습니다.
 */
export declare const normalize: (s: string) => string;

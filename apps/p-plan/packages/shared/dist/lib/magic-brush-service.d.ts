export interface MagicPOI {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    rating?: number;
    userRatingsTotal?: number;
    types: string[];
    photos?: string[];
    priceLevel?: number;
    openingHours?: {
        openNow?: boolean;
    };
}
/**
 * 폴리곤 영역 내의 장소들을 검색합니다.
 */
export declare function searchPlacesInPolygon(path: {
    lat: number;
    lng: number;
}[], placesService: google.maps.places.PlacesService): Promise<MagicPOI[]>;

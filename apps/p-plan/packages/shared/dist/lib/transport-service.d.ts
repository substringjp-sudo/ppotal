export interface DistanceMatrixRequest {
    origins: {
        lat: number;
        lng: number;
    }[];
    destinations: {
        lat: number;
        lng: number;
    }[];
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}
export interface DistanceMatrixResponse {
    status: string;
    rows: {
        elements: {
            status: string;
            duration?: {
                value: number;
                text: string;
            };
            distance?: {
                value: number;
                text: string;
            };
        }[];
    }[];
}
/**
 * Google Maps Distance Matrix API를 Cloud Function 프록시를 통해 호출합니다.
 * API 키 노출 없이 안전하게 거리와 시간을 계산할 수 있습니다.
 */
export declare const getDistanceMatrix: (params: DistanceMatrixRequest) => Promise<DistanceMatrixResponse>;
/**
 * 두 지점 사이의 예상 이동 시간을 분 단위로 가져옵니다.
 */
export declare const estimateTravelTime: (origin: {
    lat: number;
    lng: number;
}, destination: {
    lat: number;
    lng: number;
}, mode?: DistanceMatrixRequest["mode"]) => Promise<number | null>;

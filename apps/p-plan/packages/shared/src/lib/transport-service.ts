import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface DistanceMatrixRequest {
    origins: { lat: number, lng: number }[];
    destinations: { lat: number, lng: number }[];
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
}

export interface DistanceMatrixResponse {
    status: string;
    rows: {
        elements: {
            status: string;
            duration?: {
                value: number; // seconds
                text: string;
            };
            distance?: {
                value: number; // meters
                text: string;
            };
        }[];
    }[];
}

/**
 * Google Maps Distance Matrix API를 Cloud Function 프록시를 통해 호출합니다.
 * API 키 노출 없이 안전하게 거리와 시간을 계산할 수 있습니다.
 */
export const getDistanceMatrix = async (params: DistanceMatrixRequest): Promise<DistanceMatrixResponse> => {
    try {
        const getDistanceMatrixFn = httpsCallable<DistanceMatrixRequest, DistanceMatrixResponse>(
            functions, 
            'getDistanceMatrix'
        );
        const result = await getDistanceMatrixFn(params);
        return result.data;
    } catch (error) {
        console.error("Error calling getDistanceMatrix proxy:", error);
        throw error;
    }
};

/**
 * 두 지점 사이의 예상 이동 시간을 분 단위로 가져옵니다.
 */
export const estimateTravelTime = async (
    origin: { lat: number, lng: number },
    destination: { lat: number, lng: number },
    mode: DistanceMatrixRequest['mode'] = 'driving'
): Promise<number | null> => {
    try {
        const response = await getDistanceMatrix({
            origins: [origin],
            destinations: [destination],
            mode
        });

        if (response.status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
            const durationSec = response.rows[0].elements[0].duration?.value;
            return durationSec ? Math.ceil(durationSec / 60) : null;
        }
        return null;
    } catch (error) {
        console.warn("Failed to estimate travel time, falling back to basic calculation:", error);
        return null;
    }
};

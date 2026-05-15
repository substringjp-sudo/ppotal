"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTravelTime = exports.getDistanceMatrix = void 0;
const functions_1 = require("firebase/functions");
const firebase_1 = require("./firebase");
/**
 * Google Maps Distance Matrix API를 Cloud Function 프록시를 통해 호출합니다.
 * API 키 노출 없이 안전하게 거리와 시간을 계산할 수 있습니다.
 */
const getDistanceMatrix = async (params) => {
    try {
        const getDistanceMatrixFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'getDistanceMatrix');
        const result = await getDistanceMatrixFn(params);
        return result.data;
    }
    catch (error) {
        console.error("Error calling getDistanceMatrix proxy:", error);
        throw error;
    }
};
exports.getDistanceMatrix = getDistanceMatrix;
/**
 * 두 지점 사이의 예상 이동 시간을 분 단위로 가져옵니다.
 */
const estimateTravelTime = async (origin, destination, mode = 'driving') => {
    try {
        const response = await (0, exports.getDistanceMatrix)({
            origins: [origin],
            destinations: [destination],
            mode
        });
        if (response.status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
            const durationSec = response.rows[0].elements[0].duration?.value;
            return durationSec ? Math.ceil(durationSec / 60) : null;
        }
        return null;
    }
    catch (error) {
        console.warn("Failed to estimate travel time, falling back to basic calculation:", error);
        return null;
    }
};
exports.estimateTravelTime = estimateTravelTime;

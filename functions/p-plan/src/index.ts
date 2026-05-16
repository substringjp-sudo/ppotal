/**
 * Firebase Functions for PPLANER
 * 
 * - updateExchangeRates: Scheduled function to sync daily currency rates.
 * - manualExchangeRatesUpdate: Callable function for admin to force sync.
 * - onTripDeleted: Firestore trigger to clean up sub-collections.
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentDeleted, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// @ts-ignore
import fetch from "node-fetch";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore("(default)");
db.settings({ ignoreUndefinedProperties: true });

// Shared Library Imports & Initialization
import { 
    geodataEngine, 
    FirestoreAdminGeodataProvider, 
    extractLocationComponents,
    aviationEngine,
    FirestoreAdminAviationProvider
} from "@pplaner/shared";

const geodataProvider = new FirestoreAdminGeodataProvider(db);
geodataEngine.setProvider(geodataProvider);

const aviationProvider = new FirestoreAdminAviationProvider(db);
aviationEngine.setProvider(aviationProvider);


// Global Options
setGlobalOptions({ 
    maxInstances: 10, 
    region: "asia-northeast3", // Seoul
    timeoutSeconds: 60,
    memory: "256MiB"
});

/**
 * 6시간마다(00, 06, 12, 18시) 실행되어 최신 환율 정보를 가져와 Firestore에 저장합니다.
 */
export const updateExchangeRates = onSchedule("0 */6 * * *", async (event) => {
    logger.info("환율 업데이트 작업을 시작합니다.");

    try {
        const response = await fetch("https://open.er-api.com/v6/latest/KRW");
        if (!response.ok) throw new Error(`환율 API 호출 실패: ${response.statusText}`);

        const data: any = await response.json();
        if (data.result !== "success") throw new Error("환율 데이터 형식이 올바르지 않습니다.");

        const processedRates: Record<string, number> = {};
        for (const [code, rate] of Object.entries(data.rates)) {
            if (typeof rate === "number" && rate > 0) {
                processedRates[code] = 1 / rate;
            }
        }

        const exchangeData = {
            base: "KRW",
            rates: processedRates,
            updatedAt: new Date().toISOString(),
            provider: "ExchangeRate-API (Free)",
        };

        await db.collection("metadata").doc("exchange_rates").set(exchangeData);
        logger.info("환율 업데이트 완료");
    } catch (error) {
        logger.error("환율 업데이트 중 오류 발생:", error);
    }
});

/**
 * 수동으로 환율 업데이트를 트리거할 수 있는 Callable Function
 */
export const manualExchangeRatesUpdate = onCall({ cors: true }, async (request) => {
    logger.info("수동 환율 업데이트 요청이 접수되었습니다.");
    
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/KRW");
        if (!response.ok) throw new Error("API failure");
        const data: any = await response.json();
        
        const processedRates: Record<string, number> = {};
        for (const [code, rate] of Object.entries(data.rates)) {
            if (typeof rate === "number" && rate > 0) {
                processedRates[code] = 1 / rate;
            }
        }

        const exchangeData = {
            base: "KRW",
            rates: processedRates,
            updatedAt: new Date().toISOString(),
            provider: "ExchangeRate-API (Free) - Manual",
        };

        await db.collection("metadata").doc("exchange_rates").set(exchangeData);
        return { success: true, updatedAt: exchangeData.updatedAt };
    } catch (error: any) {
        logger.error("수동 환율 업데이트 실패:", error);
        throw new HttpsError("internal", error.message || "Failed to update rates");
    }
});

/**
 * 여행 문서가 삭제될 때 연결된 하위 컬렉션들을 모두 자동으로 삭제합니다.
 */
export const onTripDeleted = onDocumentDeleted({
    document: "trips/{tripId}",
    database: "(default)"
}, async (event) => {
    const { tripId } = event.params;
    logger.info(`여행 삭제 감지: ${tripId}. 하위 컬렉션 정리를 시작합니다.`);

    const tripRef = db.collection("trips").doc(tripId);
    const subCollections = ["dailyTimeline", "flights", "accommodation", "driving", "publicTransport", "prepTimeline", "reservations", "warnings"];

    try {
        for (const subCollName of subCollections) {
            const snapshot = await tripRef.collection(subCollName).get();
            if (snapshot.empty) continue;
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }
        logger.info(`여행 ${tripId} 관련 데이터 정리 완료`);
    } catch (error) {
        logger.error(`여행 ${tripId} 정리 중 오류 발생:`, error);
    }
});



import { 
    clusterPhotos, 
    PhotoMetadata, 
    ClusteredLocation 
} from "@pplaner/shared";

/**
 * 사진 메타데이터 기반 지능형 타임라인 생성
 * (Note: 지도시스템 전환으로 인해 좌표 기반 장소 식별 기능은 추후 최신 타일 엔진 연동 예정)
 */
export const generateTimelineFromPhotos = onCall({ cors: true }, async (request) => {
    const { photos } = request.data;
    if (!Array.isArray(photos) || photos.length === 0) return [];
    try {
        // 기본 사진 클러스터링 로직만 수행
        const clusters = clusterPhotos(photos as PhotoMetadata[]);
        return clusters.map((cluster: ClusteredLocation) => {
            return { ...cluster, suggestedTitle: '새로운 장소', regionIds: {} };
        });
    } catch (error: any) {

        logger.error("Timeline Generation 실패:", error);
        throw new HttpsError("internal", "사진 기반 타임라인 생성 중 오류가 발생했습니다.");
    }
});

/**
 * 좌표로부터 행정구역 ID 및 명칭 식별 (Reverse Geocoding)
 */
export const reverseGeocode = onCall({ cors: true }, async (request) => {
    const { lat, lng } = request.data;
    if (typeof lat !== "number" || typeof lng !== "number") {
        throw new HttpsError("invalid-argument", "lat 및 lng은 숫자여야 합니다.");
    }

    try {
        return await geodataEngine.lookup(lat, lng);
    } catch (error: any) {
        logger.error("reverseGeocode 실패:", error);
        throw new HttpsError("internal", error.message || "역지오코딩 중 오류가 발생했습니다.");
    }
});

/**
 * 여러 좌표에 대한 배치 역지오코딩
 */
export const batchReverseGeocode = onCall({ cors: true }, async (request) => {
    const { locations } = request.data;
    if (!Array.isArray(locations)) {
        throw new HttpsError("invalid-argument", "locations 배열이 필요합니다.");
    }

    logger.info("batchReverseGeocode 호출됨", { count: locations?.length });
    try {
        const results = await Promise.all(
            locations.map(async (loc: any) => {
                try {
                    return await geodataEngine.lookup(loc.lat, loc.lng);
                } catch (e) {
                    logger.error(`Batch item lookup failed for ${loc.lat}, ${loc.lng}:`, e);
                    return {};
                }
            })
        );
        return results;
    } catch (error: any) {
        logger.error("batchReverseGeocode 실패:", error);
        throw new HttpsError("internal", "배치 역지오코딩 중 오류가 발생했습니다.");
    }
});

/**
 * 검색 쿼리 기반 지역 검색
 */
export const searchRegions = onCall({ cors: true }, async (request) => {
    const { query, options } = request.data;
    if (typeof query !== "string") {
        throw new HttpsError("invalid-argument", "query 문자열이 필요합니다.");
    }

    try {
        return await geodataEngine.searchRegions(query, options);
    } catch (error: any) {
        logger.error("searchRegions 실패:", error);
        throw new HttpsError("internal", "지역 검색 중 오류가 발생했습니다.");
    }
});

/**
 * Google PlaceResult 객체로부터 시스템 지역 ID 추출
 */
export const solveRegionIdsFromPlace = onCall({ cors: true }, async (request) => {
    const { place } = request.data;
    if (!place) {
        throw new HttpsError("invalid-argument", "place 객체가 필요합니다.");
    }

    try {
        let lat: number | undefined;
        let lng: number | undefined;

        if (place.geometry?.location) {
            // Google Maps SDK의 function 스타일과 일반 object 스타일 모두 대응
            const loc = place.geometry.location;
            lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
            lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
        }

        // 1. 좌표 기반 정밀 룩업 시도
        if (typeof lat === "number" && typeof lng === "number") {
            const ids = await geodataEngine.lookup(lat, lng);
            if (ids && ids.countryId) return ids;
        }

        // 2. 폴백: address_components 텍스트 기반 추출
        const components = extractLocationComponents(place.address_components || []);
        return {
            countryName: components.country,
            prefectureName: components.prefecture,
            cityName: components.city,
        };
    } catch (error: any) {
        logger.error("solveRegionIdsFromPlace 실패:", error);
        throw new HttpsError("internal", "장소 ID 식별 중 오류가 발생했습니다.");
    }
});



/**
 * 공항 및 항공사 데이터 통합 검색
 */
export const searchAviationData = onCall({ cors: true }, async (request) => {
    const { type, query, ...options } = request.data;
    
    if (typeof query !== "string") {
        throw new HttpsError("invalid-argument", "query 문자열이 필요합니다.");
    }

    try {
        if (type === 'airport') {
            return await aviationEngine.searchAirports(query, options);
        } else if (type === 'airline') {
            return await aviationEngine.searchAirlines(query);
        } else {
            throw new HttpsError("invalid-argument", "지원하지 않는 검색 유형입니다.");
        }
    } catch (error: any) {
        logger.error("searchAviationData 실패:", error);
        throw new HttpsError("internal", error.message || "항공 데이터 검색 중 오류가 발생했습니다.");
    }
});

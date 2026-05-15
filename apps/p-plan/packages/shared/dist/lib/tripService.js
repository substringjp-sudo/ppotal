"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFastTrip = exports.createInstantTrip = exports.subscribeUserTrips = exports.syncRecordedLocations = exports.deleteTrip = exports.updateTripInDb = exports.subscribeToUserTrips = exports.getUserTripSummary = exports.getUserTrips = exports.getTrip = exports.getTripSubCollection = exports.getTripMain = exports.saveTrip = exports.PHOTO_HISTORY_SUB = exports.LOCATION_HISTORY_SUB = exports.COMMENTS_SUB = exports.RESERVATIONS_SUB = exports.PREP_TIMELINE_SUB = exports.PUBLIC_TRANSPORT_SUB = exports.DRIVING_SUB = exports.ACCOMMODATION_SUB = exports.FLIGHTS_SUB = exports.BUCKET_LIST_SUB = exports.CHECKLIST_SUB = exports.DAILY_PLANS_SUB = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const common_1 = require("../types/common");
const utils_1 = require("./utils");
const TRIPS_COLLECTION = 'trips';
exports.DAILY_PLANS_SUB = 'dailyPlans';
exports.CHECKLIST_SUB = 'checklist';
exports.BUCKET_LIST_SUB = 'bucketList';
exports.FLIGHTS_SUB = 'flights';
exports.ACCOMMODATION_SUB = 'accommodation';
exports.DRIVING_SUB = 'driving';
exports.PUBLIC_TRANSPORT_SUB = 'publicTransport';
exports.PREP_TIMELINE_SUB = 'prepTimeline';
exports.RESERVATIONS_SUB = 'reservations';
exports.COMMENTS_SUB = 'comments';
exports.LOCATION_HISTORY_SUB = 'locationHistory';
exports.PHOTO_HISTORY_SUB = 'photoHistory';
/**
 * 여행을 Firestore에 저장 (하위 컬렉션 분산 저장 구조 고도화)
 */
const saveTrip = async (trip, user) => {
    if (!firebase_1.auth.currentUser || firebase_1.auth.currentUser.uid !== user.uid) {
        throw new Error("Authentication mismatch or not signed in");
    }
    try {
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        const userId = user.uid;
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, trip.id);
        const existingSnap = await (0, firestore_1.getDoc)(tripRef);
        const now = new Date().toISOString();
        const existingData = existingSnap.exists() ? existingSnap.data() : {};
        // 1. 메인 문서 데이터 (Summary + Metadata + Settings)
        // 덩치가 큰 배열들은 하위 컬렉션으로 보냅니다.
        const { dailyTimeline, checklist, bucketList, flights, accommodation, driving, publicTransport, prepTimeline, reservations, comments, ...mainData } = trip;
        const members = mainData.participants
            ? mainData.participants.map((p) => p.id).filter((id) => !!id && id.length > 5)
            : [];
        const tripDocData = {
            ...mainData,
            userId: existingData.userId || userId, // Preserve original owner if exists
            members: members,
            createdAt: existingData.createdAt || now,
            updatedAt: now,
            // 통계 필드 업데이트
            flightCount: flights?.length || 0,
            accommodationCount: accommodation?.length || 0,
            transportCount: (driving?.length || 0) + (publicTransport?.length || 0),
            planningStatus: mainData.planningStatus || 'ideation',
            // 메인 문서에서는 배열을 비워둠 (로드 시 하위 컬렉션에서 채움)
            dailyTimeline: [],
            checklist: [],
            bucketList: [],
            flights: [],
            accommodation: [],
            driving: [],
            publicTransport: [],
            prepTimeline: [],
            reservations: [],
            warnings: [],
            comments: [],
        };
        batch.set(tripRef, (0, utils_1.removeUndefined)(tripDocData), { merge: true });
        // 2. 하위 컬렉션 데이터들 (Batch 작업)
        // 로드된 컬렉션만 저장하도록 제한 (로드 안 된 상태에서 빈 배열로 덮어씌워지는 것 방지)
        const loadedSubCols = trip._loadedSubCollections || [];
        // Helper to add items to batch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addToBatch = (items, subCollection) => {
            // 해당 컬렉션이 로드된 적이 없으면 저장을 건너뜁니다.
            if (!loadedSubCols.includes(subCollection))
                return;
            if (!items)
                return;
            items.forEach((item, idx) => {
                // ID가 있으면 ID로, 없으면 인덱스로 (dailyPlans는 인덱스 사용 권장)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const id = item.id || idx.toString();
                const ref = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, trip.id, subCollection, id);
                batch.set(ref, (0, utils_1.removeUndefined)(item));
            });
        };
        addToBatch(dailyTimeline, exports.DAILY_PLANS_SUB);
        addToBatch(checklist, exports.CHECKLIST_SUB);
        addToBatch(bucketList, exports.BUCKET_LIST_SUB);
        addToBatch(flights, exports.FLIGHTS_SUB);
        addToBatch(accommodation, exports.ACCOMMODATION_SUB);
        addToBatch(driving, exports.DRIVING_SUB);
        addToBatch(publicTransport, exports.PUBLIC_TRANSPORT_SUB);
        addToBatch(prepTimeline, exports.PREP_TIMELINE_SUB);
        addToBatch(reservations, exports.RESERVATIONS_SUB);
        addToBatch(comments, exports.COMMENTS_SUB);
        await batch.commit();
    }
    catch (error) {
        console.error("Error saving trip (distributed):", error);
        // toast.error("여행 저장 중 오류가 발생했습니다.");
        throw error;
    }
};
exports.saveTrip = saveTrip;
/**
 * 단일 여행의 메인 정보만 조회 (기본 설정 및 메타데이터)
 */
const getTripMain = async (tripId) => {
    try {
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId);
        const docSnap = await (0, firestore_1.getDoc)(tripRef);
        if (!docSnap.exists())
            return null;
        const data = docSnap.data();
        // 필수 필드 보장 및 기본값 설정
        const mainData = {
            userId: '',
            title: '제목 없음',
            theme: '힐링',
            isOverseas: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            members: [],
            ...data,
            id: docSnap.id,
            dates: data.dates || { startDate: '', endDate: '', flexibilityDays: 0, isUndecided: true },
            locations: data.locations || { regionNames: [], regions: [], center: { lat: 37.5665, lng: 126.9780 } },
            participants: data.participants || [],
            budget: data.budget || {
                baseCurrency: 'KRW',
                expenses: [],
                activeCurrencies: [],
                exchanges: [],
                commonAllocated: 0,
                individualAllocated: 0,
                participantBudgets: []
            },
            transportSettings: data.transportSettings || { useFlight: true, useDriving: false },
            // 하위 컬렉션 배열 (문서에 직접 포함된 경우 대비)
            dailyTimeline: data.dailyTimeline || [],
            checklist: data.checklist || [],
            bucketList: data.bucketList || [],
            flights: data.flights || [],
            accommodation: data.accommodation || [],
            driving: data.driving || [],
            publicTransport: data.publicTransport || [],
            prepTimeline: data.prepTimeline || [],
            reservations: data.reservations || [],
            comments: data.comments || []
        };
        return mainData;
    }
    catch (error) {
        console.error("Error getting trip main document:", error);
        throw error;
    }
};
exports.getTripMain = getTripMain;
/**
 * 특정 하위 컬렉션 데이터만 조회 (On-demand loading)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTripSubCollection = async (tripId, subCollection) => {
    try {
        const snap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, subCollection));
        const data = snap.docs.map(d => d.data());
        if (subCollection === exports.DAILY_PLANS_SUB) {
            return data.sort((a, b) => a.day - b.day);
        }
        return data;
    }
    catch (error) {
        console.error(`Error getting sub-collection ${subCollection}:`, error);
        return [];
    }
};
exports.getTripSubCollection = getTripSubCollection;
/**
 * 단일 여행 조회 (메인 문서 + 모든 하위 컬렉션 병렬 로드 - 레거시/풀 로드용)
 */
const getTrip = async (tripId) => {
    try {
        const mainData = await (0, exports.getTripMain)(tripId);
        if (!mainData)
            return null;
        const subCollections = [
            exports.DAILY_PLANS_SUB, exports.CHECKLIST_SUB, exports.BUCKET_LIST_SUB,
            exports.FLIGHTS_SUB, exports.ACCOMMODATION_SUB, exports.DRIVING_SUB,
            exports.PUBLIC_TRANSPORT_SUB, exports.PREP_TIMELINE_SUB, exports.RESERVATIONS_SUB,
            exports.COMMENTS_SUB
        ];
        const [dailyTimeline, checklist, bucketList, flights, accommodation, driving, publicTransport, prepTimeline, reservations, comments] = await Promise.all(subCollections.map(sub => (0, exports.getTripSubCollection)(tripId, sub)));
        // 하위 호환성 체크: 메인 문서에 여전히 데이터가 남아있는 레거시 대응
        const mergedTrip = {
            ...mainData,
            dailyTimeline: dailyTimeline.length > 0 ? dailyTimeline : (mainData.dailyTimeline || []),
            checklist: checklist.length > 0 ? checklist : (mainData.checklist || []),
            bucketList: bucketList.length > 0 ? bucketList : (mainData.bucketList || []),
            flights: flights.length > 0 ? flights : (mainData.flights || []),
            accommodation: accommodation.length > 0 ? accommodation : (mainData.accommodation || []),
            driving: driving.length > 0 ? driving : (mainData.driving || []),
            publicTransport: publicTransport.length > 0 ? publicTransport : (mainData.publicTransport || []),
            prepTimeline: prepTimeline.length > 0 ? prepTimeline : (mainData.prepTimeline || []),
            reservations: reservations.length > 0 ? reservations : (mainData.reservations || []),
            comments: comments.length > 0 ? comments : (mainData.comments || []),
            _loadedSubCollections: subCollections
        };
        return mergedTrip;
    }
    catch (error) {
        console.error("Error getting full trip data:", error);
        throw error;
    }
};
exports.getTrip = getTrip;
/**
 * 사용자의 모든 여행 요약 목록 조회
 */
const getUserTrips = async (userId) => {
    try {
        const tripsRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION);
        const currentUserId = firebase_1.auth.currentUser?.uid;
        let q;
        if (currentUserId === userId) {
            // 자신의 여행은 모두 조회 가능
            q = (0, firestore_1.query)(tripsRef, (0, firestore_1.where)("userId", "==", userId));
        }
        else {
            // 타인의 여행은 public인 것만 조회 가능 (보안 규칙 준수)
            q = (0, firestore_1.query)(tripsRef, (0, firestore_1.where)("userId", "==", userId), (0, firestore_1.where)("visibility", "==", "public"));
        }
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        const summaries = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                dates: data.dates,
                locations: data.locations,
                userId: data.userId,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                theme: data.theme,
                isOverseas: data.isOverseas,
                flightCount: data.flightCount || 0,
                accommodationCount: data.accommodationCount || 0,
                transportCount: data.transportCount || 0,
                planningStatus: data.planningStatus || 'ideation'
            };
        });
        summaries.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return summaries;
    }
    catch (error) {
        console.error("Error getting user trips:", error);
        throw error;
    }
};
exports.getUserTrips = getUserTrips;
/**
 * 사용자의 여행 데이터를 요약하여 통계 및 최근 활동 반환
 */
const getUserTripSummary = async (userId) => {
    try {
        const summaries = await (0, exports.getUserTrips)(userId);
        // 고유 지역 이름 추출
        const allRegions = summaries.flatMap(s => s.locations.regionNames || []);
        const uniqueRegions = Array.from(new Set(allRegions));
        // 공개된 여행 또는 최근 업데이트된 여행 상위 3개
        const recentTrips = summaries.slice(0, 3).map((s) => ({
            id: s.id,
            title: s.title,
            dates: s.dates,
            theme: s.theme
        }));
        return {
            totalTrips: summaries.length,
            locationCount: uniqueRegions.length,
            recentTrips,
            uniqueRegions: uniqueRegions.slice(0, 5) // 대표 지역 5개만
        };
    }
    catch (error) {
        console.error("Error getting user trip summary:", error);
        return {
            totalTrips: 0,
            locationCount: 0,
            recentTrips: [],
            uniqueRegions: []
        };
    }
};
exports.getUserTripSummary = getUserTripSummary;
/**
 * 사용자의 모든 여행 요약 목록을 실시간으로 구독
 */
const subscribeToUserTrips = (userId, callback) => {
    try {
        const tripsRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION);
        const currentUserId = firebase_1.auth.currentUser?.uid;
        // 권한 규칙 준수: 자신의 여행은 모두, 타인의 여행은 public만
        const q = (currentUserId === userId)
            ? (0, firestore_1.query)(tripsRef, (0, firestore_1.where)("userId", "==", userId))
            : (0, firestore_1.query)(tripsRef, (0, firestore_1.where)("userId", "==", userId), (0, firestore_1.where)("visibility", "==", "public"));
        return (0, firestore_1.onSnapshot)(q, (snapshot) => {
            const summaries = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    dates: data.dates,
                    locations: data.locations,
                    userId: data.userId,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    theme: data.theme,
                    isOverseas: data.isOverseas,
                    flightCount: data.flightCount || 0,
                    accommodationCount: data.accommodationCount || 0,
                    transportCount: data.transportCount || 0,
                    planningStatus: data.planningStatus || 'ideation'
                };
            });
            summaries.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            callback(summaries);
        }, (error) => {
            console.error("Error subscribing to user trips:", error);
        });
    }
    catch (error) {
        console.error("Error setting up trip subscription:", error);
        throw error;
    }
};
exports.subscribeToUserTrips = subscribeToUserTrips;
/**
 * 여행 정보의 특정 부분만 업데이트 (효율적인 필드별 업데이트)
 */
const updateTripInDb = async (tripId, updates, user) => {
    if (!firebase_1.auth.currentUser) {
        throw new Error("Authentication required to update trip");
    }
    try {
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId);
        // 1. 메인 문서 업데이트용 필드 추출
        const { dailyTimeline, checklist, bucketList, flights, accommodation, driving, publicTransport, prepTimeline, reservations, ...mainFields } = updates;
        // Sync members if participants were updated
        const finalMainFields = { ...mainFields };
        if (mainFields.participants) {
            finalMainFields.members = mainFields.participants
                .map((p) => p.id)
                .filter((id) => !!id && id.length > 5); // Simple heuristic to filter out dummy IDs like '0-0'
        }
        // 메인 필드가 있다면 업데이트
        if (Object.keys(finalMainFields).length > 0) {
            batch.update(tripRef, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(0, utils_1.removeUndefined)(finalMainFields),
                updatedAt: new Date().toISOString()
            });
        }
        // 2. 하위 컬렉션이 포함된 경우에만 해당 컬렉션들 업데이트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateSubCollection = (items, subCollection) => {
            if (!items)
                return;
            // 주의: 하위 컬렉션의 경우 '교체' 방식이므로 기존 데이터를 지우고 새로 쓰거나,
            // 인덱스/ID 기반으로 덮어씁니다. 여기서는 saveTrip의 로직을 따릅니다.
            items.forEach((item, idx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const id = item.id || idx.toString();
                const ref = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId, subCollection, id);
                batch.set(ref, (0, utils_1.removeUndefined)(item));
            });
        };
        updateSubCollection(dailyTimeline, exports.DAILY_PLANS_SUB);
        updateSubCollection(checklist, exports.CHECKLIST_SUB);
        updateSubCollection(bucketList, exports.BUCKET_LIST_SUB);
        updateSubCollection(flights, exports.FLIGHTS_SUB);
        updateSubCollection(accommodation, exports.ACCOMMODATION_SUB);
        updateSubCollection(driving, exports.DRIVING_SUB);
        updateSubCollection(publicTransport, exports.PUBLIC_TRANSPORT_SUB);
        updateSubCollection(prepTimeline, exports.PREP_TIMELINE_SUB);
        updateSubCollection(reservations, exports.RESERVATIONS_SUB);
        await batch.commit();
    }
    catch (error) {
        console.error("Error updating trip (selective):", error);
        // toast.error("여행 정보 업데이트 중 오류가 발생했습니다.");
        throw error;
    }
};
exports.updateTripInDb = updateTripInDb;
/**
 * 여행 삭제 (하위 컬렉션 포함 권장)
 * 주의: 클라이언트 측에서 모든 하위 문서를 찾아 지우는 것은 비효율적일 수 있습니다.
 * 가급적 Cloud Functions의 recursive delete 기능을 활용하는 것을 권장합니다.
 */
/**
 * 여행 삭제 (하위 컬렉션 포함)
 * 주의: 클라이언트 측에서 모든 하위 문서를 찾아 지우는 것은 문서 수가 많을 경우 비효율적일 수 있습니다.
 * 500개 이상의 문서를 삭제해야 하는 대규모 여행의 경우 Cloud Functions의 recursive delete 기능을 권장합니다.
 */
const deleteTrip = async (tripId) => {
    if (!tripId || !firebase_1.auth.currentUser)
        return;
    try {
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        const subCollections = [
            exports.DAILY_PLANS_SUB, exports.CHECKLIST_SUB, exports.BUCKET_LIST_SUB,
            exports.FLIGHTS_SUB, exports.ACCOMMODATION_SUB, exports.DRIVING_SUB,
            exports.PUBLIC_TRANSPORT_SUB, exports.PREP_TIMELINE_SUB, exports.RESERVATIONS_SUB
        ];
        // 1. 모든 하위 컬렉션의 문서들을 찾아 삭제 배치에 추가
        await Promise.all(subCollections.map(async (sub) => {
            const snap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, sub));
            snap.forEach(d => {
                batch.delete(d.ref);
            });
        }));
        // 2. 메인 문서 삭제 추가
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId);
        batch.delete(tripRef);
        // 3. 실행
        await batch.commit();
        console.log(`Trip ${tripId} and its sub-collections deleted successfully.`);
    }
    catch (error) {
        console.error("Error deleting trip and sub-collections:", error);
        // toast.error("여행 삭제 중 오류가 발생했습니다.");
        throw error;
    }
};
exports.deleteTrip = deleteTrip;
/**
 * @deprecated Use recordService.saveFootprintsBatch instead for offline-first capabilities.
 * 모바일기기에서 기록된 위치 정보들을 일괄 동기화 (Firestore 서브컬렉션)
 */
const syncRecordedLocations = async (tripId, locations) => {
    try {
        const batch = (0, firestore_1.writeBatch)(firebase_1.db);
        locations.forEach((loc) => {
            const id = loc.timestamp.toString(); // 타임스탬프를 ID로 사용 (유니크함 보장)
            const ref = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId, exports.LOCATION_HISTORY_SUB, id);
            batch.set(ref, loc);
        });
        await batch.commit();
        console.log(`PPLANER: Synced ${locations.length} locations to Firestore.`);
    }
    catch (error) {
        console.error("Error syncing locations:", error);
        throw error;
    }
};
exports.syncRecordedLocations = syncRecordedLocations;
/**
 * 사용자의 여행 목록을 실시간으로 구독합니다.
 */
const subscribeUserTrips = (userId, onUpdate) => {
    const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION), (0, firestore_1.where)("participantIds", "array-contains", userId), (0, firestore_1.orderBy)("updatedAt", "desc"));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const trips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        onUpdate(trips);
    }, (error) => {
        console.error("Error subscribing to user trips:", error);
    });
};
exports.subscribeUserTrips = subscribeUserTrips;
/**
 * 인스턴트 여행(계획 없이 시작)을 생성합니다.
 */
const createInstantTrip = async (userId, userName) => {
    const today = new Date().toISOString().split('T')[0];
    const tripId = (0, common_1.generateId)();
    const newTrip = {
        id: tripId,
        title: `즉흥 여행 - ${today}`,
        dates: {
            startDate: today,
            endDate: today,
            flexibilityDays: 0,
        },
        participants: [
            { id: userId, name: userName, role: 'me', status: 'accepted' }
        ],
        locations: {
            regionNames: [],
            center: { lat: 37.5665, lng: 126.9780 },
            regions: []
        },
        budget: {
            commonAllocated: 0,
            individualAllocated: 0,
            totalAllocated: 0,
            baseCurrency: 'KRW',
            currency: 'KRW',
            expenses: [],
            activeCurrencies: [],
            exchanges: [],
            participantBudgets: []
        },
        transportSettings: { useFlight: false, useDriving: true },
        flights: [],
        driving: [],
        publicTransport: [],
        accommodation: [],
        checklist: [],
        reservations: [],
        bucketList: [],
        dailyTimeline: [
            { date: today, day: 1, events: [] }
        ],
        theme: 'nature',
        planningStatus: 'ideation',
        isOverseas: false,
        prepTimeline: []
    };
    const { saveTrip } = await Promise.resolve().then(() => __importStar(require("./tripService")));
    await saveTrip(newTrip, { uid: userId, name: userName });
    return newTrip;
};
exports.createInstantTrip = createInstantTrip;
/**
 * 빠른 여행 시작(Fast Start)용 여행 생성
 */
const createFastTrip = async (userId, userName, title, startDate, endDate, settings) => {
    const tripId = (0, common_1.generateId)();
    // 종료일까지의 날짜 배열 생성 (dailyTimeline용)
    const dailyTimeline = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    let day = 1;
    while (curr <= end) {
        dailyTimeline.push({
            date: curr.toISOString().split('T')[0],
            day: day++,
            events: []
        });
        curr.setDate(curr.getDate() + 1);
    }
    const newTrip = {
        id: tripId,
        title: title || `즉흥 여행 - ${startDate}`,
        dates: {
            startDate,
            endDate,
            flexibilityDays: 0,
        },
        participants: [
            { id: userId, name: userName, role: 'me', status: 'accepted' }
        ],
        locations: {
            regionNames: [],
            center: { lat: 37.5665, lng: 126.9780 },
            regions: []
        },
        budget: {
            commonAllocated: 0,
            individualAllocated: 0,
            totalAllocated: 0,
            baseCurrency: 'KRW',
            currency: 'KRW',
            expenses: [],
            activeCurrencies: [],
            exchanges: [],
            participantBudgets: []
        },
        transportSettings: { useFlight: false, useDriving: true },
        flights: [],
        driving: [],
        publicTransport: [],
        accommodation: [],
        checklist: [],
        reservations: [],
        bucketList: [],
        dailyTimeline,
        recordingSettings: settings,
        theme: 'nature',
        planningStatus: 'confirmed', // 즉흥 시작은 이미 진행 중인 것으로 간주
        isOverseas: false,
        prepTimeline: []
    };
    const { saveTrip } = await Promise.resolve().then(() => __importStar(require("./tripService")));
    await saveTrip(newTrip, { uid: userId, name: userName });
    return newTrip;
};
exports.createFastTrip = createFastTrip;

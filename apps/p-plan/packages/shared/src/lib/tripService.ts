import { collection, doc, getDoc, getDocs, query, where, writeBatch, onSnapshot, setDoc, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
// import { toast } from 'sonner'; // Removed for platform-agnostic shared logic
import { Trip, TripDocument, TripSummary, DailyPlan, TripComment, TripRecordingSettings } from '../types/trip';
import { generateId } from '../types/common';
import { removeUndefined } from './utils';
import { useTripStore } from '../store/tripStore';
import { TripEvent } from '../types/trip';

const TRIPS_COLLECTION = 'trips';
export const DAILY_PLANS_SUB = 'dailyPlans';
export const CHECKLIST_SUB = 'checklist';
export const BUCKET_LIST_SUB = 'bucketList';
export const FLIGHTS_SUB = 'flights';
export const ACCOMMODATION_SUB = 'accommodation';
export const DRIVING_SUB = 'driving';
export const PUBLIC_TRANSPORT_SUB = 'publicTransport';
export const PREP_TIMELINE_SUB = 'prepTimeline';
export const RESERVATIONS_SUB = 'reservations';
export const COMMENTS_SUB = 'comments';
export const LOCATION_HISTORY_SUB = 'locationHistory';
export const PHOTO_HISTORY_SUB = 'photoHistory';

/**
 * 특정 일차에 새로운 이벤트(장소/활동) 추가
 */
export const addTripEvent = async (tripId: string, day: number, event: Partial<TripEvent>): Promise<void> => {
    const { trips, updateTrip } = useTripStore.getState();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found');

    const newEvent: TripEvent = {
        id: Math.random().toString(36).substr(2, 9),
        title: event.title || '새로운 일정',
        type: event.type || 'place',
        startTime: event.startTime || '12:00',
        location: event.location,
        memo: event.memo,
        ...event
    } as TripEvent;

    const newTimeline = trip.dailyTimeline.map(plan => {
        if (plan.day === day) {
            return {
                ...plan,
                events: [...(plan.events || []), newEvent].sort((a, b) => (a.startTime || '') > (b.startTime || '') ? 1 : -1)
            };
        }
        return plan;
    });

    await updateTrip(tripId, { ...trip, dailyTimeline: newTimeline });
};


/**
 * 단일 여행의 메인 정보만 조회 (기본 설정 및 메타데이터)
 */
export const getTripMain = async (tripId: string): Promise<TripDocument | null> => {
    try {
        const tripRef = doc(db, TRIPS_COLLECTION, tripId);
        const docSnap = await getDoc(tripRef);
        
        if (!docSnap.exists()) return null;
        const data = docSnap.data();
        
        // 필수 필드 보장 및 기본값 설정
        const mainData: TripDocument = {
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
    } catch (error) {
        console.error("Error getting trip main document:", error);
        throw error;
    }
};

/**
 * 특정 하위 컬렉션 데이터만 조회 (On-demand loading)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTripSubCollection = async (tripId: string, subCollection: string): Promise<any[]> => {
    try {
        const snap = await getDocs(collection(db, TRIPS_COLLECTION, tripId, subCollection));
        const data = snap.docs.map(d => d.data());
        
        if (subCollection === DAILY_PLANS_SUB) {
            return (data as DailyPlan[]).sort((a, b) => a.day - b.day);
        }
        
        return data;
    } catch (error) {
        console.error(`Error getting sub-collection ${subCollection}:`, error);
        return [];
    }
};

/**
 * 단일 여행 조회 (메인 문서 + 모든 하위 컬렉션 병렬 로드 - 레거시/풀 로드용)
 */
export const getTrip = async (tripId: string): Promise<TripDocument | null> => {
    try {
        const mainData = await getTripMain(tripId);
        if (!mainData) return null;

        const subCollections = [
            DAILY_PLANS_SUB, CHECKLIST_SUB, BUCKET_LIST_SUB,
            FLIGHTS_SUB, ACCOMMODATION_SUB, DRIVING_SUB,
            PUBLIC_TRANSPORT_SUB, PREP_TIMELINE_SUB, RESERVATIONS_SUB,
            COMMENTS_SUB
        ];

        const [
            dailyTimeline, checklist, bucketList,
            flights, accommodation, driving,
            publicTransport, prepTimeline, reservations, comments
        ] = await Promise.all(
            subCollections.map(sub => getTripSubCollection(tripId, sub))
        );

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
            comments: comments.length > 0 ? (comments as TripComment[]) : (mainData.comments || []),
            _loadedSubCollections: subCollections
        };

        return mergedTrip;
    } catch (error) {
        console.error("Error getting full trip data:", error);
        throw error;
    }
};

/**
 * 사용자의 모든 여행 요약 목록 조회
 */
export const getUserTrips = async (userId: string): Promise<TripSummary[]> => {
    try {
        const tripsRef = collection(db, TRIPS_COLLECTION);
        const currentUserId = auth.currentUser?.uid;
        
        let q;
        if (currentUserId === userId) {
            // 자신의 여행은 모두 조회 가능
            q = query(
                tripsRef,
                where("userId", "==", userId)
            );
        } else {
            // 타인의 여행은 public인 것만 조회 가능 (보안 규칙 준수)
            q = query(
                tripsRef,
                where("userId", "==", userId),
                where("visibility", "==", "public")
            );
        }
        
        const querySnapshot = await getDocs(q);
        
        const summaries: TripSummary[] = querySnapshot.docs.map(doc => {
            const data = doc.data() as TripSummary;
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
            } as TripSummary;
        });
        
        summaries.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return summaries;
    } catch (error) {
        console.error("Error getting user trips:", error);
        throw error;
    }
};

/**
 * 사용자의 여행 데이터를 요약하여 통계 및 최근 활동 반환
 */
export const getUserTripSummary = async (userId: string) => {
    try {
        const summaries = await getUserTrips(userId);
        
        // 고유 지역 이름 추출
        const allRegions = summaries.flatMap(s => s.locations.regionNames || []);
        const uniqueRegions = Array.from(new Set(allRegions));
        
        // 공개된 여행 또는 최근 업데이트된 여행 상위 3개
        const recentTrips = summaries.slice(0, 3).map((s: TripSummary) => ({
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
    } catch (error) {
        console.error("Error getting user trip summary:", error);
        return {
            totalTrips: 0,
            locationCount: 0,
            recentTrips: [],
            uniqueRegions: []
        };
    }
};

/**
 * 사용자의 모든 여행 요약 목록을 실시간으로 구독
 */
export const subscribeToUserTrips = (userId: string, callback: (trips: TripSummary[]) => void) => {
    try {
        const tripsRef = collection(db, TRIPS_COLLECTION);
        const currentUserId = auth.currentUser?.uid;
        
        // 권한 규칙 준수: 자신의 여행은 모두, 타인의 여행은 public만
        const q = (currentUserId === userId) 
            ? query(tripsRef, where("userId", "==", userId))
            : query(tripsRef, where("userId", "==", userId), where("visibility", "==", "public"));
        
        return onSnapshot(q, (snapshot) => {
            const summaries: TripSummary[] = snapshot.docs.map(doc => {
                const data = doc.data() as TripSummary;
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
                } as TripSummary;
            });
            
            summaries.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            callback(summaries);
        }, (error) => {
            console.error("Error subscribing to user trips:", error);
        });
    } catch (error) {
        console.error("Error setting up trip subscription:", error);
        throw error;
    }
};

/**
 * 여행 정보의 특정 부분만 업데이트 (효율적인 필드별 업데이트)
 */
export const updateTripInDb = async (tripId: string, updates: Partial<Trip>, user?: { uid: string, name: string, photoURL?: string }) => {
    if (!auth.currentUser) {
        throw new Error("Authentication required to update trip");
    }
    try {
        const batch = writeBatch(db);
        const tripRef = doc(db, TRIPS_COLLECTION, tripId);

        // 1. 메인 문서 업데이트용 필드 추출
        const { 
            dailyTimeline, checklist, bucketList, 
            flights, accommodation, driving, publicTransport,
            prepTimeline, reservations, 
            ...mainFields 
        } = updates;

        // Sync members if participants were updated
        const finalMainFields: Partial<TripDocument> = { ...mainFields };
        if (mainFields.participants) {
            finalMainFields.members = mainFields.participants
                .map((p: { id: string }) => p.id)
                .filter((id: string) => !!id && id.length > 5); // Simple heuristic to filter out dummy IDs like '0-0'
        }

        // 메인 필드가 있다면 업데이트
        if (Object.keys(finalMainFields).length > 0) {
            batch.update(tripRef, { 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(removeUndefined(finalMainFields) as any),
                updatedAt: new Date().toISOString()
            });
        }

        // 2. 하위 컬렉션이 포함된 경우에만 해당 컬렉션들 업데이트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateSubCollection = (items: any[] | undefined, subCollection: string) => {
            if (!items) return;
            // 주의: 하위 컬렉션의 경우 '교체' 방식이므로 기존 데이터를 지우고 새로 쓰거나,
            // 인덱스/ID 기반으로 덮어씁니다. 여기서는 saveTrip의 로직을 따릅니다.
            items.forEach((item, idx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const id = (item as any).id || idx.toString();
                const ref = doc(db, TRIPS_COLLECTION, tripId, subCollection, id);
                batch.set(ref, removeUndefined(item));
            });
        };

        updateSubCollection(dailyTimeline, DAILY_PLANS_SUB);
        updateSubCollection(checklist, CHECKLIST_SUB);
        updateSubCollection(bucketList, BUCKET_LIST_SUB);
        updateSubCollection(flights, FLIGHTS_SUB);
        updateSubCollection(accommodation, ACCOMMODATION_SUB);
        updateSubCollection(driving, DRIVING_SUB);
        updateSubCollection(publicTransport, PUBLIC_TRANSPORT_SUB);
        updateSubCollection(prepTimeline, PREP_TIMELINE_SUB);
        updateSubCollection(reservations, RESERVATIONS_SUB);

        await batch.commit();
    } catch (error) {
        console.error("Error updating trip (selective):", error);
        // toast.error("여행 정보 업데이트 중 오류가 발생했습니다.");
        throw error;
    }
};

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
export const deleteTrip = async (tripId: string) => {
    if (!tripId || !auth.currentUser) return;
    try {
        const batch = writeBatch(db);
        const subCollections = [
            DAILY_PLANS_SUB, CHECKLIST_SUB, BUCKET_LIST_SUB,
            FLIGHTS_SUB, ACCOMMODATION_SUB, DRIVING_SUB,
            PUBLIC_TRANSPORT_SUB, PREP_TIMELINE_SUB, RESERVATIONS_SUB
        ];

        // 1. 모든 하위 컬렉션의 문서들을 찾아 삭제 배치에 추가
        await Promise.all(subCollections.map(async (sub) => {
            const snap = await getDocs(collection(db, TRIPS_COLLECTION, tripId, sub));
            snap.forEach(d => {
                batch.delete(d.ref);
            });
        }));

        // 2. 메인 문서 삭제 추가
        const tripRef = doc(db, TRIPS_COLLECTION, tripId);
        batch.delete(tripRef);

        // 3. 실행
        await batch.commit();
        console.log(`Trip ${tripId} and its sub-collections deleted successfully.`);
    } catch (error) {
        console.error("Error deleting trip and sub-collections:", error);
        // toast.error("여행 삭제 중 오류가 발생했습니다.");
        throw error;
    }
};

/**
 * @deprecated Use recordService.saveFootprintsBatch instead for offline-first capabilities.
 * 모바일기기에서 기록된 위치 정보들을 일괄 동기화 (Firestore 서브컬렉션)
 */
export const syncRecordedLocations = async (tripId: string, locations: { latitude: number, longitude: number, timestamp: number }[]) => {
    try {
        const batch = writeBatch(db);
        locations.forEach((loc) => {
            const id = loc.timestamp.toString(); // 타임스탬프를 ID로 사용 (유니크함 보장)
            const ref = doc(db, TRIPS_COLLECTION, tripId, LOCATION_HISTORY_SUB, id);
            batch.set(ref, loc);
        });
        await batch.commit();
        console.log(`PPLANER: Synced ${locations.length} locations to Firestore.`);
    } catch (error) {
        console.error("Error syncing locations:", error);
        throw error;
    }
};

/**
 * 사용자의 여행 목록을 실시간으로 구독합니다.
 */
export const subscribeUserTrips = (userId: string, onUpdate: (trips: Trip[]) => void) => {
    const q = query(
        collection(db, TRIPS_COLLECTION),
        where("participantIds", "array-contains", userId),
        orderBy("updatedAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const trips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as unknown as Trip));
        onUpdate(trips);
    }, (error) => {
        console.error("Error subscribing to user trips:", error);
    });
};

/**
 * 여행 정보 저장 (로그인 시 Firestore 동기화, 비로그인 시 로컬만 유지)
 */
export const saveTrip = async (trip: Trip, user?: { uid: string, name: string, photoURL?: string }) => {
    // 1. 로컬 스토어 업데이트 (항상 수행)
    const { addTrip, updateTrip, trips } = useTripStore.getState();
    const exists = trips.some(t => t.id === trip.id);
    
    if (exists) {
        updateTrip(trip.id, trip);
    } else {
        addTrip(trip);
    }

    // 2. 로그인 상태인 경우에만 Firestore 동기화
    if (!auth.currentUser || !user || auth.currentUser.uid !== user.uid) {
        console.log("PPLANER: User not signed in. Trip saved to local storage only.");
        return;
    }

    try {
        const batch = writeBatch(db);
        const userId = user.uid;
        const tripRef = doc(db, TRIPS_COLLECTION, trip.id);
        const existingSnap = await getDoc(tripRef);
        
        const now = new Date().toISOString();
        const existingData = existingSnap.exists() ? existingSnap.data() as Partial<TripDocument> : {};
        
        const { 
            dailyTimeline, checklist, bucketList, 
            flights, accommodation, driving, publicTransport,
            prepTimeline, reservations, 
            comments,
            ...mainData 
        } = trip;

        const members = mainData.participants
            ? mainData.participants.map((p: { id: string }) => p.id).filter((id: string) => !!id && id.length > 5)
            : [];
        
        const tripDocData: TripDocument = {
            ...mainData,
            userId: existingData.userId || userId,
            members: members,
            createdAt: existingData.createdAt || now,
            updatedAt: now,
            flightCount: flights?.length || 0,
            accommodationCount: accommodation?.length || 0,
            transportCount: (driving?.length || 0) + (publicTransport?.length || 0),
            planningStatus: mainData.planningStatus || 'ideation',
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
        } as TripDocument;

        batch.set(tripRef, removeUndefined(tripDocData), { merge: true });

        const loadedSubCols = trip._loadedSubCollections || [
            DAILY_PLANS_SUB, CHECKLIST_SUB, BUCKET_LIST_SUB, 
            FLIGHTS_SUB, ACCOMMODATION_SUB, DRIVING_SUB, 
            PUBLIC_TRANSPORT_SUB, PREP_TIMELINE_SUB, RESERVATIONS_SUB, COMMENTS_SUB
        ];
        
        const addToBatch = (items: any[] | undefined, subCollection: string) => {
            if (!loadedSubCols.includes(subCollection)) return;
            if (!items) return;

            items.forEach((item, idx) => {
                const id = (item as any).id || idx.toString();
                const ref = doc(db, TRIPS_COLLECTION, trip.id, subCollection, id);
                batch.set(ref, removeUndefined(item));
            });
        };

        addToBatch(dailyTimeline, DAILY_PLANS_SUB);
        addToBatch(checklist, CHECKLIST_SUB);
        addToBatch(bucketList, BUCKET_LIST_SUB);
        addToBatch(flights, FLIGHTS_SUB);
        addToBatch(accommodation, ACCOMMODATION_SUB);
        addToBatch(driving, DRIVING_SUB);
        addToBatch(publicTransport, PUBLIC_TRANSPORT_SUB);
        addToBatch(prepTimeline, PREP_TIMELINE_SUB);
        addToBatch(reservations, RESERVATIONS_SUB);
        addToBatch(comments, COMMENTS_SUB);

        await batch.commit();
    } catch (error) {
        console.error("Error syncing to Firestore:", error);
        throw error;
    }
};

/**
 * 즉석 여행 시작(Instant Trip)용 여행 생성
 */
export const createInstantTrip = async (
    userId: string, 
    userName: string
): Promise<Trip> => {
    const now = new Date().toISOString();
    const startDate = now.split('T')[0];
    
    const settings: TripRecordingSettings = {
        isRecordingEnabled: true,
        locationIntervals: { high: 300000, medium: 900000, low: 1800000 },
        autoSyncPhotos: true,
    };

    return createFastTrip(userId, userName, '즉흥 여행', startDate, '', settings);
};

/**
 * 빠른 여행 시작(Fast Start)용 여행 생성 (비로그인 지원)
 */
export const createFastTrip = async (
    userId: string, 
    userName: string, 
    title: string, 
    startDate: string, 
    endDate: string, 
    settings: TripRecordingSettings
): Promise<Trip> => {
    const tripId = generateId();
    
    const dailyTimeline: DailyPlan[] = [];
    let curr = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    let day = 1;
    
    if (endDate) {
        while (curr <= end) {
            dailyTimeline.push({
                date: curr.toISOString().split('T')[0],
                day: day++,
                events: []
            });
            curr.setDate(curr.getDate() + 1);
        }
    } else {
        dailyTimeline.push({ date: startDate, day: 1, events: [] });
    }

    const newTrip: Trip = {
        id: tripId,
        title: title || `즉흥 여행 - ${startDate}`,
        dates: {
            startDate,
            endDate: endDate || startDate,
            flexibilityDays: 0,
            isUndecided: !endDate
        },
        participants: userId ? [{ id: userId, name: userName, role: 'me', status: 'accepted' }] : [],
        locations: { regionNames: [], center: { lat: 37.5665, lng: 126.9780 }, regions: [] },
        budget: {
            commonAllocated: 0, individualAllocated: 0, totalAllocated: 0,
            baseCurrency: 'KRW', currency: 'KRW', expenses: [],
            activeCurrencies: [], exchanges: [], participantBudgets: []
        },
        transportSettings: { useFlight: false, useDriving: true },
        flights: [], driving: [], publicTransport: [], accommodation: [],
        checklist: [], reservations: [], bucketList: [],
        dailyTimeline,
        recordingSettings: settings,
        theme: 'nature',
        planningStatus: 'confirmed',
        status: 'active',
        isOverseas: false,
        prepTimeline: []
    };

    // 로그인 정보가 없어도 호출 가능하도록 처리
    await saveTrip(newTrip, userId ? { uid: userId, name: userName } : undefined);
    return newTrip;
};

/**
 * 선택된 사진 및 발자취 데이터를 기반으로 여행을 재구성하고 생성합니다.
 */
export const reconstructTripFromHistory = async (
    userId: string,
    userName: string,
    title: string,
    photos: { uri: string, timestamp: number, latitude?: number, longitude?: number }[],
    footprints: { latitude: number, longitude: number, timestamp: number, memo?: string }[] = []
): Promise<Trip> => {
    const allData = [
        ...photos.map(p => ({ ...p, type: 'photo' as const })),
        ...footprints.map(f => ({ ...f, type: 'location' as const }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    if (allData.length === 0) throw new Error('재구성할 데이터가 없습니다.');

    const startDate = new Date(allData[0].timestamp).toISOString().split('T')[0];
    const endDate = new Date(allData[allData.length - 1].timestamp).toISOString().split('T')[0];

    const settings: TripRecordingSettings = {
        isRecordingEnabled: false,
        locationIntervals: { high: 300000, medium: 900000, low: 1800000 },
        autoSyncPhotos: true,
    };

    // 1. 여행 생성
    const trip = await createFastTrip(userId, userName, title, startDate, endDate, settings);

    // 2. 데이터를 타임라인 이벤트로 변환
    const { updateTrip } = useTripStore.getState();
    const updatedTimeline = [...trip.dailyTimeline];

    // 단순화를 위해 일정 간격(예: 1시간) 혹은 의미 있는 지점(메모, 사진) 위주로 이벤트 생성
    // 여기서는 우선 사진과 메모가 있는 발자취를 우선적으로 이벤트화
    for (const item of allData) {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        const dayPlan = updatedTimeline.find(d => d.date === itemDate);
        
        if (dayPlan) {
            // 사진이거나 메모가 있는 경우에만 이벤트로 추가 (너무 많은 발자취 방지)
            if (item.type === 'photo' || (item as any).memo) {
                const event: TripEvent = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: item.type === 'photo' ? 'photo' : 'sightseeing',
                    title: item.type === 'photo' ? '사진 기록' : ((item as any).memo || '위치 기록'),
                    startTime: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    memo: item.type === 'photo' ? '사진 기반 자동 생성' : '발자취 기반 자동 생성',
                    imageUrls: item.type === 'photo' ? [(item as any).uri] : [],
                    location: item.latitude && item.longitude ? {
                        name: item.type === 'photo' ? '사진 촬영 장소' : ((item as any).memo || '방문 장소'),
                        latitude: item.latitude,
                        longitude: item.longitude
                    } : undefined
                } as TripEvent;
                
                dayPlan.events = [...(dayPlan.events || []), event].sort((a, b) => (a.startTime || '') > (b.startTime || '') ? 1 : -1);
            }
        }
    }

    const finalTrip = { ...trip, dailyTimeline: updatedTimeline, status: 'completed' as const };
    await updateTrip(trip.id, finalTrip);
    
    return finalTrip;
};

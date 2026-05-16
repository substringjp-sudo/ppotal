import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from "firebase/firestore";
import { Auth, getAuth } from "firebase/auth";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { Functions, getFunctions, httpsCallable } from "firebase/functions";
import { setReverseGeocodeHandler, setSearchRegionsHandler } from "./region-service";


import { firebaseConfig } from "@ppotal/ui";

const isConfigured = !!firebaseConfig.apiKey;
const DB_NAME = "(default)";

// Initialize Firebase only when config is available (skips during static build)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

// Initialize Firebase with fallback to avoid null errors during SSR/Build
app = (isConfigured || getApps().length > 0) 
    ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
    : initializeApp({
        apiKey: 'dummy',
        authDomain: 'dummy',
        projectId: 'dummy-project',
        storageBucket: 'dummy',
        messagingSenderId: 'dummy',
        appId: 'dummy'
      });

auth = getAuth(app);

if (typeof window !== 'undefined') {
    // Browser: use persistent multi-tab cache for offline support
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    }, DB_NAME);
} else {
    // Server (SSR): no IndexedDB — use default in-memory cache
    // Reuse existing instance if possible to avoid "settings can no longer be changed"
    try {
        db = getFirestore(app, DB_NAME);
    } catch (e) {
        db = initializeFirestore(app, {}, DB_NAME);
    }
}

storage = getStorage(app);
functions = getFunctions(app, 'asia-northeast3');

// [NEW] 핸들러 등록
if (typeof window !== 'undefined') {
    const reverseGeocodeCallable = httpsCallable(functions, 'reverseGeocode');
    const batchReverseGeocodeCallable = httpsCallable(functions, 'batchReverseGeocode');
    const solveRegionIdsFromPlaceCallable = httpsCallable(functions, 'solveRegionIdsFromPlace');
    const searchRegionsCallable = httpsCallable(functions, 'searchRegions');
    const generateTimelineFromPhotosCallable = httpsCallable(functions, 'generateTimelineFromPhotos');

    setReverseGeocodeHandler(
        async (lat: number, lng: number) => {
            const baseUrl = `${window.location.origin}/data`;
            const result = await reverseGeocodeCallable({ lat, lng, baseUrl });
            return result.data as any;
        },
        async (locations: { lat: number, lng: number }[]) => {
            const baseUrl = `${window.location.origin}/data`;
            const result = await batchReverseGeocodeCallable({ locations, baseUrl });
            return result.data as any;
        }
    );

    setSearchRegionsHandler(async (query: string) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await searchRegionsCallable({ query, baseUrl });
        return result.data as any[];
    });

    (window as any)._solveRegionIdsFromPlace = async (place: any) => {
        const result = await solveRegionIdsFromPlaceCallable({ place });
        return result.data as any;
    };

    (window as any)._searchRegions = async (query: string) => {
        const result = await searchRegionsCallable({ query });
        return result.data as any[];
    };

    (window as any)._generateTimelineFromPhotos = async (photos: any[]) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await generateTimelineFromPhotosCallable({ photos, baseUrl });
        return result.data as any;
    };
}




export { app, auth, db, storage, functions };

// Analytics: Only initialize in browser and if supported
export const initAnalytics = async () => {
    if (typeof window !== "undefined" && isConfigured) {
        const supported = await isSupported();
        if (supported) {
            return getAnalytics(app);
        }
    }
    return null;
};

export default app;

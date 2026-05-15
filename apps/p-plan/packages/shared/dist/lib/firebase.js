"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAnalytics = exports.functions = exports.storage = exports.db = exports.auth = exports.app = void 0;
const app_1 = require("firebase/app");
const analytics_1 = require("firebase/analytics");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
const storage_1 = require("firebase/storage");
const functions_1 = require("firebase/functions");
const region_service_1 = require("./region-service");
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
};
const isConfigured = !!firebaseConfig.apiKey;
const DB_NAME = "(default)";
// Initialize Firebase only when config is available (skips during static build)
let app;
let auth;
let db;
let storage;
let functions;
// Initialize Firebase with fallback to avoid null errors during SSR/Build
exports.app = app = (isConfigured || (0, app_1.getApps)().length > 0)
    ? ((0, app_1.getApps)().length > 0 ? (0, app_1.getApp)() : (0, app_1.initializeApp)(firebaseConfig))
    : (0, app_1.initializeApp)({
        apiKey: 'dummy',
        authDomain: 'dummy',
        projectId: 'dummy-project',
        storageBucket: 'dummy',
        messagingSenderId: 'dummy',
        appId: 'dummy'
    });
exports.auth = auth = (0, auth_1.getAuth)(app);
if (typeof window !== 'undefined') {
    // Browser: use persistent multi-tab cache for offline support
    exports.db = db = (0, firestore_1.initializeFirestore)(app, {
        localCache: (0, firestore_1.persistentLocalCache)({
            tabManager: (0, firestore_1.persistentMultipleTabManager)()
        })
    }, DB_NAME);
}
else {
    // Server (SSR): no IndexedDB — use default in-memory cache
    // Reuse existing instance if possible to avoid "settings can no longer be changed"
    try {
        exports.db = db = (0, firestore_1.getFirestore)(app, DB_NAME);
    }
    catch (e) {
        exports.db = db = (0, firestore_1.initializeFirestore)(app, {}, DB_NAME);
    }
}
exports.storage = storage = (0, storage_1.getStorage)(app);
exports.functions = functions = (0, functions_1.getFunctions)(app, 'asia-northeast3');
// [NEW] 핸들러 등록
if (typeof window !== 'undefined') {
    const reverseGeocodeCallable = (0, functions_1.httpsCallable)(functions, 'reverseGeocode');
    const batchReverseGeocodeCallable = (0, functions_1.httpsCallable)(functions, 'batchReverseGeocode');
    const solveRegionIdsFromPlaceCallable = (0, functions_1.httpsCallable)(functions, 'solveRegionIdsFromPlace');
    const searchRegionsCallable = (0, functions_1.httpsCallable)(functions, 'searchRegions');
    const generateTimelineFromPhotosCallable = (0, functions_1.httpsCallable)(functions, 'generateTimelineFromPhotos');
    (0, region_service_1.setReverseGeocodeHandler)(async (lat, lng) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await reverseGeocodeCallable({ lat, lng, baseUrl });
        return result.data;
    }, async (locations) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await batchReverseGeocodeCallable({ locations, baseUrl });
        return result.data;
    });
    (0, region_service_1.setSearchRegionsHandler)(async (query) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await searchRegionsCallable({ query, baseUrl });
        return result.data;
    });
    window._solveRegionIdsFromPlace = async (place) => {
        const result = await solveRegionIdsFromPlaceCallable({ place });
        return result.data;
    };
    window._searchRegions = async (query) => {
        const result = await searchRegionsCallable({ query });
        return result.data;
    };
    window._generateTimelineFromPhotos = async (photos) => {
        const baseUrl = `${window.location.origin}/data`;
        const result = await generateTimelineFromPhotosCallable({ photos, baseUrl });
        return result.data;
    };
}
// Analytics: Only initialize in browser and if supported
const initAnalytics = async () => {
    if (typeof window !== "undefined" && isConfigured) {
        const supported = await (0, analytics_1.isSupported)();
        if (supported) {
            return (0, analytics_1.getAnalytics)(app);
        }
    }
    return null;
};
exports.initAnalytics = initAnalytics;
exports.default = app;

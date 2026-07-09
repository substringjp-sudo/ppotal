import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import type { FirebaseConfig } from "./types.js";

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function initFirebase(config: FirebaseConfig): FirebaseApp {
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }
  _app = initializeApp(config);
  return _app;
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) throw new Error("Firebase not initialized. Call initFirebase() first.");
  return getApp();
}

export function getFirestoreDb(): Firestore {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (typeof window !== "undefined") {
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });
  } else {
    try {
      _db = getFirestore(app);
    } catch (e) {
      _db = initializeFirestore(app, {});
    }
  }
  return _db;
}

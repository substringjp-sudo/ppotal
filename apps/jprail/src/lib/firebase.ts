import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { firebaseConfig } from "@ppotal/ui";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let dbInstance: Firestore;
try {
  if (typeof window !== "undefined") {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({})
    });
  } else {
    dbInstance = getFirestore(app);
  }
} catch (e) {
  dbInstance = getFirestore(app);
}

const db = dbInstance;
const auth = getAuth(app);
const functions = getFunctions(app, "asia-northeast3"); // 서울 리전 사용

export { app, db, auth, functions };

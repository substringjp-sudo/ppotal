import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import type { FirebaseConfig } from "./types.js";

let _app: FirebaseApp | null = null;

export function initFirebase(config: FirebaseConfig): FirebaseApp {
  if (getApps().length > 0) return getApp();
  _app = initializeApp(config);
  return _app;
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) throw new Error("Firebase not initialized. Call initFirebase() first.");
  return getApp();
}

import { initFirebase } from "@regionevel/data-store";

// Called once in the app root. Safe to call multiple times (idempotent).
export function initializeFirebase() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return; // Firebase not configured — localStorage-only mode

  initFirebase({
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
}

export const firebaseEnabled = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

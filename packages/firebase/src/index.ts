import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, onAuthStateChanged, User, signOut } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig: Record<string, string> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCHVsk1xvYnMn1fSt5uV2XDfiC6qpVYN68",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "p-plan-8a6ae.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "p-plan",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "p-plan.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "860206623180",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:860206623180:web:1b7040908309612c579569",
};

if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
  firebaseConfig.measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const firebaseApp = app;
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// User Profile Type
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  onboarding: {
    portal: boolean;
    jprail: boolean;
    regionevel: boolean;
  };
  createdAt: string;
}

export const DEFAULT_ONBOARDING = {
  portal: false,
  jprail: false,
  regionevel: false,
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  }
  return null;
};

export const createUserProfile = async (user: User): Promise<UserProfile> => {
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    onboarding: { ...DEFAULT_ONBOARDING },
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
  return profile;
};

export const updateOnboardingStatus = async (uid: string, appName: keyof UserProfile['onboarding'], status: boolean) => {
  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const data = userDoc.data() as UserProfile;
    await setDoc(userRef, {
      ...data,
      onboarding: {
        ...data.onboarding,
        [appName]: status
      }
    }, { merge: true });
  }
};

// ----------------------------------------------------
// JPRAIL - REGIONEVEL City ID Mapping Helpers
// ----------------------------------------------------
import cityMapping from "./city_mapping.json";

/**
 * jprail city_id (예: "c1") -> regionevel shapeID (예: "22064153B77932337401071")
 */
export const getRegionevelShapeId = (jprailCityId: string): string | undefined => {
  return (cityMapping as Record<string, string>)[jprailCityId];
};

/**
 * regionevel shapeID (예: "22064153B77932337401071") -> jprail city_id (예: "c1")
 */
export const getJprailCityId = (shapeId: string): string | undefined => {
  if (shapeId.startsWith("c")) return shapeId;
  const entry = Object.entries(cityMapping).find(([_, v]) => v === shapeId);
  return entry ? entry[0] : undefined;
};

/**
 * Regionevel ID를 규격화하는 padId 함수 이식
 */
export const padId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return "";
  const s = typeof id === "string" ? id : String(id);
  const len = s.length;
  if (len === 3 || len === 7 || len === 12) return s;
  const trimmed = s.trim();
  if (trimmed.length === 0) return "";
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const tLen = trimmed.length;
  if (tLen <= 3) return trimmed.padStart(3, "0");
  if (tLen <= 7) return trimmed.padStart(7, "0");
  return trimmed.padStart(12, "0");
};



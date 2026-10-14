import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, onAuthStateChanged, User, signOut, deleteUser, updateProfile } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";
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

export const firebaseApp = app;
export const auth: Auth = getAuth(app);
export const db: Firestore = dbInstance;
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

export const updateUserDisplayName = async (user: User, displayName: string): Promise<void> => {
  await updateProfile(user, { displayName });
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, { displayName }, { merge: true });
};

const deleteCollectionInBatches = async (collRef: any): Promise<void> => {
  try {
    const snap = await getDocs(collRef);
    if (snap.empty) return;

    const docs = snap.docs;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + chunkSize);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn(`[Auth] Failed to batch delete collection:`, err);
  }
};

export const deleteUserProfileAndAuth = async (user: User): Promise<void> => {
  const uid = user.uid;

  // 1. Regionevel: users/{uid}/visits 서브컬렉션 전체 일괄 삭제
  const visitsRef = collection(db, "users", uid, "visits");
  await deleteCollectionInBatches(visitsRef);

  // 2. JP Rail: users/{uid}/trips 서브컬렉션 전체 일괄 삭제
  const tripsRef = collection(db, "users", uid, "trips");
  await deleteCollectionInBatches(tripsRef);

  // 3. users/{uid} 통합 프로필 문서 삭제
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (err) {
    console.warn("[Auth] Failed to delete user profile document:", err);
  }

  // 4. Firebase Auth 계정 최종 영구 삭제
  await deleteUser(user);
};

export const PORTAL_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://pplaner.com";

export const PORTAL_ACCOUNT_URL = `${PORTAL_BASE_URL}/account`;

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



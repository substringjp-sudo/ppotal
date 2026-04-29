import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import type { AuthUser } from "./types.js";
import { getFirebaseApp } from "./firebase-app.js";

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return toAuthUser(result.user);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeAuthState(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) =>
    callback(user ? toAuthUser(user) : null),
  );
}

"use client";

import { create } from "zustand";
import {
  subscribeAuthState,
  signInWithGoogle,
  signOutUser,
  createFirestoreVisitStore,
  SyncManager,
} from "@regionevel/data-store";
import type { AuthUser } from "@regionevel/data-store";
import { firebaseEnabled } from "@/lib/firebase";
import { useVisitStore } from "./visitStore";

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  syncManager: SyncManager | null;
  init: () => () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  syncManager: null,

  init() {
    if (!firebaseEnabled) {
      set({ loading: false });
      return () => undefined;
    }

    const unsubAuth = subscribeAuthState(async (user) => {
      const prev = get();
      prev.syncManager?.stop();

      if (user) {
        const remote = createFirestoreVisitStore(user.uid);
        const syncManager = new SyncManager(remote, {
          getLocalVisits: () => useVisitStore.getState().visits,
          setVisits: (visits) => useVisitStore.setState({ visits }),
        });
        await syncManager.start();
        set({ user, loading: false, syncManager });
      } else {
        set({ user: null, loading: false, syncManager: null });
      }
    });

    return unsubAuth;
  },

  async login() {
    await signInWithGoogle();
  },

  async logout() {
    get().syncManager?.stop();
    await signOutUser();
    set({ user: null, syncManager: null });
  },
}));

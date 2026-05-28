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

    // Generation counter: if auth fires again before a previous async callback
    // finishes, the stale callback detects the mismatch and aborts.
    let gen = 0;

    const unsubAuth = subscribeAuthState(async (user) => {
      const myGen = ++gen;

      // Stop any previously active sync session.
      get().syncManager?.stop();

      if (user) {
        const remote = createFirestoreVisitStore(user.uid);
        const syncManager = new SyncManager(remote, {
          getLocalVisits: () => useVisitStore.getState().visits,
          setVisits: (visits) => {
            useVisitStore.setState({ visits });
            useVisitStore.getState().recalculateScores();
          },
          subscribe: (cb) =>
            useVisitStore.subscribe((state) => cb(state.visits)),
        });

        try {
          await syncManager.start();
        } catch (err) {
          console.error("[SyncManager] failed to start:", err);
          if (myGen !== gen) return;
          // Proceed as logged-in but without cloud sync.
          set({ user, loading: false, syncManager: null });
          return;
        }

        if (myGen !== gen) {
          // A newer auth event arrived while we were awaiting — discard.
          syncManager.stop();
          return;
        }
        set({ user, loading: false, syncManager });
      } else {
        if (myGen !== gen) return;
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

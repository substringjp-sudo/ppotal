import { initFirebase } from "@regionevel/data-store";
import { firebaseConfig } from "@ppotal/ui";

// Called once in the app root. Safe to call multiple times (idempotent).
export function initializeFirebase() {
  initFirebase(firebaseConfig);
}

export const firebaseEnabled = true;

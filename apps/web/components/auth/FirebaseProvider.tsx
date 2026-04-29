"use client";

import { useEffect } from "react";
import { initializeFirebase } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    initializeFirebase();
    const unsub = init();
    return unsub;
  }, [init]);

  return <>{children}</>;
}

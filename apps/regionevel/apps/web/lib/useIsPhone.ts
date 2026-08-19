"use client";

import { useEffect, useState } from "react";
import { isPhoneViewport } from "./mobile";

/**
 * Whether the app should be showing its phone chrome.
 *
 * Components used to each keep their own `window.innerWidth < 768` listener,
 * which meant a rotation could leave two of them disagreeing for a frame and
 * render a sheet and a pane at the same time. One hook, one rule — and it
 * accounts for landscape, where width alone says "desktop" on a viewport
 * 390px tall.
 *
 * Starts false so the server and the first client render agree; the effect
 * corrects it before paint.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const update = () => setIsPhone(isPhoneViewport(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isPhone;
}

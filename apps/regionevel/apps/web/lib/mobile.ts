/**
 * The mobile layout contract.
 *
 * Everything here is a plain value rather than a CSS class on purpose: these
 * are the numbers the layout has to agree on in both directions — the media
 * query that switches chrome and the JavaScript that decides whether to open a
 * sheet or a pane. Keeping one typed module means the two can never drift.
 */

/**
 * Below this the app is a phone: the map is the whole background, detail
 * arrives as a sheet, and navigation lives behind a menu button. 768 matches
 * Tailwind's `md:` so the classes and the JavaScript agree on where the line
 * is.
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Apple asks for 44pt, Android for 48dp. 44 is the smaller of the two and the
 * one a control has to clear to be usable on either.
 */
export const MIN_TAP_TARGET = 44;

/** Tailwind-ready class for a control that has to be tappable. */
export const TAP_TARGET_CLASS = "min-h-[44px] min-w-[44px]";

/** Heights of the fixed chrome, in CSS pixels. */
export const MOBILE_CHROME = {
  topBar: 56,
  /** The row of map controls floating under the top bar. */
  mapControls: 44,
} as const;

/**
 * Safe-area insets as CSS expressions.
 *
 * `env()` only returns anything once the document opts in with
 * `viewport-fit=cover`, which the root layout now sets. Without that these are
 * all zero and the layout silently runs under the notch and the home
 * indicator, which is exactly the bug this indirection makes obvious.
 */
export const SAFE_AREA = {
  top: "env(safe-area-inset-top, 0px)",
  right: "env(safe-area-inset-right, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: "env(safe-area-inset-left, 0px)",
} as const;

/** True when the viewport is a phone rather than a desktop window. */
export const isPhoneWidth = (width: number) => width <= MOBILE_BREAKPOINT;

/**
 * A phone on its side is still a phone.
 *
 * Width alone gets this wrong: an iPhone in landscape is 844px across, past
 * the breakpoint, so it would be handed a desktop layout on a viewport 390px
 * tall. Height alone gets it wrong the other way, since a short desktop window
 * is not a phone. Both native platforms answer this with size classes; this is
 * the same idea in two numbers.
 */
export const PHONE_LANDSCAPE_MAX_HEIGHT = 450;
export const TABLET_BREAKPOINT = 1024;

export function isPhoneViewport(width: number, height: number) {
  if (isPhoneWidth(width)) return true;
  return height <= PHONE_LANDSCAPE_MAX_HEIGHT && width <= TABLET_BREAKPOINT;
}

/**
 * A short tick when something snaps or is chosen.
 *
 * The web gives one blunt instrument — `navigator.vibrate` — so the intent is
 * named here rather than the duration. iOS Safari does not implement it at
 * all, which is why this is a silent no-op rather than a feature check every
 * call site has to make.
 */
export type HapticIntent = "select" | "limit";

const HAPTIC_MS: Record<HapticIntent, number | number[]> = {
  select: 12,
  limit: [6, 24, 6],
};

export function haptic(intent: HapticIntent) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(HAPTIC_MS[intent]);
  } catch {
    // Some browsers throw when the page has never been interacted with.
  }
}

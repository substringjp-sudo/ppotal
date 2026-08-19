/**
 * The mobile layout contract.
 *
 * Everything here is a plain value rather than a CSS class on purpose. These
 * are the numbers a native shell would need too — detent heights, the minimum
 * size a finger can hit, where the map's usable centre is once sheets and bars
 * are covering it — so keeping them in one typed module means porting the app
 * later is a matter of reading this file rather than measuring the web build.
 */

/**
 * Below this the app is a phone: one column, sheets instead of panes, the map
 * as the whole background. 768 matches the existing `md:` breakpoint so the
 * Tailwind classes and the JavaScript agree on where the line is.
 */
export const MOBILE_BREAKPOINT = 768;
/** Tablets get the phone's chrome but can afford a wider sheet. */
export const TABLET_BREAKPOINT = 1024;

/**
 * Apple asks for 44pt, Android for 48dp. 44 is the smaller of the two and the
 * one a design has to clear to be usable on either.
 */
export const MIN_TAP_TARGET = 44;
/** Anything the user drags needs more room than something they tap once. */
export const MIN_DRAG_TARGET = 56;

/**
 * How far up the screen the bottom sheet rests, as a fraction of the usable
 * height. Named rather than numbered because a native sheet takes detents by
 * name too, and "peek" survives a redesign where 0.14 does not.
 */
export const SHEET_DETENTS = {
    /** Just the grabber and one line of summary. */
    peek: 0.14,
    /** The working height: list visible, map still readable above it. */
    half: 0.52,
    /** Reading a long list. The map is a strip at the top. */
    full: 0.92
} as const;

export type SheetDetent = keyof typeof SHEET_DETENTS;

/**
 * `peek` still has to fit its contents: the grab area, the tab row and one line
 * of summary. On a short phone 14% of the viewport is less than that, and a
 * peek state that clips its own summary is just a bar. Fractions scale, this
 * stops them scaling below useful.
 */
export const SHEET_PEEK_MIN = 176;

export const DETENT_ORDER: SheetDetent[] = ['peek', 'half', 'full'];

/** A flick shorter than this is a tap, not a drag. */
export const SHEET_DRAG_THRESHOLD = 8;
/** Past this speed the sheet follows the throw rather than the finger. */
export const SHEET_FLING_VELOCITY = 0.5;

/** Heights of the fixed chrome, in CSS pixels. */
export const MOBILE_CHROME = {
    topBar: 56,
    /** The row of map controls that floats under the top bar. */
    mapControls: 44,
    /** Space kept clear at the bottom for the sheet's peek state. */
    sheetPeek: 96
} as const;

/**
 * Safe-area insets as CSS expressions.
 *
 * `env()` only returns anything once the document opts in with
 * `viewport-fit=cover`, which is set in the root layout. Without that these are
 * all zero and the layout silently sits under the notch, which is exactly the
 * bug this indirection is meant to make obvious.
 */
export const SAFE_AREA = {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)'
} as const;

/**
 * The part of the map not covered by chrome.
 *
 * Centring on a station means centring it *here*, not in the middle of the
 * viewport — otherwise the thing the user just tapped ends up behind the sheet.
 * A native shell has the same problem with its own bars, so this returns plain
 * numbers rather than touching the DOM.
 */
export function mapVisibleInsets(viewportHeight: number, detent: SheetDetent) {
    const sheet = Math.round(viewportHeight * SHEET_DETENTS[detent]);
    return {
        top: MOBILE_CHROME.topBar + MOBILE_CHROME.mapControls,
        bottom: sheet,
        get centreOffsetY() {
            // Positive means "shift the map down", i.e. the focal point sits
            // above the geometric centre because the sheet eats the bottom.
            return (this.bottom - this.top) / 2;
        }
    };
}

/** True when the viewport is a phone rather than a desktop window. */
export const isPhoneWidth = (width: number) => width <= MOBILE_BREAKPOINT;

/**
 * A phone on its side is still a phone.
 *
 * Width alone gets this wrong: an iPhone 14 in landscape is 844px across, past
 * the breakpoint, so it was being handed the desktop layout — a 350px sidebar
 * and a 320px pane on a viewport 390px tall. Height alone gets it wrong the
 * other way, since a short desktop window is not a phone. Both native platforms
 * answer this with size classes; this is the same idea in two numbers.
 */
export const PHONE_LANDSCAPE_MAX_HEIGHT = 450;

export function isPhoneViewport(width: number, height: number) {
    if (isPhoneWidth(width)) return true;
    return height <= PHONE_LANDSCAPE_MAX_HEIGHT && width <= TABLET_BREAKPOINT;
}

/** Which way the sheet grows. Landscape has no vertical room to give it. */
export type SheetAxis = 'vertical' | 'horizontal';

export const sheetAxisFor = (width: number, height: number): SheetAxis =>
    (height <= PHONE_LANDSCAPE_MAX_HEIGHT && width > height) ? 'horizontal' : 'vertical';

/**
 * Landscape detents, as fractions of the viewport *width*.
 *
 * Reusing the vertical fractions sideways would not work: at 390px tall,
 * `peek` at 14% is 55px and `half` at 52% is 203px, so two of the three
 * detents land within 30px of the 176px floor and the sheet has nowhere to
 * travel. On its side there is width to spare, and the map keeps full height.
 */
export const SHEET_DETENTS_H = {
    /** A grab rail at the edge; the map has the screen. */
    peek: 0.08,
    /** The working width: list beside a still-usable map. */
    half: 0.42,
    /** Reading. The map is a column on the right. */
    full: 0.72
} as const;

/** Below this the landscape panel cannot show a row of content. */
export const SHEET_PEEK_MIN_H = 64;

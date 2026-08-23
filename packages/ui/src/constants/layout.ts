/**
 * Unified Layout Constants for Map-based Applications in Ppotal
 */
export const MAP_LAYOUT_CONSTANTS = {
  /** Top Global Application Header height in px (56px) */
  HEADER_HEIGHT_PX: 56,
  /** 2nd-tier SubHeader height in px (64px, h-16) */
  SUBHEADER_HEIGHT_PX: 64,
  /** Left and Right sidebars standard width in px (350px) */
  SIDEBAR_WIDTH_PX: 350,
  /** Tailwind class for sidebar width */
  SIDEBAR_WIDTH_CLASS: 'w-[350px]',
  /** Standard border radius tokens */
  BORDER_RADIUS: {
    CARD: 'rounded-2xl',
    BUTTON: 'rounded-xl',
    INPUT: 'rounded-xl',
    BADGE: 'rounded-lg',
  },
  /** Standard animation durations */
  ANIMATION: {
    SIDEBAR_SLIDE_MS: 300,
    FADE_MS: 200,
  },
  /** Standard application z-index layering */
  Z_INDEX: {
    MAP: 0,
    WORKSPACE: 10,
    SUBHEADER: 20,
    SIDEBAR: 30,
    HEADER: 50,
    HEADER_DROPDOWN: 60,
    MODAL_BACKDROP: 9990,
    MODAL: 10000,
    MODAL_NESTED: 10100,
    TOAST: 10200,
    TOOLTIP: 10300,
  },
} as const;

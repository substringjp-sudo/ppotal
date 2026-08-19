/**
 * The stacking order, as one list.
 *
 * These numbers were previously written at each call site and had drifted into
 * an order nobody intended: the header and the desktop detail pane were both
 * 2000, so which one covered the other depended on DOM order, and the mobile
 * detail sheet at 3000 sat above the header while its own backdrop at 2999 did
 * not — leaving the header lit and clickable through a dimmed screen.
 *
 * Ordering is a property of the app, not of whichever component was edited
 * last, so it lives here.
 *
 * Leaflet's own panes run 100–1000 in their own coordinate space and are
 * sealed inside the map container's stacking context. Those numbers are
 * Leaflet's business and must not be renumbered against this scale.
 *
 * Gaps of 200 leave room to slot something in without renumbering the rest.
 */
export const Z = {
  /** Floats over the map: breadcrumb, level switch, badges, loading. */
  mapOverlay: 1000,
  /** A sheet that leaves the rest of the app usable. */
  sheet: 1200,
  /** The desktop region detail pane. */
  detailPane: 1400,
  /** The top bar, on both phone and desktop. */
  header: 1600,
  /** Anything that dims the screen behind it, including the mobile detail sheet. */
  modal: 2000,
  /** A dialog raised from inside another dialog. */
  modalNested: 2200,
  /** Transient notices that must outlive whatever raised them. */
  toast: 2400,
  /** Follows the pointer; above everything by definition. */
  tooltip: 2600,
} as const;

export type LayerName = keyof typeof Z;

/**
 * The stacking order, as one list.
 *
 * These numbers were previously written at each call site, and they had drifted
 * into an order nobody intended: the header sat at 10001 and the dialogs at
 * 10000, so a modal's dim backdrop stopped at the top bar and its search field
 * stayed clickable through the dialog. Ordering is a property of the app, not of
 * whichever component was edited last, so it lives here.
 *
 * Two rules keep it working:
 *
 * 1. **Only chrome belongs here.** Leaflet's own panes run 100–1000 in their own
 *    coordinate space, and the map is wrapped in a `z-0` absolutely positioned
 *    div, which makes a stacking context and seals them in. Those numbers are
 *    Leaflet's business — see `PANE_STYLES` in `MapPane.tsx` — and must not be
 *    renumbered against this scale.
 *
 * 2. **A layer that positions itself creates a context for its children.** The
 *    header is `relative` with a z-index, so the search dropdown and language
 *    menu inside it are ordered among themselves and can never escape above a
 *    modal. That is why those two keep their own local numbers.
 *
 * Gaps of 200 leave room to slot something in without renumbering the rest.
 */
export const Z = {
    /** Floats over the map: zoom, style, off-screen markers, loading. */
    mapOverlay: 100,
    /** The phone bottom sheet. Above the map, below anything that covers it. */
    sheet: 200,
    /** Desktop station and line detail panes. */
    detailPane: 300,
    /** The top bar, on both phone and desktop. */
    header: 500,
    /** Dialogs. Above the header, which is the bug this scale was written for. */
    modal: 10000,
    /** A dialog raised from inside another dialog. */
    modalNested: 10100,
    /** Transient notices that must outlive whatever raised them. */
    toast: 10200,
    /** Follows the pointer; above everything by definition. */
    tooltip: 10300,
} as const;

export type LayerName = keyof typeof Z;

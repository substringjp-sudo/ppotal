import L from "leaflet";

/**
 * One shared canvas for the region polygons.
 *
 * `preferCanvas` on the MapContainer already asks Leaflet to draw paths to a
 * canvas, but it builds an implicit renderer per layer group. Handing every
 * layer the *same* renderer keeps it to one surface, and pinning the padding
 * keeps that surface small.
 *
 * Padding is how much beyond the viewport the canvas covers, and its cost is
 * quadratic: padding 2.0 makes a canvas five viewports wide and five tall.
 * 0.25 keeps enough margin that a short pan does not trigger a redraw, at a
 * fraction of the pixels.
 */
const PAD = 0.25;

export const regionCanvas = typeof window !== "undefined" ? L.canvas({ padding: PAD }) : null;

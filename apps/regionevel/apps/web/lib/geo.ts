import type { Feature } from "geojson";
import { padId } from "@regionevel/utils";

// Cache computed BBox for features: [minLng, minLat, maxLng, maxLat]
const bboxCache = new WeakMap<Feature, [number, number, number, number]>();

export function computeFeatureBBox(feature: Feature): [number, number, number, number] | null {
  const cached = bboxCache.get(feature);
  if (cached) return cached;
  if (!feature.geometry) return null;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const geom = feature.geometry;

  const updateRing = (coords: number[][]) => {
    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i];
      if (!pt) continue;
      const x = pt[0];
      const y = pt[1];
      if (x === undefined || y === undefined) continue;
      if (x < minLng) minLng = x;
      if (x > maxLng) maxLng = x;
      if (y < minLat) minLat = y;
      if (y > maxLat) maxLat = y;
    }
  };

  if (geom.type === "Polygon" && geom.coordinates) {
    for (const ring of geom.coordinates) {
      if (ring) updateRing(ring);
    }
  } else if (geom.type === "MultiPolygon" && geom.coordinates) {
    for (const poly of geom.coordinates) {
      if (poly) {
        for (const ring of poly) {
          if (ring) updateRing(ring);
        }
      }
    }
  } else {
    return null;
  }

  if (minLng === Infinity) return null;
  const bbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
  bboxCache.set(feature, bbox);
  return bbox;
}

/** Ray-casting algorithm for a single polygon ring. */
export function isPointInPolygonCoords(point: [number, number], vs: any[]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const p1 = vs[i];
    const p2 = vs[j];
    if (!p1 || !p2) continue;
    const xi = p1[0], yi = p1[1];
    const xj = p2[0], yj = p2[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Point-in-feature test with BBox pre-check for GeoJSON Polygon & MultiPolygon geometries. */
export function isPointInFeature(lng: number, lat: number, feature: Feature): boolean {
  if (!feature.geometry) return false;

  // 1. Fast BBox reject
  const bbox = computeFeatureBBox(feature);
  if (bbox) {
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) {
      return false;
    }
  }

  // 2. Precise Ray-casting
  const geom = feature.geometry;
  if (geom.type === "Polygon" && geom.coordinates && geom.coordinates[0]) {
    return isPointInPolygonCoords([lng, lat], geom.coordinates[0]);
  } else if (geom.type === "MultiPolygon" && geom.coordinates) {
    for (const poly of geom.coordinates) {
      if (poly && poly[0] && isPointInPolygonCoords([lng, lat], poly[0])) return true;
    }
  }
  return false;
}

/** Finds the first feature (of a boundary set) whose polygon contains the point. */
export function findRegionForPoint(
  lat: number,
  lng: number,
  features: Feature[]
): { id: string; name: string } | null {
  for (const feature of features) {
    if (isPointInFeature(lng, lat, feature)) {
      const rawId = feature.properties?.id || feature.properties?.shapeID;
      const id = padId(rawId);
      const name = String(feature.properties?.name || feature.properties?.shapeName || "Unknown");
      if (id) return { id, name };
    }
  }
  return null;
}

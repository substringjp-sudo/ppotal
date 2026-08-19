import { useMemo, useRef } from "react";
import type { LatLngBounds } from "leaflet";
import type { Feature } from "geojson";

/**
 * Leaflet re-projects every vertex of every path it holds on each zoom, so
 * mounting a whole country's municipalities costs a full pass over every
 * polygon ring per zoom step. We hand Leaflet only the features that can
 * actually be on screen instead.
 *
 * The window is padded and only recomputed once the map leaves it, which keeps
 * panning free and makes the recompute rare enough that its cost never lands
 * on a frame the user is watching.
 */

/** How far beyond the viewport the window reaches, as a fraction of its size. */
const PAD = 0.6;

/**
 * Below this many features, windowing costs more than it saves — the world map
 * is ~200 countries and every one of them is usually on screen anyway.
 */
const MIN_FEATURES_TO_WINDOW = 300;

interface Bboxes {
  minLon: Float64Array;
  minLat: Float64Array;
  maxLon: Float64Array;
  maxLat: Float64Array;
}

// Keyed on the array identity, so a new feature set gets fresh boxes and an
// unchanged one never recomputes them.
const bboxCache = new WeakMap<Feature[], Bboxes>();

function accumulateRing(
  ring: any,
  acc: { minLon: number; minLat: number; maxLon: number; maxLat: number },
) {
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const lon = p?.[0];
    const lat = p?.[1];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (lon < acc.minLon) acc.minLon = lon;
    if (lon > acc.maxLon) acc.maxLon = lon;
    if (lat < acc.minLat) acc.minLat = lat;
    if (lat > acc.maxLat) acc.maxLat = lat;
  }
}

function bboxesFor(features: Feature[]): Bboxes {
  const cached = bboxCache.get(features);
  if (cached) return cached;

  const n = features.length;
  const boxes: Bboxes = {
    minLon: new Float64Array(n),
    minLat: new Float64Array(n),
    maxLon: new Float64Array(n),
    maxLat: new Float64Array(n),
  };

  for (let i = 0; i < n; i++) {
    const acc = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
    const geom = features[i]?.geometry as any;

    if (geom?.type === "Polygon") {
      // The outer ring bounds the whole polygon; holes are inside it.
      if (geom.coordinates?.[0]) accumulateRing(geom.coordinates[0], acc);
    } else if (geom?.type === "MultiPolygon") {
      for (const poly of geom.coordinates ?? []) {
        if (poly?.[0]) accumulateRing(poly[0], acc);
      }
    }

    boxes.minLon[i] = acc.minLon;
    boxes.minLat[i] = acc.minLat;
    boxes.maxLon[i] = acc.maxLon;
    boxes.maxLat[i] = acc.maxLat;
  }

  bboxCache.set(features, boxes);
  return boxes;
}

export interface FeatureWindow {
  features: Feature[];
  /**
   * Increments only when the set of features actually changes. Layers key off
   * this instead of `features.length`, which cannot tell two different windows
   * of the same size apart and so leaves stale polygons drawn.
   */
  revision: number;
}

export function useViewportFeatures(
  features: Feature[] | null,
  mapBounds: LatLngBounds | null,
): FeatureWindow {
  const revisionRef = useRef(0);
  const windowRef = useRef<{
    features: Feature[];
    source: Feature[] | null;
    west: number; south: number; east: number; north: number;
  } | null>(null);

  return useMemo(() => {
    if (!features) {
      if (windowRef.current) {
        windowRef.current = null;
        revisionRef.current++;
      }
      return { features: [], revision: revisionRef.current };
    }

    // Without bounds, or with few enough features that windowing cannot pay
    // for itself, show everything rather than nothing.
    if (!mapBounds || features.length < MIN_FEATURES_TO_WINDOW) {
      if (windowRef.current?.source !== features) {
        windowRef.current = {
          features, source: features,
          west: -Infinity, south: -Infinity, east: Infinity, north: Infinity,
        };
        revisionRef.current++;
      }
      return { features: windowRef.current.features, revision: revisionRef.current };
    }

    const viewWest = mapBounds.getWest();
    const viewEast = mapBounds.getEast();
    const viewSouth = mapBounds.getSouth();
    const viewNorth = mapBounds.getNorth();

    const current = windowRef.current;
    const stillCovered = current
      && current.source === features
      && viewWest >= current.west && viewEast <= current.east
      && viewSouth >= current.south && viewNorth <= current.north;

    if (stillCovered) {
      return { features: current!.features, revision: revisionRef.current };
    }

    const padLon = (viewEast - viewWest) * PAD;
    const padLat = (viewNorth - viewSouth) * PAD;
    const west = viewWest - padLon;
    const east = viewEast + padLon;
    const south = viewSouth - padLat;
    const north = viewNorth + padLat;

    const boxes = bboxesFor(features);
    const selected: Feature[] = [];
    for (let i = 0; i < features.length; i++) {
      if (boxes.maxLon[i]! < west || boxes.minLon[i]! > east) continue;
      if (boxes.maxLat[i]! < south || boxes.minLat[i]! > north) continue;
      selected.push(features[i]!);
    }

    windowRef.current = { features: selected, source: features, west, south, east, north };
    revisionRef.current++;
    return { features: selected, revision: revisionRef.current };
  }, [features, mapBounds]);
}

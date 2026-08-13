import { useMemo, useRef } from 'react';
import { LatLngBounds } from 'leaflet';
import { Section } from '../types/railData';

/**
 * Leaflet re-projects every vertex of every Polyline it holds on each zoom.
 * Mounting the whole country therefore costs a full pass over ~170k vertices
 * per layer per zoom — a second of work plus the garbage that comes with it.
 *
 * So we hand Leaflet only the sections that can actually be on screen. The
 * window is padded and only recomputed once the map leaves it, which keeps
 * panning free and makes the recompute rare enough that its cost never lands
 * on a frame the user is watching.
 */

const PAD = 0.6;

interface Bboxes {
    minLon: Float64Array;
    minLat: Float64Array;
    maxLon: Float64Array;
    maxLat: Float64Array;
}

const bboxCache = new WeakMap<Section[], Bboxes>();

function bboxesFor(sections: Section[]): Bboxes {
    const cached = bboxCache.get(sections);
    if (cached) return cached;

    const n = sections.length;
    const boxes: Bboxes = {
        minLon: new Float64Array(n),
        minLat: new Float64Array(n),
        maxLon: new Float64Array(n),
        maxLat: new Float64Array(n)
    };

    for (let i = 0; i < n; i++) {
        const geometry = sections[i]?.geometry;
        if (!geometry || geometry.length === 0) {
            // Empty geometry can never intersect a real viewport.
            boxes.minLon[i] = Infinity;
            boxes.minLat[i] = Infinity;
            boxes.maxLon[i] = -Infinity;
            boxes.maxLat[i] = -Infinity;
            continue;
        }
        let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
        for (let k = 0; k < geometry.length; k++) {
            const lon = geometry[k][0];
            const lat = geometry[k][1];
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        boxes.minLon[i] = minLon;
        boxes.minLat[i] = minLat;
        boxes.maxLon[i] = maxLon;
        boxes.maxLat[i] = maxLat;
    }

    bboxCache.set(sections, boxes);
    return boxes;
}

export interface SectionWindow {
    sections: Section[];
    /** Changes only when the set of sections changes, so layers can key off it. */
    revision: number;
}

export function useViewportSections(
    sections: Section[] | null,
    mapBounds: LatLngBounds | null
): SectionWindow {
    const revisionRef = useRef(0);
    const windowRef = useRef<{
        sections: Section[];
        source: Section[] | null;
        west: number; south: number; east: number; north: number;
    } | null>(null);

    return useMemo(() => {
        if (!sections) {
            windowRef.current = null;
            return { sections: [], revision: revisionRef.current };
        }

        // Without bounds we cannot window; show everything rather than nothing.
        if (!mapBounds) {
            if (windowRef.current?.source !== sections) {
                windowRef.current = {
                    sections, source: sections,
                    west: -Infinity, south: -Infinity, east: Infinity, north: Infinity
                };
                revisionRef.current++;
            }
            return { sections: windowRef.current.sections, revision: revisionRef.current };
        }

        const viewWest = mapBounds.getWest();
        const viewEast = mapBounds.getEast();
        const viewSouth = mapBounds.getSouth();
        const viewNorth = mapBounds.getNorth();

        const current = windowRef.current;
        const stillCovered = current
            && current.source === sections
            && viewWest >= current.west && viewEast <= current.east
            && viewSouth >= current.south && viewNorth <= current.north;

        if (stillCovered) {
            return { sections: current!.sections, revision: revisionRef.current };
        }

        const padLon = (viewEast - viewWest) * PAD;
        const padLat = (viewNorth - viewSouth) * PAD;
        const west = viewWest - padLon;
        const east = viewEast + padLon;
        const south = viewSouth - padLat;
        const north = viewNorth + padLat;

        const boxes = bboxesFor(sections);
        const selected: Section[] = [];
        for (let i = 0; i < sections.length; i++) {
            if (boxes.maxLon[i] < west || boxes.minLon[i] > east) continue;
            if (boxes.maxLat[i] < south || boxes.minLat[i] > north) continue;
            selected.push(sections[i]);
        }

        windowRef.current = { sections: selected, source: sections, west, south, east, north };
        revisionRef.current++;
        return { sections: selected, revision: revisionRef.current };
    }, [sections, mapBounds]);
}

import { RailData } from '../types/railData';
import { buildRouteGraph, RouteGraph, RouteEdge } from './routeSearch';

/**
 * Support for drawing a trip by dragging across the map.
 *
 * Everything here runs locally against the same graph the route generator
 * uses. Dragging used to call a Cloud Function once per station hop, which
 * meant a lock had to block station detection while a request was in flight —
 * so a fast drag simply skipped stations, and a long one was a stutter of
 * round-trips.
 */

export interface SnapStation {
    id: string;
    lat: number;
    lon: number;
}

export interface SnapIndex {
    graph: RouteGraph;
    /** Grid cell -> stations, for cheap "what is near this segment" queries. */
    cells: Map<string, SnapStation[]>;
    byId: Map<string, SnapStation>;
}

/** ~2.2 km cells: small enough to keep queries tiny, big enough to stay sparse. */
const CELL_SIZE = 0.02;

const cellKey = (lat: number, lon: number) =>
    `${Math.floor(lat / CELL_SIZE)}:${Math.floor(lon / CELL_SIZE)}`;

const snapCache = new WeakMap<RailData, SnapIndex>();

/**
 * Indexes every station the graph can actually route through — not the
 * zoom-filtered set the map draws. Snapping to what is drawn is why a line
 * could look connected while the drag refused to follow it: at low zoom most
 * of its stations had been decimated away.
 */
export function buildSnapIndex(railData: RailData): SnapIndex {
    const cached = snapCache.get(railData);
    if (cached) return cached;

    const graph = buildRouteGraph(railData);
    const cells = new Map<string, SnapStation[]>();
    const byId = new Map<string, SnapStation>();

    graph.adj.forEach((_edges, id) => {
        const station = railData.stations?.[id];
        if (!station || !Number.isFinite(station.lat) || !Number.isFinite(station.lon)) return;

        const entry: SnapStation = { id, lat: station.lat, lon: station.lon };
        byId.set(id, entry);

        const key = cellKey(station.lat, station.lon);
        const bucket = cells.get(key);
        if (bucket) bucket.push(entry);
        else cells.set(key, [entry]);
    });

    const index: SnapIndex = { graph, cells, byId };
    snapCache.set(railData, index);
    return index;
}

/** Stations whose cell overlaps the given lat/lon box. */
export function querySnapBox(
    index: SnapIndex,
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number
): SnapStation[] {
    const results: SnapStation[] = [];
    const latFrom = Math.floor(minLat / CELL_SIZE);
    const latTo = Math.floor(maxLat / CELL_SIZE);
    const lonFrom = Math.floor(minLon / CELL_SIZE);
    const lonTo = Math.floor(maxLon / CELL_SIZE);

    // A box this large means the drag jumped across the country; the caller
    // has nothing useful to snap to at that scale.
    if ((latTo - latFrom + 1) * (lonTo - lonFrom + 1) > 4096) return results;

    for (let la = latFrom; la <= latTo; la++) {
        for (let lo = lonFrom; lo <= lonTo; lo++) {
            const bucket = index.cells.get(`${la}:${lo}`);
            if (bucket) results.push(...bucket);
        }
    }
    return results;
}

/** Direct graph neighbours of a station, walking transfers excluded. */
export function railNeighbours(graph: RouteGraph, stationId: string): RouteEdge[] {
    const edges = graph.adj.get(stationId);
    if (!edges) return [];
    return edges.filter(edge => !edge.isWalk);
}

export function findEdge(graph: RouteGraph, fromId: string, toId: string): RouteEdge | null {
    const edges = graph.adj.get(fromId);
    if (!edges) return null;

    let best: RouteEdge | null = null;
    for (const edge of edges) {
        if (edge.isWalk || edge.to !== toId) continue;
        if (!best || edge.distance < best.distance) best = edge;
    }
    return best;
}

export interface ConnectingPath {
    /** Station ids from `fromId` to `toId`, both inclusive. */
    stationIds: string[];
    sectionIds: number[];
    distance: number;
}

export interface ConnectOptions {
    /** Give up past this many stations; a longer answer is not what a drag meant. */
    maxHops?: number;
    /** Give up once the route is this much longer than the straight-line gap. */
    maxDistanceKm?: number;
}

/**
 * Shortest rail path between two stations, bounded so a drag never silently
 * invents a huge detour when the user crossed a gap in the network.
 */
export function findConnectingPath(
    graph: RouteGraph,
    fromId: string,
    toId: string,
    options: ConnectOptions = {}
): ConnectingPath | null {
    if (fromId === toId) return null;
    if (!graph.adj.has(fromId) || !graph.adj.has(toId)) return null;

    const maxHops = options.maxHops ?? 40;
    const maxDistanceKm = options.maxDistanceKm ?? Infinity;

    const best = new Map<string, number>([[fromId, 0]]);
    const hops = new Map<string, number>([[fromId, 0]]);
    const prev = new Map<string, { from: string; edge: RouteEdge }>();

    // Small frontier, so a plain array scan beats the bookkeeping of a heap.
    let frontier: string[] = [fromId];

    while (frontier.length > 0) {
        let pickIndex = 0;
        for (let i = 1; i < frontier.length; i++) {
            if ((best.get(frontier[i]) ?? Infinity) < (best.get(frontier[pickIndex]) ?? Infinity)) {
                pickIndex = i;
            }
        }
        const node = frontier[pickIndex];
        frontier[pickIndex] = frontier[frontier.length - 1];
        frontier.pop();

        const nodeCost = best.get(node) ?? Infinity;
        if (nodeCost > maxDistanceKm) continue;
        if (node === toId) break;

        const nodeHops = hops.get(node) ?? 0;
        if (nodeHops >= maxHops) continue;

        for (const edge of railNeighbours(graph, node)) {
            const cost = nodeCost + edge.distance;
            if (cost > maxDistanceKm) continue;
            if (cost >= (best.get(edge.to) ?? Infinity) - 1e-9) continue;

            best.set(edge.to, cost);
            hops.set(edge.to, nodeHops + 1);
            prev.set(edge.to, { from: node, edge });
            frontier.push(edge.to);
        }
    }

    if (!prev.has(toId)) return null;

    const stationIds: string[] = [toId];
    const sectionIds: number[] = [];
    let distance = 0;
    let cursor = toId;

    while (cursor !== fromId) {
        const link = prev.get(cursor);
        if (!link) return null;
        sectionIds.unshift(...link.edge.sectionIds);
        distance += link.edge.distance;
        cursor = link.from;
        stationIds.unshift(cursor);
    }

    return { stationIds, sectionIds, distance };
}

/** Section geometries in order, for drawing. */
export function geometriesForSections(
    graph: RouteGraph,
    sectionIds: number[]
): [number, number][][] {
    const geometries: [number, number][][] = [];
    sectionIds.forEach(id => {
        const geometry = graph.sections.get(id)?.geometry;
        if (geometry && geometry.length > 1) geometries.push(geometry);
    });
    return geometries;
}

/* ------------------------------------------------------------------ *
 * The trail the user draws
 * ------------------------------------------------------------------ */

export interface Vec {
    x: number;
    y: number;
}

export interface DragSegment {
    /** Stations from the previous waypoint to the new one, both inclusive. */
    path: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    distance: number;
}

export interface DragTrail {
    waypoints: string[];
    segments: DragSegment[];
    /** Concatenated geometry of every settled segment, so redrawing on each
     *  mouse move does not have to rebuild the whole path. */
    drawn: [number, number][][];
    /** Track already covered. Some sections belong to more than one
     *  station-to-station edge — a skip-stop edge and the local edges beneath
     *  it share rails — so consecutive hops would otherwise draw and count the
     *  same stretch twice. */
    usedSections: Set<number>;
}

/** How far off the swept stroke a station may sit and still be picked up. */
export const CORRIDOR_PX = 45;
/** How close the cursor must be to jump to a station that is not adjacent. */
export const JUMP_SNAP_PX = 26;
/** Safety valve for a single mouse event; a normal sweep uses a handful. */
const MAX_HOPS_PER_EVENT = 60;
/** A jump may not wander further than this many stations. */
const JUMP_MAX_HOPS = 12;
/** Degrees of padding around the cursor when asking the index for candidates. */
const JUMP_QUERY_PAD = 0.02;

export function createTrail(startId: string): DragTrail {
    return { waypoints: [startId], segments: [], drawn: [], usedSections: new Set() };
}

function distance(a: Vec, b: Vec) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from `p` to the segment `a`–`b`. */
function pointToSegmentDistance(p: Vec, a: Vec, b: Vec) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(p, a);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function pushSegment(
    graph: RouteGraph,
    trail: DragTrail,
    input: { path: string[]; sectionIds: number[] }
) {
    const sectionIds: number[] = [];
    let distance = 0;

    input.sectionIds.forEach(id => {
        if (trail.usedSections.has(id)) return;
        trail.usedSections.add(id);
        sectionIds.push(id);
        distance += (graph.sections.get(id)?.length || 0) / 1000;
    });

    const segment: DragSegment = {
        path: input.path,
        sectionIds,
        geometries: geometriesForSections(graph, sectionIds),
        distance
    };

    trail.waypoints.push(input.path[input.path.length - 1]);
    trail.segments.push(segment);
    trail.drawn = [...trail.drawn, ...segment.geometries];
}

function popSegment(trail: DragTrail) {
    const removed = trail.segments.pop();
    trail.waypoints.pop();
    if (!removed) return;
    removed.sectionIds.forEach(id => trail.usedSections.delete(id));
    trail.drawn = trail.drawn.slice(0, trail.drawn.length - removed.geometries.length);
}

export interface AdvanceOptions {
    /** Screen position of a station, or null if it cannot be placed. */
    project: (stationId: string) => Vec | null;
    projectLatLon: (lat: number, lon: number) => Vec;
    /** Where the cursor is now, and where it was on the previous event. */
    cursor: Vec;
    strokeStart: Vec;
    cursorLat: number;
    cursorLon: number;
    /** Restricts which lines may be ridden, when the user has filtered the map. */
    isEdgeAllowed?: (lineIds: number[]) => boolean;
}

/**
 * Advances the trail to follow the cursor. Returns true if it changed.
 *
 * The walk is neighbour-first: a normal sweep along a line only ever looks at
 * the current station's own edges, so it cannot wander onto a parallel line or
 * cut a corner through a junction. Only a genuine jump — the cursor landing on
 * a station that is not adjacent — falls back to a bounded search, which keeps
 * a flick across empty map from inventing a route.
 */
export function advanceTrail(
    index: SnapIndex,
    trail: DragTrail,
    options: AdvanceOptions
): boolean {
    const { project, projectLatLon, cursor, strokeStart, isEdgeAllowed } = options;
    const allowed = isEdgeAllowed ?? (() => true);
    let changed = false;

    for (let step = 0; step < MAX_HOPS_PER_EVENT; step++) {
        const current = trail.waypoints[trail.waypoints.length - 1];
        const currentPoint = project(current);
        if (!currentPoint) break;

        const cursorToCurrent = distance(currentPoint, cursor);
        const previous = trail.waypoints[trail.waypoints.length - 2];

        /**
         * A station is picked up when it sits close to the stroke the user just
         * drew, and the cursor has moved past the halfway mark towards it.
         */
        const qualifies = (point: Vec) =>
            pointToSegmentDistance(point, strokeStart, cursor) <= CORRIDOR_PX &&
            distance(point, cursor) < cursorToCurrent;

        // Retracing always undoes. Checking the previous waypoint before any
        // other neighbour is what stops a drag back along the line from
        // forking onto a parallel one and laying a second track over the first.
        if (previous) {
            const previousPoint = project(previous);
            if (previousPoint && qualifies(previousPoint)) {
                popSegment(trail);
                changed = true;
                continue;
            }
        }

        let bestId: string | null = null;
        let bestDistance = Infinity;

        for (const edge of railNeighbours(index.graph, current)) {
            if (!allowed(edge.lineIds)) continue;

            const neighbourPoint = project(edge.to);
            if (!neighbourPoint || !qualifies(neighbourPoint)) continue;

            const cursorToNeighbour = distance(neighbourPoint, cursor);
            if (cursorToNeighbour < bestDistance) {
                bestDistance = cursorToNeighbour;
                bestId = edge.to;
            }
        }

        if (!bestId) break;

        // Returning to any earlier point rewinds to it rather than drawing the
        // same rails a second time.
        const existingIndex = trail.waypoints.indexOf(bestId);
        if (existingIndex !== -1) {
            while (trail.waypoints.length - 1 > existingIndex) popSegment(trail);
            changed = true;
            continue;
        }

        const edge = findEdge(index.graph, current, bestId);
        if (!edge) break;

        pushSegment(index.graph, trail, { path: [current, bestId], sectionIds: edge.sectionIds });
        changed = true;
    }

    // The cursor is sitting on a station the walk could not reach — either it
    // left the rails, or one event covered so much ground that the stroke no
    // longer hugs the track. Bridge it, but only over a short, plausible gap.
    // This runs even after a successful walk so a flick still lands where the
    // cursor actually is.
    const current = trail.waypoints[trail.waypoints.length - 1];
    const currentPoint = project(current);
    if (!currentPoint || distance(currentPoint, cursor) <= JUMP_SNAP_PX) return changed;

    const nearby = querySnapBox(
        index,
        options.cursorLat - JUMP_QUERY_PAD,
        options.cursorLat + JUMP_QUERY_PAD,
        options.cursorLon - JUMP_QUERY_PAD,
        options.cursorLon + JUMP_QUERY_PAD
    );

    let target: string | null = null;
    let targetDistance = JUMP_SNAP_PX;

    for (const candidate of nearby) {
        if (candidate.id === current) continue;
        if (trail.waypoints.includes(candidate.id)) continue;

        const point = projectLatLon(candidate.lat, candidate.lon);
        const toCursor = distance(point, cursor);
        if (toCursor < targetDistance) {
            targetDistance = toCursor;
            target = candidate.id;
        }
    }
    if (!target) return changed;

    const from = index.byId.get(current)!;
    const to = index.byId.get(target)!;
    const gapKm = Math.hypot(from.lat - to.lat, (from.lon - to.lon) * 0.82) * 111;

    const bridge = findConnectingPath(index.graph, current, target, {
        maxHops: JUMP_MAX_HOPS,
        maxDistanceKm: gapKm * 3 + 5
    });
    if (!bridge) return changed;

    pushSegment(index.graph, trail, { path: bridge.stationIds, sectionIds: bridge.sectionIds });
    return true;
}

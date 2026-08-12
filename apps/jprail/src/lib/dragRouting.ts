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
    /** Only ride these lines. Used when a drag is scoped to one line's diagram. */
    allowedLines?: Set<number>;
    /** Edges to ignore, keyed `from|to`. Used to look for a route that avoids one. */
    bannedEdges?: Set<string>;
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
    const { allowedLines, bannedEdges } = options;

    const usable = (from: string, edge: RouteEdge) => {
        if (bannedEdges?.has(`${from}|${edge.to}`) || bannedEdges?.has(`${edge.to}|${from}`)) return false;
        if (allowedLines && !edge.lineIds.some(id => allowedLines.has(id))) return false;
        return true;
    };

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
            if (!usable(node, edge)) continue;
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
 * Track shape
 * ------------------------------------------------------------------ */

/** Points along an edge's real track, running from one station to the other. */
const polylineCache = new WeakMap<SnapIndex, Map<string, [number, number][]>>();

/** Keeps the matching cheap without losing the shape of a curve. */
const MAX_POLYLINE_POINTS = 24;

export function edgePolyline(index: SnapIndex, from: string, edge: RouteEdge): [number, number][] {
    let cache = polylineCache.get(index);
    if (!cache) {
        cache = new Map();
        polylineCache.set(index, cache);
    }

    const key = `${from}|${edge.to}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const start = index.byId.get(from);
    const end = index.byId.get(edge.to);
    const points: [number, number][] = [];

    if (start) points.push([start.lon, start.lat]);

    // Sections are stored without a consistent direction, so each one is turned
    // to continue from wherever the chain has reached.
    let head: [number, number] | undefined = start ? [start.lon, start.lat] : undefined;
    edge.sectionIds.forEach(id => {
        const geometry = index.graph.sections.get(id)?.geometry;
        if (!geometry || geometry.length < 2) return;

        let run = geometry;
        if (head) {
            const toFirst = Math.hypot(geometry[0][0] - head[0], geometry[0][1] - head[1]);
            const toLast = Math.hypot(
                geometry[geometry.length - 1][0] - head[0],
                geometry[geometry.length - 1][1] - head[1]
            );
            if (toLast < toFirst) run = [...geometry].reverse();
        }
        run.forEach(point => points.push(point));
        head = run[run.length - 1];
    });

    if (end) points.push([end.lon, end.lat]);

    // Thin it out evenly; a hundred points per edge buys nothing here.
    let simplified = points;
    if (points.length > MAX_POLYLINE_POINTS) {
        simplified = [];
        for (let i = 0; i < MAX_POLYLINE_POINTS; i++) {
            simplified.push(points[Math.round((i / (MAX_POLYLINE_POINTS - 1)) * (points.length - 1))]);
        }
    }
    if (simplified.length < 2 && start && end) {
        simplified = [[start.lon, start.lat], [end.lon, end.lat]];
    }

    cache.set(key, simplified);
    return simplified;
}

export interface TrackMatch {
    /** How far along the edge the cursor has reached, 0 at one end, 1 at the other. */
    progress: number;
    /** How far the cursor sits off the track, in pixels. */
    offset: number;
    /** The point on the track the cursor is beside. */
    anchor: Vec;
    /** Direction the track runs at that point. */
    tangent: Vec;
}

/** Where the cursor sits relative to one edge's track. */
export function matchToTrack(
    screenPoints: Vec[],
    cursor: Vec
): TrackMatch | null {
    if (screenPoints.length < 2) return null;

    const lengths: number[] = [0];
    for (let i = 1; i < screenPoints.length; i++) {
        lengths.push(lengths[i - 1] + distance(screenPoints[i - 1], screenPoints[i]));
    }
    const total = lengths[lengths.length - 1];
    if (total <= 0) return null;

    let best: TrackMatch | null = null;
    for (let i = 1; i < screenPoints.length; i++) {
        const a = screenPoints[i - 1];
        const b = screenPoints[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) continue;

        let t = ((cursor.x - a.x) * dx + (cursor.y - a.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        const anchor = { x: a.x + t * dx, y: a.y + t * dy };
        const offset = distance(cursor, anchor);

        if (!best || offset < best.offset) {
            const along = lengths[i - 1] + t * Math.sqrt(lengthSquared);
            const length = Math.sqrt(lengthSquared);
            best = {
                progress: along / total,
                offset,
                anchor,
                tangent: { x: dx / length, y: dy / length }
            };
        }
    }
    return best;
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

/** How far off the track the cursor may stray and still be following it. */
export const CORRIDOR_PX = 55;
/** How far along an edge the cursor must get before that station is taken. */
const LATCH_PROGRESS = 0.42;
/** Coming back below this on the edge just travelled gives the station back. */
const UNLATCH_PROGRESS = 0.3;
/** Hovering this close to a station already drawn rewinds to it. */
const UNDO_RADIUS_PX = 22;
/** How much agreeing with the direction of travel is worth, in pixels of slack. */
const HEADING_BONUS_PX = 34;
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
    /** Where the cursor is now. */
    cursor: Vec;
    /** Which way the hand is moving, smoothed over the last few samples. */
    heading: Vec | null;
    cursorLat: number;
    cursorLon: number;
    /** Restricts which lines may be ridden, when the user has filtered the map. */
    isEdgeAllowed?: (lineIds: number[]) => boolean;
}

export interface AdvanceResult {
    /** Whether the recorded route changed. */
    changed: boolean;
    /** Station the cursor is currently pulling towards, for the snap preview. */
    candidate: string | null;
    /** Point on the track beside the cursor — where the guide line should end. */
    anchor: Vec | null;
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
): AdvanceResult {
    const { project, projectLatLon, cursor, heading, isEdgeAllowed } = options;
    const allowed = isEdgeAllowed ?? (() => true);
    let changed = false;

    /** Screen shape of the track between two stations. */
    const trackOf = (from: string, edge: RouteEdge) =>
        edgePolyline(index, from, edge).map(([lon, lat]) => projectLatLon(lat, lon));

    // Hovering a station already on the route takes the drawing back to it.
    // This has to look at the whole route, not just the station next door —
    // reaching back three stops used to do nothing at all.
    for (let i = 0; i < trail.waypoints.length - 1; i++) {
        const point = project(trail.waypoints[i]);
        if (!point || distance(point, cursor) > UNDO_RADIUS_PX) continue;
        while (trail.waypoints.length - 1 > i) popSegment(trail);
        changed = true;
        break;
    }

    let candidate: string | null = null;
    let anchor: Vec | null = null;

    for (let step = 0; step < MAX_HOPS_PER_EVENT; step++) {
        const current = trail.waypoints[trail.waypoints.length - 1];
        const previous = trail.waypoints[trail.waypoints.length - 2];

        // Backing up along the edge just travelled hands the station back,
        // with a gap between the two thresholds so it cannot flutter.
        if (previous) {
            const back = findEdge(index.graph, previous, current);
            const match = back && matchToTrack(trackOf(previous, back), cursor);
            if (match && match.offset <= CORRIDOR_PX && match.progress < UNLATCH_PROGRESS) {
                popSegment(trail);
                changed = true;
                continue;
            }
        }

        let bestId: string | null = null;
        let bestScore = Infinity;
        let bestMatch: TrackMatch | null = null;

        for (const edge of railNeighbours(index.graph, current)) {
            if (!allowed(edge.lineIds)) continue;
            if (edge.to === previous) continue; // handled by the step back above

            const match = matchToTrack(trackOf(current, edge), cursor);
            if (!match || match.offset > CORRIDOR_PX) continue;

            // Judge by the shape actually drawn: how closely the cursor hugs
            // this track, and whether the hand is moving the way it runs.
            // Picking whichever station happened to be nearest is what sent
            // dense areas off down a neighbouring line.
            const agreement = heading
                ? Math.max(0, heading.x * match.tangent.x + heading.y * match.tangent.y)
                : 0;
            const score = match.offset - agreement * HEADING_BONUS_PX;

            if (score < bestScore) {
                bestScore = score;
                bestId = edge.to;
                bestMatch = match;
            }
        }

        if (!bestId || !bestMatch) break;

        // Not far enough along yet: show where it is heading and stop there.
        if (bestMatch.progress < LATCH_PROGRESS) {
            candidate = bestId;
            anchor = bestMatch.anchor;
            break;
        }

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
        candidate = null;
        anchor = null;
    }

    // The cursor is sitting on a station the walk could not reach — either it
    // left the rails, or one event covered so much ground that the stroke no
    // longer hugs the track. Bridge it, but only over a short, plausible gap.
    const current = trail.waypoints[trail.waypoints.length - 1];
    const currentPoint = project(current);
    if (!currentPoint || distance(currentPoint, cursor) <= JUMP_SNAP_PX) {
        return { changed, candidate, anchor };
    }

    const nearby = querySnapBox(
        index,
        options.cursorLat - JUMP_QUERY_PAD,
        options.cursorLat + JUMP_QUERY_PAD,
        options.cursorLon - JUMP_QUERY_PAD,
        options.cursorLon + JUMP_QUERY_PAD
    );

    let target: string | null = null;
    let targetDistance = JUMP_SNAP_PX;

    for (const station of nearby) {
        if (station.id === current) continue;
        if (trail.waypoints.includes(station.id)) continue;

        const point = projectLatLon(station.lat, station.lon);
        const toCursor = distance(point, cursor);
        if (toCursor < targetDistance) {
            targetDistance = toCursor;
            target = station.id;
        }
    }
    if (!target) return { changed, candidate, anchor };

    const from = index.byId.get(current)!;
    const to = index.byId.get(target)!;
    const gapKm = Math.hypot(from.lat - to.lat, (from.lon - to.lon) * 0.82) * 111;

    const bridge = findConnectingPath(index.graph, current, target, {
        maxHops: JUMP_MAX_HOPS,
        maxDistanceKm: gapKm * 3 + 5
    });
    if (!bridge) return { changed, candidate, anchor };

    pushSegment(index.graph, trail, { path: bridge.stationIds, sectionIds: bridge.sectionIds });
    return { changed: true, candidate: null, anchor: null };
}

/**
 * How many stations an edge runs past without stopping.
 *
 * Skip-stop services are modelled as a direct edge alongside the local edges
 * that cover the same rails, so the count is the length of the shortest route
 * between the same two stations that does not use the direct edge.
 */
export function countSkippedStations(graph: RouteGraph, fromId: string, toId: string): number {
    const direct = findEdge(graph, fromId, toId);
    if (!direct) return 0;

    // The local alternative has to be the same line, or the count picks up
    // stations on whatever else happens to run between the two.
    const local = findConnectingPath(graph, fromId, toId, {
        maxHops: 12,
        maxDistanceKm: direct.distance * 1.6 + 1,
        allowedLines: new Set(direct.lineIds),
        bannedEdges: new Set([`${fromId}|${toId}`])
    });
    if (!local) return 0;

    // stationIds includes both ends, so anything beyond those two was passed.
    return Math.max(0, local.stationIds.length - 2);
}

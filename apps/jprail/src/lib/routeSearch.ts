import { RailData, Station, Section } from '../types/railData';
import { haversineDistance } from './graphUtils';

export interface RouteLineInfo {
    id: number;
    name: string;
    name_en?: string;
    name_kr?: string;
    color?: string;
}

/**
 * One continuous ride on a single line (or one walking transfer between
 * co-located stations). This is what the UI draws as a coloured bar / map stroke.
 */
export interface RouteSegment {
    kind: 'rail' | 'walk';
    line: RouteLineInfo | null;
    fromStationId: string;
    toStationId: string;
    fromName: string;
    toName: string;
    stationIds: string[];
    distance: number;
    sectionIds: number[];
    geometries: [number, number][][];
}

export interface CandidateRoute {
    id: string;
    distance: number; // in km
    transferCount: number; // number of line transfers (incl. walking transfers)
    walkCount: number;
    stationIds: string[];
    stationNames: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    lines: RouteLineInfo[];
    segments: RouteSegment[];
    transfers: string[]; // Names of transfer stations
    transferStationIds: string[];
    score: number;
    isShortest?: boolean;
    isFewestTransfers?: boolean;
    isRecommended?: boolean;
}

export interface LegSearchResult {
    legIndex: number;
    startStation: Station;
    endStation: Station;
    candidates: CandidateRoute[];
}

export interface RouteSearchResult {
    legs: LegSearchResult[];
    totalCandidatesCount: number;
    hasTooManyCandidates: boolean;
}

/* ------------------------------------------------------------------ *
 * Graph
 * ------------------------------------------------------------------ */

const WALK_LINE = 0; // pseudo line id for a walking transfer
const UNBOARDED = -1; // state line id meaning "not on a train yet"

/** Walking transfers are only created between same-named stations closer than this. */
const MAX_WALK_TRANSFER_KM = 1.5;

interface RouteEdge {
    to: string;
    distance: number; // km
    /** Real line ids serving this edge, ordered by how much of the edge they cover. */
    lineIds: number[];
    sectionIds: number[];
    isWalk: boolean;
}

interface RouteGraph {
    adj: Map<string, RouteEdge[]>;
    sections: Map<number, Section>;
    stationsByName: Map<string, string[]>;
    /**
     * Some lines are split into several ids at a company border (e.g. 本四備讃線
     * is one id on the JR West side and another on the JR Shikoku side). Riders
     * stay on the same train there, so those ids share a group and crossing
     * between them is not a transfer.
     */
    lineGroup: Map<number, number>;
}

/** Groups line ids that carry the same name and physically meet at a station. */
function buildLineGroups(adj: Map<string, RouteEdge[]>, railData: RailData): Map<number, number> {
    const parent = new Map<number, number>();
    const find = (id: number): number => {
        const p = parent.get(id);
        if (p === undefined || p === id) return id;
        const root = find(p);
        parent.set(id, root);
        return root;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
    };

    const nameOf = (id: number) => railData.lines?.[String(id)]?.name;

    adj.forEach(edges => {
        const lineIds = new Set<number>();
        edges.forEach(edge => {
            if (!edge.isWalk) edge.lineIds.forEach(id => lineIds.add(id));
        });
        if (lineIds.size < 2) return;

        const ids = Array.from(lineIds);
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const nameA = nameOf(ids[i]);
                if (nameA && nameA === nameOf(ids[j])) union(ids[i], ids[j]);
            }
        }
    });

    const groups = new Map<number, number>();
    parent.forEach((_, id) => groups.set(id, find(id)));
    return groups;
}

const graphCache = new WeakMap<RailData, RouteGraph>();

/** Longest chain of joints we will collapse into a single station-to-station edge. */
const MAX_JOINT_CHAIN = 40;

/**
 * station_graph.json is missing a handful of station-to-station links — most
 * importantly the Seto-Ohashi crossing, which leaves all of Shikoku
 * unreachable. The raw section data does contain them, so we rebuild any
 * missing link by collapsing chains of pass-through joints (degree 2) into a
 * single edge. Junction joints are left alone; station_graph already covers
 * those and guessing a through-route there would invent services.
 */
function addContractedJointEdges(
    railData: RailData,
    sections: Map<number, Section>,
    adj: Map<string, RouteEdge[]>
) {
    const incident = new Map<string, { sectionId: number; other: string }[]>();
    const link = (node: string, sectionId: number, other: string) => {
        const list = incident.get(node);
        if (list) list.push({ sectionId, other });
        else incident.set(node, [{ sectionId, other }]);
    };

    sections.forEach(section => {
        if (!section.start || !section.end || section.start === section.end) return;
        link(section.start, section.id, section.end);
        link(section.end, section.id, section.start);
    });

    const isStation = (id: string) => Boolean(railData.stations?.[id]);

    const existing = new Set<string>();
    adj.forEach((edges, from) => edges.forEach(edge => existing.add(`${from}|${edge.to}`)));

    incident.forEach((startEdges, stationId) => {
        if (!isStation(stationId)) return;

        startEdges.forEach(first => {
            const sectionIds = [first.sectionId];
            let previousSection = first.sectionId;
            let cursor = first.other;

            while (!isStation(cursor) && sectionIds.length < MAX_JOINT_CHAIN) {
                const next = (incident.get(cursor) || []).filter(e => e.sectionId !== previousSection);
                if (next.length !== 1) break; // junction or dead end — do not guess
                previousSection = next[0].sectionId;
                sectionIds.push(previousSection);
                cursor = next[0].other;
            }

            if (!isStation(cursor) || cursor === stationId) return;
            if (existing.has(`${stationId}|${cursor}`)) return;

            const lengthByLine = new Map<number, number>();
            let distance = 0;
            sectionIds.forEach(sid => {
                const section = sections.get(sid);
                if (!section) return;
                const km = (section.length || 0) / 1000;
                distance += km;
                if (section.line_id > 0) {
                    lengthByLine.set(section.line_id, (lengthByLine.get(section.line_id) || 0) + km);
                }
            });

            const lineIds = Array.from(lengthByLine.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([lineId]) => lineId);
            if (lineIds.length === 0) return;

            const edge: RouteEdge = {
                to: cursor,
                distance: distance > 0 ? distance : 0.4,
                lineIds,
                sectionIds,
                isWalk: false
            };
            const list = adj.get(stationId);
            if (list) list.push(edge);
            else adj.set(stationId, [edge]);
            existing.add(`${stationId}|${cursor}`);
        });
    });
}

/**
 * Builds a station-level routing graph.
 *
 * Only `section_ids` are used to decide which lines serve an edge — the
 * `available_lines` field in station_graph.json also contains every line that
 * merely *touches* the endpoint stations, so trusting it invents through
 * services that do not exist (and therefore fake "0 transfer" routes).
 */
function buildRouteGraph(railData: RailData): RouteGraph {
    const cached = graphCache.get(railData);
    if (cached) return cached;

    const sections = new Map<number, Section>();
    railData.sections?.sections?.forEach(s => sections.set(s.id, s));

    const adj = new Map<string, RouteEdge[]>();
    const pushEdge = (from: string, edge: RouteEdge) => {
        const list = adj.get(from);
        if (list) list.push(edge);
        else adj.set(from, [edge]);
    };

    const stationGraph = railData.railroadNetwork?.station_graph as
        | Record<string, Record<string, { section_ids?: (number | string)[]; available_lines?: (number | string)[] }>>
        | undefined;

    if (stationGraph) {
        Object.entries(stationGraph).forEach(([from, neighbors]) => {
            if (!adj.has(from)) adj.set(from, []);

            Object.entries(neighbors || {}).forEach(([to, conn]) => {
                if (!conn || from === to) return;

                const sectionIds: number[] = [];
                const lengthByLine = new Map<number, number>();
                let distance = 0;

                (conn.section_ids || []).forEach(raw => {
                    const sid = Number(raw);
                    const sec = sections.get(sid);
                    if (!sec) return;
                    sectionIds.push(sid);
                    const km = (sec.length || 0) / 1000;
                    distance += km;
                    if (sec.line_id > 0) {
                        lengthByLine.set(sec.line_id, (lengthByLine.get(sec.line_id) || 0) + km);
                    }
                });

                if (sectionIds.length === 0) return;
                if (distance <= 0) distance = 0.4;

                const lineIds = Array.from(lengthByLine.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([lineId]) => lineId);

                if (lineIds.length === 0) return;

                pushEdge(from, { to, distance, lineIds, sectionIds, isWalk: false });
            });
        });
    }

    addContractedJointEdges(railData, sections, adj);

    const lineGroup = buildLineGroups(adj, railData);

    // Same-name stations that are not linked by rails (e.g. JR 東京 / 京葉線 東京)
    // get a walking transfer so multi-company itineraries stay reachable.
    const stationsByName = new Map<string, string[]>();
    Object.values(railData.stations || {}).forEach(st => {
        const list = stationsByName.get(st.name);
        if (list) list.push(st.id);
        else stationsByName.set(st.name, [st.id]);
    });

    stationsByName.forEach(ids => {
        if (ids.length < 2) return;
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const a = railData.stations[ids[i]];
                const b = railData.stations[ids[j]];
                if (!a || !b) continue;
                if (!adj.has(a.id) || !adj.has(b.id)) continue;

                const km = haversineDistance([a.lon, a.lat], [b.lon, b.lat]);
                if (km > MAX_WALK_TRANSFER_KM) continue;

                pushEdge(a.id, { to: b.id, distance: km, lineIds: [WALK_LINE], sectionIds: [], isWalk: true });
                pushEdge(b.id, { to: a.id, distance: km, lineIds: [WALK_LINE], sectionIds: [], isWalk: true });
            }
        }
    });

    const graph: RouteGraph = { adj, sections, stationsByName, lineGroup };
    graphCache.set(railData, graph);
    return graph;
}

/** The id all same-line variants collapse to; used everywhere a transfer is judged. */
function groupOf(graph: RouteGraph, lineId: number): number {
    return graph.lineGroup.get(lineId) ?? lineId;
}

/** Every graph node that can stand in for the station the user picked. */
function resolveEndpoints(station: Station, graph: RouteGraph, railData: RailData): Set<string> {
    const ids = new Set<string>();

    if (graph.adj.has(station.id)) ids.add(station.id);
    station.platform_ids?.forEach(pid => {
        if (graph.adj.has(pid)) ids.add(pid);
    });

    // Same-name stations nearby belong to the same "place" for the traveller.
    (graph.stationsByName.get(station.name) || []).forEach(id => {
        if (id === station.id || !graph.adj.has(id)) return;
        const other = railData.stations[id];
        if (!other) return;
        if (haversineDistance([station.lon, station.lat], [other.lon, other.lat]) <= MAX_WALK_TRANSFER_KM) {
            ids.add(id);
        }
    });

    return ids;
}

/* ------------------------------------------------------------------ *
 * Dijkstra over (station, boarded line) states
 * ------------------------------------------------------------------ */

interface HeapItem {
    cost: number;
    node: string;
    line: number;
}

class MinHeap {
    private items: HeapItem[] = [];

    get size() {
        return this.items.length;
    }

    push(item: HeapItem) {
        const items = this.items;
        items.push(item);
        let i = items.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (items[parent].cost <= items[i].cost) break;
            [items[parent], items[i]] = [items[i], items[parent]];
            i = parent;
        }
    }

    pop(): HeapItem | undefined {
        const items = this.items;
        if (items.length === 0) return undefined;
        const top = items[0];
        const last = items.pop()!;
        if (items.length > 0) {
            items[0] = last;
            let i = 0;
            for (;;) {
                const l = i * 2 + 1;
                const r = l + 1;
                let smallest = i;
                if (l < items.length && items[l].cost < items[smallest].cost) smallest = l;
                if (r < items.length && items[r].cost < items[smallest].cost) smallest = r;
                if (smallest === i) break;
                [items[smallest], items[i]] = [items[i], items[smallest]];
                i = smallest;
            }
        }
        return top;
    }
}

interface SearchOptions {
    /** Extra cost (in km) charged for every line change. */
    transferPenalty: number;
    /** Line groups whose usage is multiplied in cost, used to force genuinely different alternatives. */
    penalizedLines?: Set<number>;
}

interface RawPath {
    /** nodes[i] -> nodes[i+1] is travelled with lineIds[i] (0 = walking transfer). */
    nodes: string[];
    lineIds: number[];
    /** Same as lineIds, collapsed onto line groups — this is what decides transfers. */
    groupIds: number[];
    edges: RouteEdge[];
    distance: number;
    transfers: number;
}

const PENALIZED_LINE_MULTIPLIER = 3;

function searchPath(
    graph: RouteGraph,
    startIds: Set<string>,
    targetIds: Set<string>,
    options: SearchOptions
): RawPath | null {
    if (startIds.size === 0 || targetIds.size === 0) return null;

    const { transferPenalty, penalizedLines } = options;

    const best = new Map<string, number>();
    const prev = new Map<string, { key: string | null; edge: RouteEdge | null; from: string | null }>();
    const heap = new MinHeap();

    const stateKey = (node: string, line: number) => `${node}|${line}`;

    startIds.forEach(id => {
        const key = stateKey(id, UNBOARDED);
        best.set(key, 0);
        prev.set(key, { key: null, edge: null, from: null });
        heap.push({ cost: 0, node: id, line: UNBOARDED });
    });

    let goalKey: string | null = null;

    while (heap.size > 0) {
        const current = heap.pop()!;
        const currentKey = stateKey(current.node, current.line);
        if (current.cost > (best.get(currentKey) ?? Infinity) + 1e-9) continue;

        // Reaching the target while already on a train ends the search: the
        // heap is ordered by cost, so this is the optimal path for the objective.
        if (current.line !== UNBOARDED && targetIds.has(current.node)) {
            goalKey = currentKey;
            break;
        }

        const edges = graph.adj.get(current.node);
        if (!edges) continue;

        for (const edge of edges) {
            if (edge.isWalk) {
                // Walking only makes sense between two rides.
                if (current.line === UNBOARDED) continue;
                const nextKey = stateKey(edge.to, UNBOARDED);
                const nextCost = current.cost + transferPenalty * 0.7 + edge.distance * 2;
                if (nextCost < (best.get(nextKey) ?? Infinity) - 1e-9) {
                    best.set(nextKey, nextCost);
                    prev.set(nextKey, { key: currentKey, edge, from: current.node });
                    heap.push({ cost: nextCost, node: edge.to, line: UNBOARDED });
                }
                continue;
            }

            // States are keyed by line *group*, so riding across a company
            // border on the same line never looks like a transfer.
            const seenGroups = new Set<number>();
            for (const lineId of edge.lineIds) {
                const group = groupOf(graph, lineId);
                if (seenGroups.has(group)) continue;
                seenGroups.add(group);

                const isTransfer = current.line !== UNBOARDED && current.line !== group;
                const multiplier = penalizedLines?.has(group) ? PENALIZED_LINE_MULTIPLIER : 1;
                const nextCost =
                    current.cost + edge.distance * multiplier + (isTransfer ? transferPenalty : 0);
                const nextKey = stateKey(edge.to, group);
                if (nextCost < (best.get(nextKey) ?? Infinity) - 1e-9) {
                    best.set(nextKey, nextCost);
                    prev.set(nextKey, { key: currentKey, edge, from: current.node });
                    heap.push({ cost: nextCost, node: edge.to, line: group });
                }
            }
        }
    }

    if (!goalKey) return null;

    const nodes: string[] = [];
    const lineIds: number[] = [];
    const groupIds: number[] = [];
    const edges: RouteEdge[] = [];

    let cursor: string | null = goalKey;
    while (cursor) {
        const link = prev.get(cursor);
        if (!link) break;
        const [node, line] = cursor.split('|');
        nodes.push(node);
        if (link.edge && link.key) {
            const edge = link.edge;
            edges.push(edge);
            if (edge.isWalk) {
                lineIds.push(WALK_LINE);
                groupIds.push(WALK_LINE);
            } else {
                const group = Number(line);
                groupIds.push(group);
                // Show the concrete line this edge is signed with, not the group id.
                lineIds.push(edge.lineIds.find(id => groupOf(graph, id) === group) ?? group);
            }
        }
        cursor = link.key;
    }

    nodes.reverse();
    lineIds.reverse();
    groupIds.reverse();
    edges.reverse();

    if (nodes.length < 2) return null;

    let distance = 0;
    edges.forEach(edge => {
        if (!edge.isWalk) distance += edge.distance;
    });

    let transfers = 0;
    let boarded = UNBOARDED;
    groupIds.forEach(group => {
        if (group === WALK_LINE) {
            transfers += 1;
            boarded = UNBOARDED;
            return;
        }
        if (boarded !== UNBOARDED && boarded !== group) transfers += 1;
        boarded = group;
    });

    return { nodes, lineIds, groupIds, edges, distance, transfers };
}

/* ------------------------------------------------------------------ *
 * Candidate assembly
 * ------------------------------------------------------------------ */

/** Objectives, in the order they are attempted. */
const MIN_TRANSFER_PENALTY = 1_000_000; // effectively lexicographic: transfers first, then km
const BALANCED_PENALTY = 25; // a transfer is worth ~25 km of detour
const FAST_PENALTY = 6; // mostly distance, but still avoids nonsense line-hopping

/** How much worse than the best result an alternative may be before it is dropped. */
const ALT_DISTANCE_SLACK = 1.45;
const ALT_DISTANCE_MARGIN = 5;
const ALT_TRANSFER_SLACK = 2;

const MAX_CANDIDATES_PER_LEG = 4;

/** Score used to order the list — distance with a realistic price on transfers. */
function routeScore(distance: number, transfers: number) {
    return distance + transfers * 12;
}

function buildSegments(path: RawPath, graph: RouteGraph, railData: RailData): RouteSegment[] {
    const nameOf = (id: string) => railData.stations[id]?.name || id;
    const lineInfo = (lineId: number): RouteLineInfo | null => {
        if (lineId === WALK_LINE) return null;
        const meta = railData.lines?.[String(lineId)];
        return {
            id: lineId,
            name: meta?.name || `Line ${lineId}`,
            name_en: meta?.name_en,
            name_kr: meta?.name_kr,
            color: meta?.color || '#64748b'
        };
    };

    const segments: RouteSegment[] = [];
    const segmentGroups: number[] = [];

    for (let i = 0; i < path.lineIds.length; i++) {
        const lineId = path.lineIds[i];
        const group = path.groupIds[i];
        const edge = path.edges[i];
        const from = path.nodes[i];
        const to = path.nodes[i + 1];
        const isWalk = lineId === WALK_LINE;

        const last = segments[segments.length - 1];
        const continues =
            last && !isWalk && last.kind === 'rail' && segmentGroups[segments.length - 1] === group;

        const geometries: [number, number][][] = [];
        edge.sectionIds.forEach(sid => {
            const geometry = graph.sections.get(sid)?.geometry;
            if (geometry && geometry.length > 0) geometries.push(geometry);
        });

        if (continues) {
            last.toStationId = to;
            last.toName = nameOf(to);
            last.stationIds.push(to);
            last.distance += edge.distance;
            last.sectionIds.push(...edge.sectionIds);
            last.geometries.push(...geometries);
        } else {
            segments.push({
                kind: isWalk ? 'walk' : 'rail',
                line: lineInfo(lineId),
                fromStationId: from,
                toStationId: to,
                fromName: nameOf(from),
                toName: nameOf(to),
                stationIds: [from, to],
                distance: isWalk ? 0 : edge.distance,
                sectionIds: [...edge.sectionIds],
                geometries
            });
            segmentGroups.push(group);
        }
    }

    segments.forEach(seg => {
        seg.distance = Math.round(seg.distance * 10) / 10;
    });

    return segments;
}

function toCandidate(
    path: RawPath,
    graph: RouteGraph,
    railData: RailData,
    legIndex: number,
    index: number
): CandidateRoute {
    const segments = buildSegments(path, graph, railData);

    const sectionIds: number[] = [];
    const geometries: [number, number][][] = [];
    segments.forEach(seg => {
        sectionIds.push(...seg.sectionIds);
        geometries.push(...seg.geometries);
    });

    const lines: RouteLineInfo[] = [];
    segments.forEach(seg => {
        if (seg.line && (lines.length === 0 || lines[lines.length - 1].id !== seg.line.id)) {
            lines.push(seg.line);
        }
    });

    const transferStationIds: string[] = [];
    const transfers: string[] = [];
    for (let i = 1; i < segments.length; i++) {
        const id = segments[i].fromStationId;
        if (!transferStationIds.includes(id)) {
            transferStationIds.push(id);
            transfers.push(segments[i].fromName);
        }
    }

    const distance = Math.round(path.distance * 10) / 10;

    return {
        id: `leg${legIndex}_cand${index}`,
        distance,
        transferCount: path.transfers,
        walkCount: segments.filter(s => s.kind === 'walk').length,
        stationIds: path.nodes,
        stationNames: path.nodes.map(id => railData.stations[id]?.name || id),
        sectionIds,
        geometries,
        lines,
        segments,
        transfers,
        transferStationIds,
        score: routeScore(distance, path.transfers)
    };
}

/** Lines that carry most of a route — banning these produces a genuinely different itinerary. */
function dominantLines(path: RawPath): number[] {
    const byLine = new Map<number, number>();
    path.groupIds.forEach((group, i) => {
        if (group === WALK_LINE) return;
        byLine.set(group, (byLine.get(group) || 0) + path.edges[i].distance);
    });
    return Array.from(byLine.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([group]) => group);
}

function lineSignature(path: RawPath): string {
    const seq: number[] = [];
    path.groupIds.forEach(group => {
        if (seq.length === 0 || seq[seq.length - 1] !== group) seq.push(group);
    });
    return seq.join('-');
}

/** Fraction of the shorter route's sections that the two routes share. */
function overlapRatio(a: RawPath, b: RawPath): number {
    const setA = new Set<number>();
    a.edges.forEach(e => e.sectionIds.forEach(s => setA.add(s)));
    const setB = new Set<number>();
    b.edges.forEach(e => e.sectionIds.forEach(s => setB.add(s)));
    if (setA.size === 0 || setB.size === 0) return 0;

    let shared = 0;
    setA.forEach(s => {
        if (setB.has(s)) shared += 1;
    });
    return shared / Math.min(setA.size, setB.size);
}

function searchLeg(
    graph: RouteGraph,
    railData: RailData,
    startStation: Station,
    endStation: Station,
    legIndex: number
): CandidateRoute[] {
    const startIds = resolveEndpoints(startStation, graph, railData);
    const targetIds = resolveEndpoints(endStation, graph, railData);

    // A leg whose endpoints resolve to the same place has nothing to search.
    const isSamePlace =
        startIds.size > 0 &&
        startIds.size === targetIds.size &&
        Array.from(startIds).every(id => targetIds.has(id));
    if (isSamePlace) return [];

    const found: RawPath[] = [];
    const signatures = new Set<string>();

    const accept = (path: RawPath | null): boolean => {
        if (!path) return false;
        const signature = lineSignature(path);
        if (signatures.has(signature)) return false;
        if (found.some(existing => overlapRatio(existing, path) >= 0.9)) return false;
        signatures.add(signature);
        found.push(path);
        return true;
    };

    // Primary objectives: fewest transfers, a realistic balance, and near-shortest.
    [MIN_TRANSFER_PENALTY, BALANCED_PENALTY, FAST_PENALTY].forEach(transferPenalty => {
        if (found.length >= MAX_CANDIDATES_PER_LEG) return;
        accept(searchPath(graph, startIds, targetIds, { transferPenalty }));
    });

    if (found.length === 0) return [];

    const bestDistance = Math.min(...found.map(p => p.distance));
    const bestTransfers = Math.min(...found.map(p => p.transfers));

    // Alternatives: push the search away from the lines already proposed, but
    // discard anything that is only "different" because it detours absurdly.
    const penalizedLines = new Set<number>();
    for (let attempt = 0; attempt < 3 && found.length < MAX_CANDIDATES_PER_LEG; attempt++) {
        found.forEach(path => dominantLines(path).forEach(id => penalizedLines.add(id)));

        const alternative = searchPath(graph, startIds, targetIds, {
            transferPenalty: BALANCED_PENALTY,
            penalizedLines
        });
        if (!alternative) break;
        if (alternative.distance > bestDistance * ALT_DISTANCE_SLACK + ALT_DISTANCE_MARGIN) break;
        if (alternative.transfers > bestTransfers + ALT_TRANSFER_SLACK) break;
        if (!accept(alternative)) break;
    }

    const candidates = found.map((path, index) => toCandidate(path, graph, railData, legIndex, index));

    candidates.sort((a, b) => a.score - b.score || a.distance - b.distance);

    // Badges describe what each route actually is, rather than which query found it.
    let shortest = candidates[0];
    let fewest = candidates[0];
    candidates.forEach(candidate => {
        if (candidate.distance < shortest.distance) shortest = candidate;
        if (
            candidate.transferCount < fewest.transferCount ||
            (candidate.transferCount === fewest.transferCount && candidate.distance < fewest.distance)
        ) {
            fewest = candidate;
        }
    });
    shortest.isShortest = true;
    fewest.isFewestTransfers = true;
    candidates[0].isRecommended = true;

    return candidates;
}

/**
 * Searches candidate routes connecting a series of waypoints (Start -> Via 1 -> ... -> End).
 * Each leg is solved independently and returns up to 4 meaningfully different itineraries.
 */
export function findCandidateRoutes(
    waypoints: Station[],
    railData: RailData | null
): RouteSearchResult {
    if (!railData || !waypoints || waypoints.length < 2) {
        return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
    }

    const graph = buildRouteGraph(railData);

    const legs: LegSearchResult[] = [];
    let totalCandidatesCount = 0;
    let hasTooManyCandidates = false;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const startStation = waypoints[i];
        const endStation = waypoints[i + 1];
        const candidates = searchLeg(graph, railData, startStation, endStation, i);

        if (candidates.length === 0) {
            return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }

        totalCandidatesCount += candidates.length;
        if (candidates.length >= MAX_CANDIDATES_PER_LEG) hasTooManyCandidates = true;

        legs.push({ legIndex: i, startStation, endStation, candidates });
    }

    return { legs, totalCandidatesCount, hasTooManyCandidates };
}

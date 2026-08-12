/**
 * Schematic layout for a single railway line.
 *
 * Real lines are not straight: they branch, rejoin, loop, run skip-stop
 * services that pass stations without stopping, and sometimes come in
 * disconnected pieces. Drawing that by walking the graph and dropping each new
 * run wherever there was room produced long diagonals crossing the diagram.
 *
 * This lays it out the way a transit diagram does:
 *
 *   1. Split off the pieces that are a plain circle — those get drawn as one.
 *   2. Reduce everything else to a tree by lifting out the edges that have
 *      another way round. Those are exactly the skip-stop services, and they
 *      come back as arcs over the stations they pass.
 *   3. Column = depth in that tree, so a branch that rejoins lines back up.
 *   4. Row = one per run of track, assigned so runs never overlap, and on the
 *      side the branch actually leaves towards.
 *
 * The result is purely combinatorial — columns and rows, no pixels — so the
 * caller can size columns to fit its labels.
 */

export type LineEdgeKind = 'track' | 'express';

export interface LineLayoutEdge {
    from: string;
    to: string;
    kind: LineEdgeKind;
    /** Stations the edge runs past, for an express arc's height. */
    passes: number;
}

export interface LineLayoutNode {
    id: string;
    column: number;
    row: number;
}

export interface LineLayoutRing {
    /** Member stations in cycle order. */
    members: string[];
    /** Row the ring is centred on, and the columns it spans. */
    row: number;
    startColumn: number;
    columnSpan: number;
}

export interface LineLayout {
    nodes: Map<string, LineLayoutNode>;
    edges: LineLayoutEdge[];
    rings: LineLayoutRing[];
    columnCount: number;
    rowCount: number;
}

export interface LineLayoutOptions {
    /** The operator's own station order, used to pick where to start drawing. */
    preferredOrder?: string[];
    /** Latitude/longitude per station, so branches leave towards the right side. */
    coordinates?: Map<string, [number, number]>;
}

/** An alternative route longer than this is a different line, not a skip. */
const MAX_EXPRESS_SPAN = 12;

/* ------------------------------------------------------------------ *
 * Graph helpers
 * ------------------------------------------------------------------ */

type Graph = Map<string, Set<string>>;

function cloneGraph(adj: Graph): Graph {
    const copy: Graph = new Map();
    adj.forEach((neighbours, id) => copy.set(id, new Set(neighbours)));
    return copy;
}

function connectedComponents(adj: Graph): string[][] {
    const seen = new Set<string>();
    const components: string[][] = [];

    adj.forEach((_neighbours, start) => {
        if (seen.has(start)) return;
        const stack = [start];
        const members: string[] = [];
        seen.add(start);

        while (stack.length > 0) {
            const node = stack.pop()!;
            members.push(node);
            (adj.get(node) || []).forEach(next => {
                if (seen.has(next)) return;
                seen.add(next);
                stack.push(next);
            });
        }
        components.push(members);
    });

    return components;
}

/** Shortest route between two stations that avoids the direct edge. */
function detourLength(adj: Graph, from: string, to: string, limit: number): number {
    const depth = new Map<string, number>([[from, 0]]);
    let frontier = [from];

    for (let step = 1; step <= limit && frontier.length > 0; step++) {
        const next: string[] = [];
        for (const node of frontier) {
            for (const neighbour of adj.get(node) || []) {
                // The edge under test is the only thing we are not allowed to use.
                if (node === from && neighbour === to) continue;
                if (node === to && neighbour === from) continue;
                if (depth.has(neighbour)) continue;
                if (neighbour === to) return step;
                depth.set(neighbour, step);
                next.push(neighbour);
            }
        }
        frontier = next;
    }
    return Infinity;
}

/** Farthest node from `start`, with the distance — one half of a tree diameter walk. */
function farthest(adj: Graph, start: string, within: Set<string>): { node: string; distance: number } {
    const depth = new Map<string, number>([[start, 0]]);
    const queue = [start];
    let best = { node: start, distance: 0 };

    for (let head = 0; head < queue.length; head++) {
        const node = queue[head];
        const d = depth.get(node)!;
        if (d > best.distance) best = { node, distance: d };

        for (const neighbour of adj.get(node) || []) {
            if (!within.has(neighbour) || depth.has(neighbour)) continue;
            depth.set(neighbour, d + 1);
            queue.push(neighbour);
        }
    }
    return best;
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export function layoutLine(adj: Graph, options: LineLayoutOptions = {}): LineLayout {
    const nodes = new Map<string, LineLayoutNode>();
    const edges: LineLayoutEdge[] = [];
    const rings: LineLayoutRing[] = [];

    if (adj.size === 0) {
        return { nodes, edges, rings, columnCount: 0, rowCount: 0 };
    }

    const orderIndex = new Map<string, number>();
    options.preferredOrder?.forEach((id, index) => orderIndex.set(id, index));

    let nextFreeRow = 0;
    let widestColumn = 0;

    for (const members of connectedComponents(adj)) {
        const within = new Set(members);
        const isRing =
            members.length > 3 && members.every(id => (adj.get(id) ?? new Set<string>()).size === 2);

        if (isRing) {
            const ring = orderRing(adj, members);
            const span = Math.max(3, Math.ceil(ring.length / 2));
            rings.push({
                members: ring,
                row: nextFreeRow + 1,
                startColumn: 0,
                columnSpan: span
            });
            ring.forEach(id => nodes.set(id, { id, column: 0, row: nextFreeRow + 1 }));

            // The ellipse occupies three rows, so the next piece clears it.
            nextFreeRow += 4;
            widestColumn = Math.max(widestColumn, span);
            continue;
        }

        const placed = layoutComponent(adj, within, {
            orderIndex,
            coordinates: options.coordinates,
            baseRow: nextFreeRow
        });

        placed.nodes.forEach(node => nodes.set(node.id, node));
        edges.push(...placed.edges);
        widestColumn = Math.max(widestColumn, placed.columnCount);
        nextFreeRow = placed.nextRow + 1;
    }

    return {
        nodes,
        edges,
        rings,
        columnCount: widestColumn,
        rowCount: Math.max(1, nextFreeRow)
    };
}

/** Walks a plain circle into cycle order. */
function orderRing(adj: Graph, members: string[]): string[] {
    const start = members[0];
    const ordered = [start];
    const seen = new Set([start]);
    let current = start;

    for (let step = 1; step < members.length; step++) {
        const next = Array.from(adj.get(current) || []).find(id => !seen.has(id));
        if (!next) break;
        ordered.push(next);
        seen.add(next);
        current = next;
    }
    return ordered;
}

interface ComponentResult {
    nodes: LineLayoutNode[];
    edges: LineLayoutEdge[];
    columnCount: number;
    nextRow: number;
}

function layoutComponent(
    adj: Graph,
    within: Set<string>,
    context: {
        orderIndex: Map<string, number>;
        coordinates?: Map<string, [number, number]>;
        baseRow: number;
    }
): ComponentResult {
    // --- 1. Column = distance along the line ----------------------------
    //
    // Sweeping outwards from one end gives every edge a direction; the column
    // is then the *longest* way to reach a station, so a chord that
    // short-circuits a few stops does not drag them backwards on top of each
    // other, and a branch that rejoins still lands in the right place.
    const local: Graph = new Map();
    within.forEach(id => {
        const neighbours = new Set<string>();
        (adj.get(id) || []).forEach(n => within.has(n) && neighbours.add(n));
        local.set(id, neighbours);
    });

    const source = pickSource(local, within, context.orderIndex);

    const depth = new Map<string, number>([[source, 0]]);
    const sweep = [source];
    for (let head = 0; head < sweep.length; head++) {
        const node = sweep[head];
        for (const neighbour of local.get(node) || []) {
            if (depth.has(neighbour)) continue;
            depth.set(neighbour, depth.get(node)! + 1);
            sweep.push(neighbour);
        }
    }

    // Edges between equally distant stations have no direction; they are real
    // connections but cannot carry the ordering.
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();
    const crossEdges: { from: string; to: string }[] = [];
    within.forEach(id => {
        successors.set(id, []);
        predecessors.set(id, []);
    });

    const seenEdge = new Set<string>();
    local.forEach((neighbours, from) => {
        neighbours.forEach(to => {
            const key = from < to ? `${from}|${to}` : `${to}|${from}`;
            if (seenEdge.has(key)) return;
            seenEdge.add(key);

            const a = depth.get(from) ?? 0;
            const b = depth.get(to) ?? 0;
            if (a === b) crossEdges.push({ from, to });
            else if (a < b) { successors.get(from)!.push(to); predecessors.get(to)!.push(from); }
            else { successors.get(to)!.push(from); predecessors.get(from)!.push(to); }
        });
    });

    const order = [...within].sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0));
    const column = new Map<string, number>();
    order.forEach(node => {
        const incoming = predecessors.get(node)!;
        const best = incoming.reduce((max, from) => Math.max(max, (column.get(from) ?? 0) + 1), 0);
        column.set(node, incoming.length === 0 ? 0 : best);
    });

    // --- 2. Skeleton: reach each station the long way -------------------
    // Following the longest incoming edge keeps runs of track whole, so a
    // parallel pair of tracks becomes two full branches rather than one
    // chopped in the middle.
    const parent = new Map<string, string | null>();
    order.forEach(node => {
        const incoming = predecessors.get(node)!;
        if (incoming.length === 0) { parent.set(node, null); return; }
        let pick = incoming[0];
        incoming.forEach(from => {
            if ((column.get(from) ?? 0) > (column.get(pick) ?? 0)) pick = from;
        });
        parent.set(node, column.get(pick)! + 1 === column.get(node)! ? pick : null);
    });

    // --- 3. Everything not in the skeleton is drawn over the top ---------
    const extraEdges: LineLayoutEdge[] = [];
    const skeletonKey = new Set<string>();
    order.forEach(node => {
        const p = parent.get(node);
        if (p) skeletonKey.add(node < p ? `${node}|${p}` : `${p}|${node}`);
    });

    const addExtra = (from: string, to: string) => {
        const key = from < to ? `${from}|${to}` : `${to}|${from}`;
        if (skeletonKey.has(key)) return;
        const span = Math.abs((column.get(to) ?? 0) - (column.get(from) ?? 0));
        extraEdges.push({
            from,
            to,
            // A connection reaching over intermediate columns is a service
            // running past those stations; anything else is just a link.
            kind: span >= 2 ? 'express' : 'track',
            passes: Math.max(0, span - 1)
        });
    };

    successors.forEach((tos, from) => tos.forEach(to => addExtra(from, to)));
    crossEdges.forEach(edge => addExtra(edge.from, edge.to));

    // --- 4. Split the skeleton into runs of track, one row each ----------
    const children = new Map<string, string[]>();
    order.forEach(node => children.set(node, []));
    order.forEach(node => {
        const p = parent.get(node);
        if (p) children.get(p)!.push(node);
    });

    const roots = order.filter(node => parent.get(node) === null);

    // Depth of the longest run below each node, so the trunk takes the longest.
    const height = new Map<string, number>();
    for (let i = order.length - 1; i >= 0; i--) {
        const node = order[i];
        const kids = children.get(node)!;
        height.set(node, kids.length === 0 ? 0 : 1 + Math.max(...kids.map(k => height.get(k) ?? 0)));
    }

    interface Chain {
        stations: string[];
        /** Station this run leaves from, if it branches off another. */
        anchor: string | null;
    }

    const chains: Chain[] = [];
    const chainQueue: { start: string; anchor: string | null }[] = roots
        .sort((a, b) => (height.get(b) ?? 0) - (height.get(a) ?? 0))
        .map(root => ({ start: root, anchor: null }));

    while (chainQueue.length > 0) {
        const { start, anchor } = chainQueue.shift()!;
        const stations: string[] = [];
        let cursor: string | undefined = start;

        while (cursor) {
            const at: string = cursor;
            stations.push(at);
            const kids: string[] = [...(children.get(at) ?? [])];
            if (kids.length === 0) break;

            kids.sort((a, b) => (height.get(b) ?? 0) - (height.get(a) ?? 0));
            const [next, ...rest] = kids;
            rest.forEach(kid => chainQueue.push({ start: kid, anchor: at }));
            cursor = next;
        }
        chains.push({ stations, anchor });
    }

    const rowSpans = new Map<number, { from: number; to: number }[]>();
    const rowOf = new Map<string, number>();

    // A clear column either side, so two unrelated runs never look joined.
    const fits = (row: number, from: number, to: number) =>
        !(rowSpans.get(row) || []).some(span => from - 1 <= span.to && to + 1 >= span.from);

    const occupy = (row: number, from: number, to: number) => {
        const spans = rowSpans.get(row);
        if (spans) spans.push({ from, to });
        else rowSpans.set(row, [{ from, to }]);
    };

    chains.forEach(chain => {
        const columns = chain.stations.map(id => column.get(id) ?? 0);
        const from = Math.min(...columns);
        const to = Math.max(...columns);

        let row = 0;
        const anchorRow = chain.anchor !== null ? rowOf.get(chain.anchor) ?? 0 : 0;
        const preferUp = branchGoesUp(chain, context.coordinates);

        if (!fits(anchorRow, from, to)) {
            for (let step = 1; step <= 40; step++) {
                const first = anchorRow + (preferUp ? -step : step);
                if (fits(first, from, to)) { row = first; break; }
                const second = anchorRow + (preferUp ? step : -step);
                if (fits(second, from, to)) { row = second; break; }
                row = first;
            }
        } else {
            row = anchorRow;
        }

        occupy(row, from, to);
        chain.stations.forEach(id => rowOf.set(id, row));
    });

    // --- 5. Face the way the operator numbers the line -------------------
    // The sweep starts from whichever end is furthest away, which is as likely
    // to be the far terminus as the first station.
    const maxColumn = Math.max(...order.map(id => column.get(id) ?? 0));

    const ranked = order
        .map(id => ({ rank: context.orderIndex.get(id), column: column.get(id) ?? 0 }))
        .filter((entry): entry is { rank: number; column: number } => entry.rank !== undefined);

    let mirrored = false;
    if (ranked.length >= 3) {
        const meanRank = ranked.reduce((sum, e) => sum + e.rank, 0) / ranked.length;
        const meanColumn = ranked.reduce((sum, e) => sum + e.column, 0) / ranked.length;
        // Negative covariance means the sweep ran from the far terminus back.
        const covariance = ranked.reduce(
            (sum, e) => sum + (e.rank - meanRank) * (e.column - meanColumn),
            0
        );
        mirrored = covariance < 0;
    }
    const columnOf = (id: string) =>
        mirrored ? maxColumn - (column.get(id) ?? 0) : column.get(id) ?? 0;

    // --- 6. Normalise rows so the component starts at baseRow ------------
    const rows = Array.from(rowOf.values());
    const minRow = rows.length > 0 ? Math.min(...rows) : 0;
    const maxRow = rows.length > 0 ? Math.max(...rows) : 0;

    const nodes: LineLayoutNode[] = order.map(id => ({
        id,
        column: columnOf(id),
        row: context.baseRow + (rowOf.get(id)! - minRow)
    }));

    const trackEdges: LineLayoutEdge[] = [];
    order.forEach(node => {
        const p = parent.get(node);
        if (p) trackEdges.push({ from: p, to: node, kind: 'track', passes: 0 });
    });

    return {
        nodes,
        edges: [...trackEdges, ...extraEdges],
        columnCount: maxColumn + 1,
        nextRow: context.baseRow + (maxRow - minRow)
    };
}

/** Where to start drawing: the operator's first station, else the long end. */
function pickSource(skeleton: Graph, within: Set<string>, orderIndex: Map<string, number>): string {
    const members = Array.from(within);

    let official: string | null = null;
    let officialRank = Infinity;
    members.forEach(id => {
        const rank = orderIndex.get(id);
        if (rank !== undefined && rank < officialRank) {
            officialRank = rank;
            official = id;
        }
    });
    // Only trust it if it is an end of the line, not a station in the middle.
    if (official && (skeleton.get(official) ?? new Set<string>()).size <= 1) return official;

    // Otherwise take one end of the longest run through the component.
    const seed = members.find(id => (skeleton.get(id) ?? new Set<string>()).size === 1) ?? members[0];
    return farthest(skeleton, seed, within).node;
}

/** Branches leave towards the side they really run to, when we know where that is. */
function branchGoesUp(
    chain: { stations: string[]; anchor: string | null },
    coordinates?: Map<string, [number, number]>
): boolean {
    if (!coordinates || !chain.anchor) return true;
    const anchor = coordinates.get(chain.anchor);
    const first = coordinates.get(chain.stations[0]);
    if (!anchor || !first) return true;

    // Coordinates are [lon, lat]; north is up.
    return first[1] >= anchor[1];
}

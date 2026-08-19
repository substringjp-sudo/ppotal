/**
 * A router built from the shipped rail data, for measuring accuracy offline.
 *
 * The app routes on the server. Reproducing that here would test the wrong
 * thing anyway — what stage 1 needs to know is whether the matcher can pick the
 * right station pair given *a* correct router, so this is a plain Dijkstra over
 * station_graph.json with the real section geometries stitched in.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodePolyline } from '../../src/utils/polyline';
import type { CandidateRoute, Router } from '../../src/lib/timeline/types';

const ROOT = resolve(__dirname, '../../public/rail');
const j = (f: string) => JSON.parse(readFileSync(`${ROOT}/${f}`, 'utf8'));

export interface RailFixtures {
    stations: Record<string, { id: string; name: string; lat: number; lon: number }>;
    sectionsMeta: Record<string, { company_id: number; line_id: number; start: string; end: string; length: number }>;
    sectionGeom: Record<string, [number, number][]>;
    graph: Record<string, Record<string, { section_ids: number[]; available_lines: number[] }>>;
    lines: Record<string, { id: number; name: string; name_en: string }>;
}

export function loadFixtures(): RailFixtures {
    const rawGeom: Record<string, string> = j('sections_geom_high.json');
    const sectionGeom: Record<string, [number, number][]> = {};
    for (const [id, enc] of Object.entries(rawGeom)) sectionGeom[id] = decodePolyline(enc);
    return {
        stations: j('stations_master.json'),
        sectionsMeta: j('sections_meta.json'),
        sectionGeom,
        graph: j('station_graph.json'),
        lines: j('lines.json')
    };
}

/**
 * Orient a section's geometry so it runs from `fromStation` to `toStation`.
 * Sections are stored in their own direction, and a route stitched without
 * this reads as a zig-zag that no corridor test would accept.
 */
function orient(
    geom: [number, number][],
    from: { lat: number; lon: number },
    to: { lat: number; lon: number }
): [number, number][] {
    if (geom.length < 2) return geom;
    const head = geom[0], tail = geom[geom.length - 1];
    const dHead = (head[0] - from.lon) ** 2 + (head[1] - from.lat) ** 2;
    const dTail = (tail[0] - from.lon) ** 2 + (tail[1] - from.lat) ** 2;
    void to;
    return dHead <= dTail ? geom : geom.slice().reverse();
}

export function makeLocalRouter(fx: RailFixtures): Router {
    return async (fromId: string, toId: string): Promise<CandidateRoute | null> => {
        if (!fx.graph[fromId] || !fx.graph[toId]) return null;

        // Dijkstra. The network is 9k nodes, so a binary heap is overkill and a
        // sorted-array frontier keeps this readable.
        const dist = new Map<string, number>([[fromId, 0]]);
        const prev = new Map<string, { node: string; sections: number[]; lines: number[] }>();
        const visited = new Set<string>();
        const frontier: [string, number][] = [[fromId, 0]];

        while (frontier.length) {
            frontier.sort((a, b) => a[1] - b[1]);
            const [node] = frontier.shift()!;
            if (visited.has(node)) continue;
            visited.add(node);
            if (node === toId) break;

            const d = dist.get(node)!;
            for (const [next, edge] of Object.entries(fx.graph[node] ?? {})) {
                if (visited.has(next)) continue;
                const meters = edge.section_ids.reduce(
                    (sum, sid) => sum + (fx.sectionsMeta[String(sid)]?.length ?? 0), 0
                ) || 1;
                const nd = d + meters;
                if (nd < (dist.get(next) ?? Infinity)) {
                    dist.set(next, nd);
                    prev.set(next, { node, sections: edge.section_ids, lines: edge.available_lines });
                    frontier.push([next, nd]);
                }
            }
        }

        if (!dist.has(toId)) return null;

        const stationIds: string[] = [];
        const sectionIds: number[] = [];
        const lineIds = new Set<number>();
        const legs: { sections: number[]; from: string; to: string }[] = [];

        let cur = toId;
        while (cur !== fromId) {
            const p = prev.get(cur);
            if (!p) return null;
            stationIds.unshift(cur);
            legs.unshift({ sections: p.sections, from: p.node, to: cur });
            p.lines.forEach(l => lineIds.add(l));
            cur = p.node;
        }
        stationIds.unshift(fromId);

        const geometry: [number, number][] = [];
        for (const leg of legs) {
            const a = fx.stations[leg.from], b = fx.stations[leg.to];
            for (const sid of leg.sections) {
                sectionIds.push(sid);
                const g = fx.sectionGeom[String(sid)];
                if (!g || g.length < 2 || !a || !b) continue;
                const oriented = orient(g, a, b);
                for (const pt of oriented) {
                    const last = geometry[geometry.length - 1];
                    if (!last || last[0] !== pt[0] || last[1] !== pt[1]) geometry.push(pt);
                }
            }
        }

        return {
            fromStationId: fromId,
            toStationId: toId,
            geometry,
            stationIds,
            distance: dist.get(toId)!,
            sectionIds,
            lineIds: Array.from(lineIds)
        };
    };
}

import { StationNode, haversineDistance, LineSegment } from './graphUtils';
import { RailData, Section, Station, Joint } from '../types/railData';

export interface RouteEdge {
    from: string;
    to: string;
    distance: number;
    lineId: string;
    type: 'RAIL' | 'TRANSFER';
    geometry?: [number, number][];
    sectionIds?: number[];
}

export class RoutingGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, RouteEdge[]> = new Map();
    stationToNodes: Map<string, string[]> = new Map();
    lineIdMap: Map<string, string> = new Map();
    lineLengths: Record<string, number> = {};

    // Name to ID mappings for granular data
    companyNameToId: Map<string, string> = new Map();
    lineNameToId: Map<string, string> = new Map();
    sectionsMap: Map<number, Section> = new Map();

    constructor(data?: RailData) {
        if (data) {
            this.loadGranularData(data);
        }
    }

    private loadGranularData(data: RailData) {
        this.nodes.clear();
        this.adj.clear();
        this.stationToNodes.clear();
        this.lineLengths = {};
        this.lineIdMap.clear();
        this.companyNameToId.clear();
        this.lineNameToId.clear();
        this.sectionsMap.clear();

        if (!data.stations || !data.lines || !data.companies || !data.sections) return;

        const companyNameMap = new Map<number, string>();
        Object.values(data.companies).forEach(c => {
            companyNameMap.set(c.id, c.name);
            this.companyNameToId.set(c.name, String(c.id));
        });

        const lineNameMap = new Map<number, { name: string, companyId: number }>();
        Object.values(data.lines).forEach(l => {
            lineNameMap.set(l.id, { name: l.name, companyId: l.corp_id });
            this.lineNameToId.set(l.name, String(l.id));
        });

        // 1. Process Stations
        Object.values(data.stations).forEach((station: Station) => {
            let companyName = "Unknown";
            let lineName = "Unknown";
            let fullLineName = "Unknown::Unknown";

            let pid = "";
            if (station.platform_ids && station.platform_ids.length > 0) {
                pid = station.platform_ids[0];
                const platform = data.platforms[pid];
                if (platform) {
                    const lineInfo = lineNameMap.get(platform.line);
                    companyName = companyNameMap.get(platform.company) || "Unknown";
                    lineName = lineInfo ? lineInfo.name : "Unknown";
                    fullLineName = `${platform.company}::${platform.line}`;
                }
            }

            const node: StationNode = {
                id: station.id,
                name: station.name,
                name_en: station.name_en,
                company: companyName,
                line: lineName,
                companyId: pid ? (data.platforms[pid]?.company || 0) : 0,
                lineId: pid ? (data.platforms[pid]?.line || 0) : 0,
                fullLineId: fullLineName,
                coords: [station.lon, station.lat]
            };

            this.nodes.set(station.id, node);
            this.adj.set(station.id, []);

            if (!this.stationToNodes.has(station.name)) {
                this.stationToNodes.set(station.name, []);
            }
            this.stationToNodes.get(station.name)!.push(station.id);

            // Map platform IDs to the same node
            if (station.platform_ids) {
                station.platform_ids.forEach((pid: string) => {
                    if (pid !== station.id) {
                        this.nodes.set(pid, node);
                    }
                });
            }
        });

        // 1.1 Load Joints if available
        if (data.joints && Array.isArray(data.joints.joints)) {
            data.joints.joints.forEach((joint: Joint) => {
                const node: StationNode = {
                    id: joint.id,
                    name: "Joint",
                    name_en: "Joint",
                    company: "Network",
                    line: "Multiple",
                    companyId: 0,
                    lineId: 0,
                    fullLineId: "0::0",
                    coords: joint.coordinates
                };
                this.nodes.set(joint.id, node);
            });
        }

        // 2. Load Line IDs and populate lineLengths
        data.sections.sections.forEach((s: Section) => this.sectionsMap.set(s.id, s));

        if (data.railroadGraph) {
            Object.entries(data.railroadGraph).forEach(([sourceId, targets]) => {
                Object.entries(targets as Record<string, number[]>).forEach(([targetId, sectionIds]) => {
                    let totalDistance = 0;
                    const combinedGeometry: [number, number][] = [];
                    let lineId = "";
                    let currentPos = sourceId;

                    (sectionIds as number[]).forEach((secId: number) => {
                        const section = this.sectionsMap.get(secId);
                        if (!section) return;

                        // Use numeric IDs for internal lineId
                        const thisLineId = `${section.company_id}::${section.line_id}`;
                        if (!lineId) lineId = thisLineId;

                        totalDistance += section.length / 1000;
                        const geom = section.geometry;
                        if (section.start === currentPos) {
                            combinedGeometry.push(...geom);
                            currentPos = section.end;
                        } else {
                            combinedGeometry.push(...[...geom].reverse());
                            currentPos = section.start;
                        }
                    });

                    const edge: RouteEdge = { from: sourceId, to: targetId, distance: totalDistance, lineId, type: 'RAIL', geometry: combinedGeometry, sectionIds: (sectionIds as number[]) };
                    if (!this.adj.has(sourceId)) this.adj.set(sourceId, []);
                    this.adj.get(sourceId)?.push(edge);

                    const revEdge: RouteEdge = { from: targetId, to: sourceId, distance: totalDistance, lineId, type: 'RAIL', geometry: combinedGeometry ? [...combinedGeometry].reverse() : undefined, sectionIds: (sectionIds as number[]) };
                    if (!this.adj.has(targetId)) this.adj.set(targetId, []);
                    this.adj.get(targetId)?.push(revEdge);

                    if (lineId) {
                        this.lineLengths[lineId] = (this.lineLengths[lineId] || 0) + totalDistance;
                    }
                });
            });
        } else {
            // Build graph directly from sections if pre-computed graph is missing
            data.sections.sections.forEach(section => {
                const lineId = `${section.company_id}::${section.line_id}`;
                const edge: RouteEdge = {
                    from: section.start,
                    to: section.end,
                    distance: section.length / 1000,
                    lineId,
                    type: 'RAIL',
                    geometry: section.geometry,
                    sectionIds: [section.id]
                };

                if (!this.adj.has(section.start)) this.adj.set(section.start, []);
                this.adj.get(section.start)?.push(edge);

                const revEdge: RouteEdge = {
                    from: section.end,
                    to: section.start,
                    distance: section.length / 1000,
                    lineId,
                    type: 'RAIL',
                    geometry: [...section.geometry].reverse(),
                    sectionIds: [section.id]
                };

                if (!this.adj.has(section.end)) this.adj.set(section.end, []);
                this.adj.get(section.end)?.push(revEdge);

                this.lineLengths[lineId] = (this.lineLengths[lineId] || 0) + (section.length / 1000);
            });
        }

        // 3. Transfers
        for (const ids of this.stationToNodes.values()) {
            if (ids.length < 2) continue;
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const u = this.nodes.get(ids[i])!;
                    const v = this.nodes.get(ids[j])!;
                    const dist = haversineDistance(u.coords, v.coords);
                    if (dist < 1.0) {
                        const edge: RouteEdge = { from: u.id, to: v.id, distance: dist, lineId: 'TRANSFER', type: 'TRANSFER' };
                        this.adj.get(u.id)?.push(edge);
                        const revEdge = { ...edge, from: v.id, to: u.id };
                        this.adj.get(v.id)?.push(revEdge);
                    }
                }
            }
        }
    }

    getNode = (id: string): StationNode | undefined => this.nodes.get(id);
    getNodes = (): Map<string, StationNode> => this.nodes;
    getEdge = (fromId: string, toId: string): RouteEdge | undefined => this.adj.get(fromId)?.find(edge => edge.to === toId);
    getLineIdMap = (): Map<string, string> => this.lineIdMap;
    getLineLengths = (): Record<string, number> => this.lineLengths;

    getLineSegments = (lineId: string, hierarchy: any): LineSegment[] => {
        const segments: LineSegment[] = [];
        if (!hierarchy || !this.nodes.size) return [];

        const [companyId, lineNumericId] = lineId.split('::');

        // Direct lookup in companies and lines
        const compEntry = hierarchy.companies?.[companyId];
        if (!compEntry) return [];

        const lineEntry = compEntry.lines?.[lineNumericId];
        if (!lineEntry) return [];

        // Reconstruction PRIORITY:
        // 1. If hierarchy lists sections, use them (most reliable for all parts of line including joints/branches)
        if (lineEntry.sections && lineEntry.sections.length > 0) {
            lineEntry.sections.forEach((secId: number) => {
                const section = this.sectionsMap.get(secId);
                if (section) {
                    segments.push({
                        stations: [section.start, section.end],
                        edges: [{ from: section.start, to: section.end, distance: section.length / 1000 }],
                        geometry: section.geometry
                    });
                }
            });
            if (segments.length > 0) return segments;
        }

        // 2. Fallback to platform-based reconstruction (original logic)
        if (lineEntry.platforms && lineEntry.platforms.length > 0) {
            for (let i = 0; i < lineEntry.platforms.length - 1; i++) {
                const startId = lineEntry.platforms[i].station_id;
                const endId = lineEntry.platforms[i + 1].station_id;

                const directEdge = this.getEdge(startId, endId);
                if (directEdge) {
                    segments.push({
                        stations: [startId, endId],
                        edges: [{ from: startId, to: endId, distance: directEdge.distance }],
                        geometry: directEdge.geometry || []
                    });
                } else {
                    // Fallback to shortest path (handles joints/intermediate nodes)
                    const pathData = this.getShortestPath(startId, endId, [lineId]);
                    if (pathData) {
                        const segmentEdges: { from: string, to: string, distance: number }[] = [];
                        for (let j = 0; j < pathData.path.length - 1; j++) {
                            const u = pathData.path[j];
                            const v = pathData.path[j + 1];
                            const edge = this.getEdge(u, v);
                            if (edge) {
                                segmentEdges.push({ from: u, to: v, distance: edge.distance });
                            }
                        }
                        segments.push({
                            stations: pathData.path,
                            edges: segmentEdges,
                            geometry: pathData.geometries.flat()
                        });
                    }
                }
            }
        }

        return segments;
    }

    getShortestPath = (startId: string, endId: string, allowedLines?: string[]): { path: string[], sectionIds: number[], distance: number, geometries: [number, number][][] } | null => {
        const dists = new Map<string, number>();
        const prev = new Map<string, { node: string, edge: RouteEdge } | null>();
        const pq = new Set<string>();

        this.nodes.forEach(node => dists.set(node.id, Infinity));

        dists.set(startId, 0);
        pq.add(startId);

        while (pq.size > 0) {
            let u: string | null = null;
            let minDist = Infinity;
            for (const id of pq) {
                const d = dists.get(id)!;
                if (d < minDist) {
                    minDist = d;
                    u = id;
                }
            }
            if (u === null) break;
            pq.delete(u);
            if (u === endId) break;

            const neighbors = this.adj.get(u) || [];
            for (const edge of neighbors) {
                if (allowedLines && !allowedLines.includes(edge.lineId) && edge.type === 'RAIL') {
                    continue;
                }
                const alt = dists.get(u)! + edge.distance;
                if (alt < (dists.get(edge.to) ?? Infinity)) {
                    dists.set(edge.to, alt);
                    prev.set(edge.to, { node: u, edge });
                    pq.add(edge.to);
                }
            }
        }

        if (!dists.has(endId) || dists.get(endId) === Infinity) return null;

        return this.reconstructPath(endId, prev);
    }


    private reconstructPath(endId: string, prev: Map<string, { node: string, edge: RouteEdge } | null>) {
        const S: string[] = [];
        const G: [number, number][][] = [];
        const SID: number[] = [];
        let u = endId;
        let currentTotalDistance = 0;

        while (prev.get(u)) {
            S.unshift(u);
            const p = prev.get(u)!;
            const edge = p.edge;
            currentTotalDistance += edge.distance;
            if (edge.geometry) {
                if (edge.to === u) {
                    G.unshift(edge.geometry);
                } else {
                    G.unshift([...edge.geometry].reverse());
                }
            }
            if (edge.sectionIds) {
                SID.unshift(...edge.sectionIds);
            }
            u = p.node;
        }
        S.unshift(u);

        return {
            path: S,
            sectionIds: SID,
            distance: currentTotalDistance,
            geometries: G
        };
    }
}

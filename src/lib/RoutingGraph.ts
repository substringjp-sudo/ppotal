import { StationNode, haversineDistance } from './graphUtils';
import { RailData } from '../types/railData';

export interface RouteEdge {
    from: string;
    to: string;
    distance: number;
    lineId: string; // "Company::Line"
    type: 'RAIL' | 'TRANSFER';
    geometry?: [number, number][]; // Optional for transfers
}

export interface RouteLeg {
    type: 'RIDE' | 'TRANSFER';
    lineId?: string; // Only for RIDE
    fromStation: { id: string; name: string };
    toStation: { id: string; name: string }; // For RIDE, this is the alighting station. For TRANSFER, destination platform.
    intermediates?: string[]; // List of station IDs passed through (for rendering)
    distance: number;
    geometry: [number, number][];
}

export interface RouteResult {
    legs: RouteLeg[];
    totalDistance: number;
    transferCount: number;
}

export class RoutingGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, RouteEdge[]> = new Map();
    stationToNodes: Map<string, string[]> = new Map(); // "StationName" -> [NodeIDs...]

    constructor(data?: any) {
        if (data) {
            // Check if it's the new granular format
            if ('stations' in data && 'railroadGraph' in data && 'lines' in data) {
                this.loadGranularData(data as RailData);
            } else {
                this.loadSystematicData(data);
            }
        }
    }

    loadSystematicData(data: any) {
        this.nodes.clear();
        this.adj.clear();
        this.stationToNodes.clear();

        // 1. Load Nodes
        Object.entries(data.stations as Record<string, any>).forEach(([id, s]) => {
            const parts = id.split('::');
            const company = parts[0];
            const line = parts[1];
            const name = s.name;
            const fullLineName = `${company}::${line}`;

            const node: StationNode = {
                id,
                name,
                company,
                line,
                fullLineName,
                coords: s.coords
            };

            this.nodes.set(id, node);

            if (!this.stationToNodes.has(name)) {
                this.stationToNodes.set(name, []);
            }
            this.stationToNodes.get(name)!.push(id);
            this.adj.set(id, []);
        });

        // 2. Load Rail Edges
        data.routes.forEach((route: any) => {
            const lineId = `${route.company}::${route.line}`;
            route.edges.forEach((e: any) => {
                const edge: RouteEdge = {
                    from: e.from,
                    to: e.to,
                    distance: e.distance,
                    lineId: lineId,
                    type: 'RAIL',
                    geometry: e.geometry
                };

                // Add directed edges (assuming bidirectional for now, usually safe for rail)
                // But raw data might be directed. Let's add both ways to be safe if data is sparse?
                // Actually raw data usually implies connection.
                this.adj.get(e.from)?.push(edge);

                // Add reverse edge
                const revEdge: RouteEdge = {
                    ...edge,
                    from: e.to,
                    to: e.from,
                    geometry: e.geometry ? [...e.geometry].reverse() : undefined
                };
                this.adj.get(e.to)?.push(revEdge);
            });
        });

        // 3. Generate Transfer Edges
        // Explicit transfers in data?
        if (data.transfers && Array.isArray(data.transfers)) {
            data.transfers.forEach((t: any) => {
                if (this.nodes.has(t.from) && this.nodes.has(t.to)) {
                    const edge: RouteEdge = {
                        from: t.from,
                        to: t.to,
                        distance: 0, // Physical distance usually negligible or provided
                        lineId: 'TRANSFER',
                        type: 'TRANSFER'
                    };
                    this.adj.get(t.from)?.push(edge);
                    const revEdge = { ...edge, from: t.to, to: t.from };
                    this.adj.get(t.to)?.push(revEdge);
                }
            });
        }
    }

    loadGranularData(data: RailData) {
        this.nodes.clear();
        this.adj.clear();
        this.stationToNodes.clear();

        // Helpers
        const companyNameMap = new Map<number, string>();
        Object.values(data.companies).forEach(c => companyNameMap.set(c.id, c.name));

        const lineNameMap = new Map<number, { name: string, companyId: number }>();
        Object.values(data.lines).forEach(l => lineNameMap.set(l.id, { name: l.name, companyId: l.corp_id }));

        // 1. Load Nodes
        Object.values(data.stations).forEach((station: any) => {
            // Logic to determine Company/Line names (same as graphUtils)
            let companyName = "Unknown";
            let lineName = "Unknown";
            let fullLineName = "Unknown::Unknown";

            if (station.platform_ids && station.platform_ids.length > 0) {
                const firstPlatformId = station.platform_ids[0];
                const platform = data.platforms[firstPlatformId];
                if (platform) {
                    companyName = companyNameMap.get(platform.company) || String(platform.company);
                    const lineInfo = lineNameMap.get(platform.line);
                    lineName = lineInfo ? lineInfo.name : String(platform.line);
                    fullLineName = `${companyName}::${lineName}`;
                }
            }

            const node: StationNode = {
                id: station.id,
                name: station.name,
                company: companyName,
                line: lineName,
                fullLineName: fullLineName,
                coords: [station.lon, station.lat]
            };

            this.nodes.set(station.id, node);
            this.adj.set(station.id, []);

            if (!this.stationToNodes.has(station.name)) {
                this.stationToNodes.set(station.name, []);
            }
            this.stationToNodes.get(station.name)!.push(station.id);
        });

        // 2. Load Rail Edges
        const sectionMap = new Map<number, any>();
        data.sections.sections.forEach((s: any) => sectionMap.set(s.id, s));

        Object.entries(data.railroadGraph).forEach(([sourceId, targets]) => {
            Object.entries(targets).forEach(([targetId, sectionIds]) => {
                let totalDistance = 0;
                let combinedGeometry: [number, number][] = [];
                let lineId = "";

                let currentPos = sourceId;

                (sectionIds as number[]).forEach((secId: number) => {
                    const section = sectionMap.get(secId);
                    if (!section) return;

                    const lInfo = lineNameMap.get(section.line_id);
                    const cName = companyNameMap.get(section.company_id) || "";
                    const lName = lInfo ? lInfo.name : "";
                    const thisLineId = `${cName}::${lName}`;
                    if (!lineId) lineId = thisLineId;

                    totalDistance += section.length / 1000;

                    const geom = section.geometry;
                    if (section.start === currentPos) {
                        combinedGeometry.push(...geom);
                        currentPos = section.end;
                    } else if (section.end === currentPos) {
                        combinedGeometry.push(...[...geom].reverse());
                        currentPos = section.start;
                    } else {
                        combinedGeometry.push(...geom);
                    }
                });

                // Add Edge
                const edge: RouteEdge = {
                    from: sourceId,
                    to: targetId,
                    distance: totalDistance,
                    lineId: lineId,
                    type: 'RAIL',
                    geometry: combinedGeometry
                };

                this.adj.get(sourceId)?.push(edge);
            });
        });

        // 3. Generate Transfers
        for (const name of this.stationToNodes.keys()) {
            const ids = this.stationToNodes.get(name)!;
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const u = this.nodes.get(ids[i])!;
                    const v = this.nodes.get(ids[j])!;
                    const dist = haversineDistance(u.coords, v.coords);

                    if (dist < 1.0) {
                        const edge: RouteEdge = {
                            from: u.id,
                            to: v.id,
                            distance: dist,
                            lineId: 'TRANSFER',
                            type: 'TRANSFER'
                        };
                        this.adj.get(u.id)?.push(edge);
                        const revEdge = { ...edge, from: v.id, to: u.id };
                        this.adj.get(v.id)?.push(revEdge);
                    }
                }
            }
        }
    }

    buildTransferEdgesFromHierarchy(hierarchy: any) {
        const groupToNodes = new Map<string, string[]>();

        // 1. Map nodes to groups based on hierarchy
        Object.entries(hierarchy).forEach(([company, lines]) => {
            Object.entries(lines as Record<string, any[]>).forEach(([lineName, stations]) => {
                stations.forEach(station => {
                    // Start with name-based ID construction to match systematic data
                    // ID format in systematic is "Company::Line::StationName"
                    // But wait, some stations might have different names in hierarchy vs systematic?
                    // Generally they should match.

                    const nodeId = `${company}::${lineName}::${station.name}`;

                    if (this.nodes.has(nodeId) && station.group) {
                        if (!groupToNodes.has(station.group)) {
                            groupToNodes.set(station.group, []);
                        }
                        groupToNodes.get(station.group)!.push(nodeId);
                    }
                });
            });
        });

        console.log(`Building transfers for ${groupToNodes.size} groups...`);

        // 2. systematic transfer generation
        groupToNodes.forEach((nodeIds, groupCode) => {
            for (let i = 0; i < nodeIds.length; i++) {
                for (let j = i + 1; j < nodeIds.length; j++) {
                    const u = this.nodes.get(nodeIds[i])!;
                    const v = this.nodes.get(nodeIds[j])!;

                    // Avoid duplicate edges if they already exist (e.g. from name matching)
                    // But name matching is name-based, this is group-based.
                    // Let's check if edge exists? 
                    // adj is Map<string, RouteEdge[]>
                    const existing = this.adj.get(u.id)?.some(e => e.to === v.id && e.type === 'TRANSFER');
                    if (!existing) {
                        // Calc distance
                        const dist = haversineDistance(u.coords, v.coords);

                        const edge: RouteEdge = {
                            from: u.id,
                            to: v.id,
                            distance: dist,
                            lineId: 'TRANSFER',
                            type: 'TRANSFER'
                        };
                        this.adj.get(u.id)?.push(edge);
                        const revEdge = { ...edge, from: v.id, to: u.id };
                        this.adj.get(v.id)?.push(revEdge);
                    }
                }
            }
        });
    }

    findRoute(startName: string, endName: string): RouteResult | null {
        const startIds = this.stationToNodes.get(startName) || [];
        const endIds = new Set(this.stationToNodes.get(endName) || []);

        if (startIds.length === 0 || endIds.size === 0) return null;

        // Dijkstra
        const dists = new Map<string, number>();
        const prev = new Map<string, { node: string, edge: RouteEdge } | null>();
        const pq = new Set<string>(); // Simple set for "queue" (inefficient but OK for typical rail graph size)

        startIds.forEach(id => {
            dists.set(id, 0);
            prev.set(id, null);
            pq.add(id);
        });

        const visited = new Set<string>();

        // We need to visit all reachable nodes to find min path to ANY endId
        // Optimization: Stop when we extract an endId that has min dist? 
        // Yes, if we use a proper Priority Queue. With set, we scan.

        let finalEndId: string | null = null;

        while (pq.size > 0) {
            // Extract min
            let u: string | null = null;
            let minDist = Infinity;

            for (const id of pq) {
                const d = dists.get(id);
                if (d !== undefined && d < minDist) {
                    minDist = d;
                    u = id;
                }
            }

            if (u === null) break;
            pq.delete(u);
            visited.add(u);

            if (dists.get(u)! === Infinity) break;

            if (endIds.has(u)) {
                finalEndId = u;
                break; // Found shortest path to one of the destination platforms
            }

            const neighbors = this.adj.get(u) || [];
            for (const edge of neighbors) {
                if (visited.has(edge.to)) continue;

                const weight = edge.type === 'TRANSFER' ? (edge.distance + 0.5) : edge.distance;
                // 0.5km penalty for transfer to discourage unnecessary switching

                const alt = dists.get(u)! + weight;
                const existingDist = dists.get(edge.to);

                if (existingDist === undefined || alt < existingDist) {
                    dists.set(edge.to, alt);
                    prev.set(edge.to, { node: u, edge });
                    pq.add(edge.to);
                }
            }
        }

        if (!finalEndId) return null;

        // Reconstruct Path
        const path: RouteEdge[] = [];
        let curr = finalEndId;
        while (curr) {
            const p = prev.get(curr);
            if (!p) break;
            path.unshift(p.edge);
            curr = p.node;
        }

        return this.edgesToLegs(path);
    }

    private edgesToLegs(edges: RouteEdge[]): RouteResult {
        const legs: RouteLeg[] = [];
        let totalDistance = 0;
        let transferCount = 0;

        if (edges.length === 0) return { legs: [], totalDistance: 0, transferCount: 0 };

        let currentLeg: RouteLeg | null = null;

        for (const edge of edges) {
            totalDistance += edge.distance;
            const fromNode = this.nodes.get(edge.from)!;
            const toNode = this.nodes.get(edge.to)!;

            if (edge.type === 'TRANSFER') {
                // Finalize current rail leg if exists
                if (currentLeg) {
                    legs.push(currentLeg);
                    currentLeg = null;
                }

                legs.push({
                    type: 'TRANSFER',
                    fromStation: { id: fromNode.id, name: fromNode.name },
                    toStation: { id: toNode.id, name: toNode.name },
                    distance: edge.distance,
                    geometry: edge.geometry || [fromNode.coords, toNode.coords]
                });
                transferCount++;
            } else {
                // RAIL Edge
                if (currentLeg && currentLeg.type === 'RIDE' && currentLeg.lineId === edge.lineId) {
                    // Extend current leg
                    currentLeg.toStation = { id: toNode.id, name: toNode.name };
                    currentLeg.distance += edge.distance;
                    if (edge.geometry) {
                        currentLeg.geometry.push(...edge.geometry);
                    }
                    if (!currentLeg.intermediates) currentLeg.intermediates = [];
                    currentLeg.intermediates.push(toNode.id);
                } else {
                    // Start new rail leg
                    if (currentLeg) legs.push(currentLeg);

                    currentLeg = {
                        type: 'RIDE',
                        lineId: edge.lineId,
                        fromStation: { id: fromNode.id, name: fromNode.name },
                        toStation: { id: toNode.id, name: toNode.name },
                        distance: edge.distance,
                        geometry: edge.geometry ? [...edge.geometry] : [fromNode.coords, toNode.coords],
                        intermediates: [toNode.id]
                    };
                }
            }
        }

        if (currentLeg) legs.push(currentLeg);

        return { legs, totalDistance, transferCount };
    }
}

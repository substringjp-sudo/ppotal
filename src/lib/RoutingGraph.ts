import { StationNode, haversineDistance, LineSegment } from './graphUtils';
import { RailData } from '../types/railData';

export interface RouteEdge {
    from: string;
    to: string;
    distance: number;
    lineId: string;
    type: 'RAIL' | 'TRANSFER';
    geometry?: [number, number][];
}

export class RoutingGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, RouteEdge[]> = new Map();
    stationToNodes: Map<string, string[]> = new Map();
    lineIdMap: Map<string, string> = new Map();
    lineLengths: Record<string, number> = {};
    stationsByName: Record<string, string[]> = {};

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
        this.stationsByName = {};
        this.lineIdMap.clear();

        if (!data.stations || !data.railroadGraph || !data.lines || !data.companies || !data.sections) return;

        const companyNameMap = new Map<number, string>();
        Object.values(data.companies).forEach(c => companyNameMap.set(c.id, c.name));
        const lineNameMap = new Map<number, { name: string, companyId: number }>();
        Object.values(data.lines).forEach(l => lineNameMap.set(l.id, { name: l.name, companyId: l.corp_id }));

        Object.values(data.stations).forEach((station: any) => {
            let companyName = "Unknown";
            let lineName = "Unknown";
            let fullLineName = "Unknown::Unknown";

            if (station.platform_ids && station.platform_ids.length > 0) {
                const platform = data.platforms[station.platform_ids[0]];
                if (platform) {
                    const lineInfo = lineNameMap.get(platform.line);
                    companyName = companyNameMap.get(platform.company) || "Unknown";
                    lineName = lineInfo ? lineInfo.name : "Unknown";
                    fullLineName = `${companyName}::${lineName}`;
                }
            }

            const node: StationNode = {
                id: station.id,
                name: station.name,
                company: companyName,
                line: lineName,
                fullLineName,
                coords: [station.lon, station.lat]
            };

            this.nodes.set(station.id, node);
            this.adj.set(station.id, []);

            if (!this.stationToNodes.has(station.name)) {
                this.stationToNodes.set(station.name, []);
            }
            this.stationToNodes.get(station.name)!.push(station.id);
            if (!this.stationsByName[station.name]) {
                this.stationsByName[station.name] = [];
            }
            this.stationsByName[station.name].push(station.id);
        });
        
        if (data.hierarchy) {
             Object.entries(data.hierarchy).forEach(([comp, lines]) => {
                Object.keys(lines as object).forEach(line => {
                    const lineKey = `${comp}::${line}`;
                    this.lineIdMap.set(lineKey, lineKey);
                });
            });
        }

        const sectionMap = new Map<number, any>();
        data.sections.sections.forEach((s: any) => sectionMap.set(s.id, s));
        Object.entries(data.railroadGraph).forEach(([sourceId, targets]) => {
            Object.entries(targets as Record<string, any>).forEach(([targetId, sectionIds]) => {
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
                    } else {
                        combinedGeometry.push(...[...geom].reverse());
                        currentPos = section.start;
                    }
                });

                const edge: RouteEdge = { from: sourceId, to: targetId, distance: totalDistance, lineId, type: 'RAIL', geometry: combinedGeometry };
                this.adj.get(sourceId)?.push(edge);
                
                const revEdge: RouteEdge = { from: targetId, to: sourceId, distance: totalDistance, lineId, type: 'RAIL', geometry: combinedGeometry ? [...combinedGeometry].reverse() : undefined };
                this.adj.get(targetId)?.push(revEdge);
                
                if (lineId) {
                     this.lineLengths[lineId] = (this.lineLengths[lineId] || 0) + totalDistance;
                }
            });
        });

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
    getNodesByName = (name: string): StationNode[] => (this.stationToNodes.get(name) || []).map(id => this.getNode(id)).filter((n): n is StationNode => !!n);

    getLineSegments = (lineId: string, hierarchy: any): LineSegment[] => {
        const segments: LineSegment[] = [];
        if (!hierarchy || !this.nodes.size) return [];
        const [company, lineName] = lineId.split('::');
        const lineStations = hierarchy[company]?.[lineName];
        if (!lineStations) return [];
        
        for (let i = 0; i < lineStations.length - 1; i++) {
            const startStationInfo = lineStations[i];
            const endStationInfo = lineStations[i + 1];

            const startNodeCandidates = this.getNodesByName(startStationInfo.name).filter(n => n.fullLineName === lineId);
            const endNodeCandidates = this.getNodesByName(endStationInfo.name).filter(n => n.fullLineName === lineId);

            if (startNodeCandidates.length > 0 && endNodeCandidates.length > 0) {
                 for(const startNode of startNodeCandidates) {
                    for (const endNode of endNodeCandidates) {
                        const edge = this.getEdge(startNode.id, endNode.id);
                        if (edge) {
                             segments.push({
                                stations: [startNode.id, endNode.id],
                                edges: [{from: startNode.id, to: endNode.id, distance: edge.distance}],
                                geometry: edge.geometry || [startNode.coords, endNode.coords]
                            });
                             break;
                        }
                    }
                 }
            }
        }
        return segments;
    }

    getShortestPath = (startId: string, endId: string, allowedLines?: string[]): { path: string[], distance: number, geometries: [number, number][][] } | null => {
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

        if (dists.get(endId) === Infinity) return null;

        const S: string[] = [];
        const G: [number, number][][] = [];
        let u = endId;
        while(prev.get(u)){
            S.unshift(u);
            const p = prev.get(u)!;
            const edge = p.edge;
             if (edge.geometry) {
                if (edge.to === u) {
                    G.unshift(edge.geometry);
                } else {
                    G.unshift([...edge.geometry].reverse());
                }
            }
            u = p.node;
        }
        S.unshift(u);

        return {
            path: S,
            distance: dists.get(endId)!,
            geometries: G
        };
    }
}

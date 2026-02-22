import { Company, Line, Station, Section, RailData, Joint } from '../types/railData';

export interface StationNode {
    id: string; // station_id (from stations.json)
    name: string;
    name_en?: string;
    company: string; // company NAME (looked up)
    line: string; // line NAME (looked up)
    companyId: number;
    lineId: number;
    fullLineId: string; // "CompanyID::LineID" format
    coords: [number, number]; // [lon, lat]
}

export interface Edge {
    to: string;
    distance: number;
    geometry: [number, number][];
    lineId?: string; // Add lineId for coloring edges correctly
    sectionIds?: number[]
}

export interface LineSegment {
    stations: string[];
    edges: { from: string, to: string, distance: number }[];
    geometry: [number, number][];
}


export class RailroadGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, Edge[]> = new Map();
    // Index mapping name -> node IDs for fast lookup
    stationsByName: Record<string, string[]> = {};
    // Mapping from simplified line key to full line key
    lineIdMap: Map<string, string> = new Map();
    // Mapping from full line key to simplified line keys (can be multiple if names are same? unlikely but possible)
    reverseLineIdMap: Map<string, string[]> = new Map();

    constructor(data?: RailData | any) {
        if (data) {
            // Check if it's the new granular format
            if ('stations' in data && 'railroadGraph' in data && 'lines' in data) {
                this.loadFromGranularData(data as RailData);
            } else {
                this.loadFromSystematicJson(data);
            }
        }
    }

    addNode(node: StationNode) {
        this.nodes.set(node.id, node);
        if (!this.adj.has(node.id)) {
            this.adj.set(node.id, []);
        }
    }

    addEdge(u: string, v: string, distance: number, geometry: [number, number][], lineId?: string, sectionIds?: number[]) {
        if (!this.adj.has(u)) this.adj.set(u, []);
        if (!this.adj.has(v)) this.adj.set(v, []);

        this.adj.get(u)?.push({ to: v, distance, geometry, lineId, sectionIds });
        // Assuming undirected for now, but need to check if geometry needs reversing
        this.adj.get(v)?.push({ to: u, distance, geometry: [...geometry].reverse(), lineId, sectionIds });
    }

    getShortestPath(startId: string, endId: string, allowedLines: string[] | null = null): {
        path: string[],
        sectionIds: number[],
        distance: number,
        geometries: [number, number][][]
    } | null {
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) return null;

        const distances = new Map<string, number>();
        const previous = new Map<string, string | null>();
        const edgeTo = new Map<string, Edge | null>();

        // Priority Queue (Minimal implementation for speed)
        const pq: { id: string, dist: number }[] = [];
        const push = (id: string, dist: number) => {
            pq.push({ id, dist });
            let i = pq.length - 1;
            while (i > 0) {
                let p = (i - 1) >> 1;
                if (pq[p].dist <= pq[i].dist) break;
                [pq[p], pq[i]] = [pq[i], pq[p]];
                i = p;
            }
        };
        const pop = () => {
            const top = pq[0];
            const last = pq.pop()!;
            if (pq.length > 0) {
                pq[0] = last;
                let i = 0;
                while (true) {
                    let l = (i << 1) + 1, r = (i << 1) + 2, min = i;
                    if (l < pq.length && pq[l].dist < pq[min].dist) min = l;
                    if (r < pq.length && pq[r].dist < pq[min].dist) min = r;
                    if (min === i) break;
                    [pq[i], pq[min]] = [pq[min], pq[i]];
                    i = min;
                }
            }
            return top;
        };

        distances.set(startId, 0);
        push(startId, 0);

        const visited = new Set<string>();

        while (pq.length > 0) {
            const { id: closestNode, dist } = pop();
            if (visited.has(closestNode)) continue;
            visited.add(closestNode);

            if (closestNode === endId) {
                // Reconstruct path
                const path: string[] = [];
                const resGeometries: [number, number][][] = [];
                const resSectionIds: number[] = [];
                let curr: string | null = endId;
                while (curr !== null) {
                    path.unshift(curr);
                    const prevEdge = edgeTo.get(curr);
                    if (prevEdge) {
                        resGeometries.unshift(prevEdge.geometry);
                        if (prevEdge.sectionIds) resSectionIds.unshift(...prevEdge.sectionIds);
                    }
                    curr = previous.has(curr) ? previous.get(curr)! : null;
                    if (curr === startId) {
                        path.unshift(curr);
                        break;
                    }
                }

                return {
                    path,
                    sectionIds: resSectionIds,
                    distance: distances.get(endId) || 0,
                    geometries: resGeometries
                };
            }

            const currentDist = distances.get(closestNode) || 0;
            const neighbors = this.adj.get(closestNode) || [];
            for (const neighbor of neighbors) {
                if (visited.has(neighbor.to)) continue;

                if (allowedLines) {
                    const targetNode = this.nodes.get(neighbor.to);
                    if (targetNode && !allowedLines.includes(targetNode.fullLineId)) continue;
                }

                const alt = currentDist + neighbor.distance;
                if (!distances.has(neighbor.to) || alt < distances.get(neighbor.to)!) {
                    distances.set(neighbor.to, alt);
                    previous.set(neighbor.to, closestNode);
                    edgeTo.set(neighbor.to, neighbor);
                    push(neighbor.to, alt);
                }
            }
        }

        return null;
    }

    loadFromSystematicJson(data: any) {
        this.nodes.clear();
        this.adj.clear();
        this.stationsByName = {};

        // 0. Build line mapping
        this.lineIdMap.clear();
        this.reverseLineIdMap.clear();
        data.routes.forEach((route: any) => {
            const fullId = `${route.company}::${route.line}`;
            this.lineIdMap.set(route.id, fullId);
            if (!this.reverseLineIdMap.has(fullId)) {
                this.reverseLineIdMap.set(fullId, []);
            }
            this.reverseLineIdMap.get(fullId)!.push(route.id);
        });

        // 1. Load Stations
        for (const [id, station] of Object.entries(data.stations as Record<string, any>)) {
            const parts = id.split('::');
            const company = parts[0];
            const line = parts[1];
            const simplifiedLineKey = `${company}::${line}`;
            const fullLineId = this.lineIdMap.get(simplifiedLineKey) || simplifiedLineKey;

            const node: StationNode = {
                id,
                name: station.name,
                company,
                line,
                companyId: 0, // Not available in this format
                lineId: 0, // Not available in this format
                fullLineId: fullLineId,
                coords: station.coords
            };
            this.addNode(node);
        }

        // 2. Load Edges
        for (const route of data.routes) {
            for (const edge of route.edges) {
                this.addEdge(edge.from, edge.to, edge.distance, edge.geometry);
            }
        }

        // 3. Add Transfer Edges
        if (data.transfers && Array.isArray(data.transfers)) {
            for (const t of data.transfers) {
                const nodeFrom = this.nodes.get(t.from);
                const nodeTo = this.nodes.get(t.to);
                if (nodeFrom && nodeTo) {
                    this.addEdge(t.from, t.to, 0.05 + t.distance, [nodeFrom.coords, nodeTo.coords]);
                }
            }
        } else {
            // Fallback for legacy data (name-based)
            for (const name in this.stationsByName) {
                const ids = this.stationsByName[name];
                for (let i = 0; i < ids.length; i++) {
                    for (let j = i + 1; j < ids.length; j++) {
                        const nodeI = this.nodes.get(ids[i]);
                        const nodeJ = this.nodes.get(ids[j]);
                        if (nodeI && nodeJ) {
                            const dist = haversineDistance(nodeI.coords, nodeJ.coords);
                            if (dist < 1.0) {
                                this.addEdge(ids[i], ids[j], 0.05 + dist, [nodeI.coords, nodeJ.coords]);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Extracts an ordered sequence of stations for a given line.
     * Since lines can have branches, this returns a list of segments.
     * Uses bidirectional adjacency for complete graph traversal.
     */
    getLineSegments(inputId: string): LineSegment[] {
        const fullLineId = this.lineIdMap.get(inputId) || inputId;
        const lineEdges: { from: string, to: string, distance: number, geometry: [number, number][] }[] = [];

        for (const [u, edges] of this.adj.entries()) {
            for (const e of edges) {
                if (e.lineId === fullLineId) {
                    lineEdges.push({ from: u, ...e });
                }
            }
        }

        if (lineEdges.length === 0) return [];

        const getName = (id: string) => this.nodes.get(id)?.name || id.split('::').pop() || id;
        const nameToRepId = new Map<string, string>();
        const biAdj = new Map<string, Map<string, { distance: number, geometry: [number, number][], originalFrom: string, originalTo: string }>>();

        lineEdges.forEach(e => {
            const uName = getName(e.from);
            const vName = getName(e.to);
            if (uName === vName) return;

            if (!nameToRepId.has(uName)) nameToRepId.set(uName, e.from);
            if (!nameToRepId.has(vName)) nameToRepId.set(vName, e.to);

            if (!biAdj.has(uName)) biAdj.set(uName, new Map());
            if (!biAdj.has(vName)) biAdj.set(vName, new Map());

            const existingU = biAdj.get(uName)!.get(vName);
            if (!existingU || e.distance < existingU.distance) {
                biAdj.get(uName)!.set(vName, { distance: e.distance, geometry: e.geometry, originalFrom: e.from, originalTo: e.to });
            }

            const existingV = biAdj.get(vName)!.get(uName);
            if (!existingV || e.distance < existingV.distance) {
                biAdj.get(vName)!.set(uName, {
                    distance: e.distance,
                    geometry: [...e.geometry].reverse(),
                    originalFrom: e.to,
                    originalTo: e.from
                });
            }
        });

        const getEdgeKey = (u: string, v: string) => [u, v].sort().join('<->');
        const visitedEdgeKeys = new Set<string>();
        const segments: LineSegment[] = [];

        const traceSegment = (startName: string, firstNeighborName: string) => {
            const names = [startName];
            const edges: { from: string, to: string, distance: number }[] = [];
            const geometry: [number, number][] = [];

            const edgeData = biAdj.get(startName)!.get(firstNeighborName)!;
            const edgeKey = getEdgeKey(startName, firstNeighborName);
            if (visitedEdgeKeys.has(edgeKey)) return null;
            visitedEdgeKeys.add(edgeKey);

            edges.push({
                from: nameToRepId.get(startName)!,
                to: nameToRepId.get(firstNeighborName)!,
                distance: edgeData.distance
            });
            geometry.push(...edgeData.geometry);
            names.push(firstNeighborName);

            let curr = firstNeighborName;
            while (true) {
                const neighbors = biAdj.get(curr);
                if (!neighbors) break;
                const unvisited = Array.from(neighbors.entries())
                    .filter(([name]) => !visitedEdgeKeys.has(getEdgeKey(curr, name)));

                if (unvisited.length === 0) break;
                const [nextName, nextData] = unvisited[0];
                visitedEdgeKeys.add(getEdgeKey(curr, nextName));

                edges.push({
                    from: nameToRepId.get(curr)!,
                    to: nameToRepId.get(nextName)!,
                    distance: nextData.distance
                });
                geometry.push(...nextData.geometry.slice(1));
                names.push(nextName);
                curr = nextName;

                const nextNeighbors = biAdj.get(curr);
                if (nextNeighbors) {
                    const nextUnvisited = Array.from(nextNeighbors.keys())
                        .filter(n => !visitedEdgeKeys.has(getEdgeKey(curr, n)));
                    if (nextUnvisited.length > 1) break;
                }
            }
            return { stations: names.map(n => nameToRepId.get(n)!), edges, geometry };
        };

        const logicalNodes = Array.from(nameToRepId.keys());
        const startCandidates = logicalNodes.filter(n => (biAdj.get(n)?.size || 0) !== 2);
        const roots = startCandidates.length > 0 ? startCandidates : [logicalNodes[0]];

        roots.forEach(r => {
            const neighbors = biAdj.get(r);
            if (!neighbors) return;
            neighbors.forEach((_, n) => {
                const seg = traceSegment(r, n);
                if (seg) segments.push(seg);
            });
        });

        return segments;
    }

    loadFromGranularData(data: RailData) {
        this.nodes.clear();
        this.adj.clear();
        this.lineIdMap.clear();
        this.reverseLineIdMap.clear();

        // Helper maps for meaningful names
        const companyNameMap = new Map<number, string>();
        Object.values(data.companies).forEach((c: Company) => companyNameMap.set(c.id, c.name));

        const lineNameMap = new Map<number, { name: string, companyId: number }>();
        Object.values(data.lines).forEach((l: Line) => lineNameMap.set(l.id, { name: l.name, companyId: l.corp_id }));

        // 1. Load Stations & Platforms
        Object.values(data.stations).forEach((station: Station) => {
            let companyName = "Unknown";
            let lineName = "Unknown";
            let companyId = 0;
            let lineId = 0;
            let fullLineId = "0::0";

            if (station.platform_ids && station.platform_ids.length > 0) {
                const firstPlatformId = station.platform_ids[0];
                const platform = data.platforms[firstPlatformId];
                if (platform) {
                    companyId = platform.company;
                    companyName = companyNameMap.get(platform.company) || String(platform.company);
                    const lineInfo = lineNameMap.get(platform.line);
                    lineId = platform.line;
                    lineName = lineInfo ? lineInfo.name : String(platform.line);
                    fullLineId = `${companyId}::${lineId}`;
                }
            }

            const node: StationNode = {
                id: station.id,
                name: station.name,
                name_en: station.name_en,
                company: companyName,
                line: lineName,
                companyId: companyId,
                lineId: lineId,
                fullLineId: fullLineId,
                coords: [station.lon, station.lat]
            };
            this.addNode(node);

            // Also map all platform IDs to this node for lookup flexibility
            if (station.platform_ids) {
                station.platform_ids.forEach((pid: string) => {
                    if (pid !== station.id) {
                        this.nodes.set(pid, node);
                    }
                });
            }
        });

        // 2. Load Joints from hierarchy as nodes
        const jointDataMap = new Map<string, Joint>();
        if (data.joints && data.joints.joints) {
            data.joints.joints.forEach((j: Joint) => jointDataMap.set(j.id, j));
        }

        if (data.hierarchy && data.hierarchy.companies) {
            Object.values(data.hierarchy.companies).forEach((comp: any) => {
                Object.values(comp.lines).forEach((line: any) => {
                    if (line.joints) {
                        line.joints.forEach((jid: string) => {
                            if (!this.nodes.has(jid)) {
                                const jointInfo = jointDataMap.get(jid);
                                this.nodes.set(jid, {
                                    id: jid,
                                    name: "", // Joints are unnamed
                                    company: "",
                                    line: "",
                                    companyId: 0,
                                    lineId: 0,
                                    fullLineId: "",
                                    coords: jointInfo ? jointInfo.coordinates : [0, 0]
                                });
                            }
                        });
                    }
                });
            });
        }

        // 2. Load Edges from railroad_graph.json (with fallback to sections)
        const sectionMap = new Map<number, Section>();
        data.sections.sections.forEach((s: Section) => sectionMap.set(s.id, s));

        if (data.railroadGraph) {
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
                        const thisLineId = `${section.company_id}::${section.line_id}`;
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

                    const existsForward = this.adj.get(sourceId)?.some(e => e.to === targetId);
                    if (!existsForward) {
                        this.addEdge(sourceId, targetId, totalDistance, combinedGeometry, lineId, sectionIds as number[]);
                    }
                });
            });
        } else {
            // Fallback: build directly from sections
            data.sections.sections.forEach((section: Section) => {
                const lineId = `${section.company_id}::${section.line_id}`;

                this.addEdge(
                    section.start,
                    section.end,
                    section.length / 1000,
                    section.geometry,
                    lineId
                );
            });
        }

        // 3. Hierarchy / Line Mapping
        Object.values(data.lines).forEach((l: Line) => {
            const companyName = companyNameMap.get(l.corp_id) || String(l.corp_id);
            const fullId = `${companyName}::${l.name}`;
            const simplifiedKey = `${companyName}::${l.name}`;
            this.lineIdMap.set(simplifiedKey, fullId);

            // Register exact match
            if (!this.reverseLineIdMap.has(fullId)) {
                this.reverseLineIdMap.set(fullId, []);
            }
            const exactList = this.reverseLineIdMap.get(fullId)!;
            if (!exactList.includes(simplifiedKey)) {
                exactList.push(simplifiedKey);
            }


        });

        // 4. Add Transfer Edges (Same station name)
        for (const name in this.stationsByName) {
            const ids = this.stationsByName[name];
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const nodeI = this.nodes.get(ids[i]);
                    const nodeJ = this.nodes.get(ids[j]);
                    if (nodeI && nodeJ) {
                        const dist = haversineDistance(nodeI.coords, nodeJ.coords);
                        // Transfer edge with small penalty + actual distance
                        if (dist < 1.0) {
                            this.addEdge(ids[i], ids[j], 0.05 + dist, [nodeI.coords, nodeJ.coords]);
                        }
                    }
                }
            }
        }
    }
}

export const haversineDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const pointToSegmentDistance = (p: [number, number], v: [number, number], w: [number, number]): number => {
    const l2 = Math.pow(v[0] - w[0], 2) + Math.pow(v[1] - w[1], 2);
    if (l2 === 0) return haversineDistance(p, v);
    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection: [number, number] = [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])];
    return haversineDistance(p, projection);
};

export const buildGraph = (stationsGeoJson: any, sectionGeoJson: any, hierarchy: Record<string, Record<string, string[]>>): RailroadGraph => {
    const graph = new RailroadGraph();
    const stationMap: Record<string, StationNode[]> = {}; // lineKey -> nodes

    // 1. Process Stations
    stationsGeoJson.features.forEach((f: any) => {
        const props = f.properties;
        const company = props.N02_004;
        const line = props.N02_003;
        const name = props.N02_005;
        const lineKey = `${company}::${line}`;
        const id = `${lineKey}::${name}`;

        const coords = f.geometry.coordinates;
        // Midpoint of station LineString
        const midpoint: [number, number] = [
            (coords[0][0] + coords[coords.length - 1][0]) / 2,
            (coords[0][1] + coords[coords.length - 1][1]) / 2
        ];

        const node: StationNode = {
            id,
            name,
            company,
            line,
            companyId: 0,
            lineId: 0,
            fullLineId: lineKey,
            coords: midpoint
        };
        graph.addNode(node);

        if (!stationMap[lineKey]) stationMap[lineKey] = [];
        stationMap[lineKey].push(node);
    });

    // 2. Process Sections and Build Edges (Geometry based)
    sectionGeoJson.features.forEach((f: any) => {
        const props = f.properties;
        const company = props.N02_004;
        const line = props.N02_003;
        const lineKey = `${company}::${line}`;
        const lineStations = stationMap[lineKey] || [];

        const geom = f.geometry;
        if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) return;

        // Helper to find closest point on segment and distance
        const getClosestPointOnSegment = (p: [number, number], a: [number, number], b: [number, number]) => {
            const x = p[0], y = p[1];
            const x1 = a[0], y1 = a[1];
            const x2 = b[0], y2 = b[1];

            const A = x - x1;
            const B = y - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;

            if (len_sq !== 0) param = dot / len_sq;

            let xx, yy;

            if (param < 0) {
                xx = x1; yy = y1;
            } else if (param > 1) {
                xx = x2; yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }

            return { point: [xx, yy] as [number, number], t: param, distSq: (x - xx) ** 2 + (y - yy) ** 2 };
        };

        const processGeometry = (coords: [number, number][]) => {
            if (!stationMap[lineKey]) return;

            // Find all stations that are "close" to this geometry line
            const stationsOnSegment: { station: StationNode, distAlong: number, projectedPoint: [number, number], originalIndex: number }[] = [];

            // Pre-calculate cumulative distances for the polyline
            const polylineDistances: number[] = [0];
            for (let i = 0; i < coords.length - 1; i++) {
                polylineDistances.push(polylineDistances[i] + haversineDistance(coords[i], coords[i + 1]));
            }
            const totalLength = polylineDistances[polylineDistances.length - 1];

            // Filter threshold (e.g. 200m approx in degrees - very rough, use haversine for final check)
            // 0.002 degrees is roughly 200m

            for (const s of stationMap[lineKey]) {
                let minDSq = Infinity;
                let bestInfo: { distAlong: number, projectedPoint: [number, number] } | null = null;

                for (let i = 0; i < coords.length - 1; i++) {
                    const res = getClosestPointOnSegment(s.coords, coords[i], coords[i + 1]);
                    // Check strict distance (haversine) if rough box passes
                    if (res.distSq < minDSq) {
                        minDSq = res.distSq;
                        // Calculate strictly linear distance
                        // distAlong = dist to start of segment + fraction of segment length
                        const segLen = polylineDistances[i + 1] - polylineDistances[i];
                        const distAlong = polylineDistances[i] + (res.t < 0 ? 0 : (res.t > 1 ? 1 : res.t)) * segLen;
                        bestInfo = { distAlong, projectedPoint: res.point };
                    }
                }

                // Threshold: 0.05km (50m) - quite strict, maybe 1km (1.0) because usage data is coarse
                // Let's use 2km to be safe against bad data, logic relies on 'closest' anyway.
                const distToLine = haversineDistance(s.coords, bestInfo!.projectedPoint);
                if (distToLine < 1.0) {
                    stationsOnSegment.push({
                        station: s,
                        distAlong: bestInfo!.distAlong,
                        projectedPoint: bestInfo!.projectedPoint,
                        originalIndex: -1 // not needed really
                    });
                }
            }

            // Sort by distance along the line
            stationsOnSegment.sort((a, b) => a.distAlong - b.distAlong);

            // Create edges between adjacent stations
            for (let i = 0; i < stationsOnSegment.length - 1; i++) {
                const start = stationsOnSegment[i];
                const end = stationsOnSegment[i + 1];

                if (start.station.id === end.station.id) continue;

                // Extract sub-geometry
                // This is complex. We need the slice of 'coords' between start.distAlong and end.distAlong
                // Approximate: just use the projected points and any full segments in between
                // Or simplified: Just straight line? No, user wants curves.
                // Quick hack: Just passing the full line geometry chunk is hard. 
                // Let's pass the 2 projected points.
                // BUT user wants "highlight actual railway route".
                // We MUST slice.

                // Let's assume for now we just connect them. If we want perfect geometry, we need a 'getSlice' helper.
                // Given I am writing this inline, I will implement a basic slicer.

                const slicedCoords: [number, number][] = [start.projectedPoint];
                // Find segments between start.distAlong and end.distAlong
                for (let k = 0; k < coords.length - 1; k++) {
                    const d1 = polylineDistances[k];
                    const d2 = polylineDistances[k + 1];
                    // If segment is largely between start and end... add the point k+1
                    if (d1 > start.distAlong && d1 < end.distAlong) {
                        slicedCoords.push(coords[k]);
                    }
                }
                slicedCoords.push(end.projectedPoint);

                const dist = end.distAlong - start.distAlong;
                if (dist > 0.001) { // distinct points
                    graph.addEdge(start.station.id, end.station.id, dist, slicedCoords);
                }
            }
        };

        if (geom.type === 'LineString') {
            processGeometry(geom.coordinates as [number, number][]);
        } else {
            geom.coordinates.forEach((polyline: any) => processGeometry(polyline as [number, number][]));
        }
    });

    // 3. Process Hierarchy to ensure Logical Connectivity (Fallback for missing geometry)
    if (hierarchy) {
        Object.entries(hierarchy).forEach(([company, lines]) => {
            Object.entries(lines).forEach(([lineName, stations]) => {
                const lineKey = `${company}::${lineName}`;

                // Iterate through station list and ensure edges exist between i and i+1
                for (let i = 0; i < stations.length - 1; i++) {
                    const nameA = stations[i];
                    const nameB = stations[i + 1];
                    const idA = `${lineKey}::${nameA}`;
                    const idB = `${lineKey}::${nameB}`;

                    const nodeA = graph.nodes.get(idA);
                    const nodeB = graph.nodes.get(idB);

                    if (nodeA && nodeB) {
                        // Check if edge already exists
                        const existingEdges = graph.adj.get(idA);
                        const hasEdge = existingEdges?.some(e => e.to === idB);

                        if (!hasEdge) {
                            // Create a straight-line fallback edge
                            const dist = haversineDistance(nodeA.coords, nodeB.coords);
                            const straightGeom: [number, number][] = [nodeA.coords, nodeB.coords];
                            graph.addEdge(idA, idB, dist, straightGeom);
                        }
                    }
                }
            });
        });
    }

    // 4. Add Transfer Edges (Same station name, different lines)
    for (const name in graph.stationsByName) {
        const ids = graph.stationsByName[name];
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const nodeI = graph.nodes.get(ids[i]);
                const nodeJ = graph.nodes.get(ids[j]);
                if (nodeI && nodeJ) {
                    const dist = haversineDistance(nodeI.coords, nodeJ.coords);
                    // Transfer edge with small penalty + actual distance
                    // Only if they are within 1km (prevent bridges between distant same-name stations)
                    if (dist < 1.0) {
                        graph.addEdge(ids[i], ids[j], 0.05 + dist, [nodeI.coords, nodeJ.coords]);
                    }
                }
            }
        }
    }

    return graph;
};

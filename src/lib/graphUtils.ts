import { Company, Line, Station, Section, RailData } from '../types/railData';
import { normalizeKey, normalizeCompanyName } from './lineUtils';

export interface StationNode {
    id: string; // station_id (from stations.json)
    name: string;
    company: string; // company NAME (looked up)
    line: string; // line NAME (looked up)
    fullLineName: string; // keeping "Company::Line" format for compatibility
    coords: [number, number]; // [lon, lat]
}

export interface Edge {
    to: string;
    distance: number;
    geometry: [number, number][];
    lineId?: string; // Add lineId for coloring edges correctly
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

    constructor(data?: any) {
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
        if (!this.stationsByName[node.name]) {
            this.stationsByName[node.name] = [];
        }
        this.stationsByName[node.name].push(node.id);
    }

    addEdge(u: string, v: string, distance: number, geometry: [number, number][], lineId?: string) {
        if (!this.adj.has(u)) this.adj.set(u, []);
        if (!this.adj.has(v)) this.adj.set(v, []);

        this.adj.get(u)?.push({ to: v, distance, geometry, lineId });
        // Assuming undirected for now, but need to check if geometry needs reversing
        this.adj.get(v)?.push({ to: u, distance, geometry: [...geometry].reverse(), lineId });
    }

    getShortestPathByName(startName: string, endName: string, allowedLines: string[] | null = null, startCoords?: [number, number], endCoords?: [number, number]): { path: string[], distance: number, geometries: [number, number][][] } | null {
        let startIds = this.stationsByName[startName];
        let endIds = this.stationsByName[endName];

        // If not found by name, check if it's a direct ID (e.g. for joints)
        if (!startIds && this.nodes.has(startName)) startIds = [startName];
        if (!endIds && this.nodes.has(endName)) endIds = [endName];

        if (!startIds || !endIds) return null;

        // Disambiguation using coordinates
        if (startCoords) {
            let minDist = Infinity;
            let closestId = startIds[0];
            for (const id of startIds) {
                const node = this.nodes.get(id);
                if (node) {
                    const d = haversineDistance(startCoords, node.coords);
                    if (d < minDist) {
                        minDist = d;
                        closestId = id;
                    }
                }
            }
            startIds = [closestId];
        }

        if (endCoords) {
            let minDist = Infinity;
            let closestId = endIds[0];
            for (const id of endIds) {
                const node = this.nodes.get(id);
                if (node) {
                    const d = haversineDistance(endCoords, node.coords);
                    if (d < minDist) {
                        minDist = d;
                        closestId = id;
                    }
                }
            }
            endIds = [closestId];
        }

        // Multi-source Dijkstra
        const distances: Record<string, number> = {};
        const previous: Record<string, string | null> = {};
        const geometries: Record<string, [number, number][][]> = {};
        const nodes = new Set<string>();

        // Initialize all nodes
        for (const nodeId of this.nodes.keys()) {
            distances[nodeId] = Infinity;
            previous[nodeId] = null;
            geometries[nodeId] = [];
            nodes.add(nodeId);
        }

        // Set distance 0 for ALL start nodes
        for (const startId of startIds) {
            distances[startId] = 0;
        }

        while (nodes.size > 0) {
            let closestNode: string | null = null;
            let minDist = Infinity;

            // Simple linear scan (could be optimized)
            for (const nodeId of nodes) {
                if (distances[nodeId] < minDist) {
                    minDist = distances[nodeId];
                    closestNode = nodeId;
                }
            }

            if (closestNode === null || distances[closestNode] === Infinity) break;

            // Check if we reached ANY end node
            if (endIds.includes(closestNode)) {
                // Reconstruct path
                const endId = closestNode;
                const path: string[] = [];
                let curr: string | null = endId;
                while (curr !== null) {
                    path.unshift(curr);
                    // Stop if we hit any start node (since its prev is null)
                    if (startIds.includes(curr) && previous[curr] === null) break;
                    curr = previous[curr];
                }

                return {
                    path,
                    distance: distances[endId],
                    geometries: geometries[endId]
                };
            }

            nodes.delete(closestNode);

            const neighbors = this.adj.get(closestNode) || [];
            for (const neighbor of neighbors) {
                if (!nodes.has(neighbor.to)) continue;

                // FILTERING LOGIC
                if (allowedLines) {
                    const targetNode = this.nodes.get(neighbor.to);
                    if (targetNode) {
                        const lineKey = targetNode.fullLineName;
                        if (!allowedLines.includes(lineKey)) {
                            continue;
                        }
                    }
                }

                const alt = distances[closestNode] + neighbor.distance;
                if (alt < distances[neighbor.to]) {
                    distances[neighbor.to] = alt;
                    previous[neighbor.to] = closestNode;
                    geometries[neighbor.to] = [...geometries[closestNode], neighbor.geometry];
                }
            }
        }

        return null;
    }

    getShortestPath(startId: string, endId: string, allowedLines: string[] | null = null): { path: string[], distance: number, geometries: [number, number][][] } | null {
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) return null;

        const distances: Record<string, number> = {};
        const previous: Record<string, string | null> = {};
        const geometries: Record<string, [number, number][][]> = {};
        const nodes = new Set<string>();

        // Initialize
        for (const nodeId of this.nodes.keys()) {
            distances[nodeId] = Infinity;
            previous[nodeId] = null;
            geometries[nodeId] = [];
            nodes.add(nodeId);
        }

        distances[startId] = 0;

        while (nodes.size > 0) {
            let closestNode: string | null = null;
            let minDist = Infinity;

            // Simple linear scan
            for (const nodeId of nodes) {
                if (distances[nodeId] < minDist) {
                    minDist = distances[nodeId];
                    closestNode = nodeId;
                }
            }

            if (closestNode === null || distances[closestNode] === Infinity) break;
            if (closestNode === endId) {
                // Reconstruct path
                const path: string[] = [];
                let curr: string | null = endId;
                while (curr !== null) {
                    path.unshift(curr);
                    if (curr === startId) break;
                    curr = previous[curr];
                }

                return {
                    path,
                    distance: distances[endId],
                    geometries: geometries[endId]
                };
            }

            nodes.delete(closestNode);

            const neighbors = this.adj.get(closestNode) || [];
            for (const neighbor of neighbors) {
                if (!nodes.has(neighbor.to)) continue;

                // FILTERING LOGIC
                if (allowedLines) {
                    const targetNode = this.nodes.get(neighbor.to);
                    if (targetNode) {
                        // Check if target node belongs to allowed lines
                        // Note: normalizeKey might be needed if allowedLines formats differ, 
                        // but assuming exact match for now as per MapPane usage.
                        if (!allowedLines.includes(targetNode.fullLineName)) {
                            continue;
                        }
                    }
                }

                const alt = distances[closestNode] + neighbor.distance;
                if (alt < distances[neighbor.to]) {
                    distances[neighbor.to] = alt;
                    previous[neighbor.to] = closestNode;
                    geometries[neighbor.to] = [...geometries[closestNode], neighbor.geometry];
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
            const fullLineName = this.lineIdMap.get(simplifiedLineKey) || simplifiedLineKey;

            const node: StationNode = {
                id,
                name: station.name,
                company,
                line,
                fullLineName,
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
        const fullLineId = this.lineIdMap.get(inputId) || this.lineIdMap.get(normalizeKey(inputId)) || inputId;
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

    getLineSegmentsFromHierarchy(inputId: string, data: RailData): LineSegment[] {
        const fullLineId = this.lineIdMap.get(inputId) || this.lineIdMap.get(normalizeKey(inputId)) || inputId;
        const [companyName, lineName] = fullLineId.split('::');

        let hierarchyLine: any = null;
        if (data.hierarchy && data.hierarchy.companies) {
            for (const companyId in data.hierarchy.companies) {
                const comp = data.hierarchy.companies[companyId];
                const companyObj = (data.companies as any)[comp.id];
                if (companyObj && normalizeCompanyName(companyObj.name) === normalizeCompanyName(companyName)) {
                    for (const lineIdKey in comp.lines) {
                        const line = comp.lines[lineIdKey];
                        // Hierarchy lines might not have 'name' directly, check data.lines
                        // Check after normalizing line names as well
                        const lineInfo = data.lines[line.id];
                        if (lineInfo && (lineInfo.name === lineName || normalizeKey(`${companyName}::${lineInfo.name}`) === normalizeKey(fullLineId))) {
                            hierarchyLine = line;
                            break;
                        }
                    }
                }
                if (hierarchyLine) break;
            }
        }

        if (!hierarchyLine || !hierarchyLine.sections) return [];

        const sectionIds = hierarchyLine.sections as number[];
        const sectionMap = new Map<number, any>();
        data.sections.sections.forEach((s: any) => sectionMap.set(s.id, s));

        const biAdj = new Map<string, Map<string, { distance: number, geometry: [number, number][] }>>();

        sectionIds.forEach(id => {
            const s = sectionMap.get(id);
            if (!s) return;
            if (!biAdj.has(s.start)) biAdj.set(s.start, new Map());
            if (!biAdj.has(s.end)) biAdj.set(s.end, new Map());
            biAdj.get(s.start)!.set(s.end, { distance: s.length / 1000, geometry: s.geometry });
            biAdj.get(s.end)!.set(s.start, { distance: s.length / 1000, geometry: [...s.geometry].reverse() });
        });

        const segments: LineSegment[] = [];
        const visitedEdgeKeys = new Set<string>();
        const getEdgeKey = (u: string, v: string) => [u, v].sort().join('<->');

        const traceSegment = (startNode: string, firstNeighbor: string) => {
            const nodes = [startNode];
            const edges: { from: string, to: string, distance: number }[] = [];
            const geometry: [number, number][] = [];

            const firstEdgeData = biAdj.get(startNode)!.get(firstNeighbor)!;
            const firstKey = getEdgeKey(startNode, firstNeighbor);
            if (visitedEdgeKeys.has(firstKey)) return null;
            visitedEdgeKeys.add(firstKey);

            nodes.push(firstNeighbor);
            edges.push({ from: startNode, to: firstNeighbor, distance: firstEdgeData.distance });
            geometry.push(...firstEdgeData.geometry);

            let curr = firstNeighbor;
            while (curr) {
                const neighbors = biAdj.get(curr);
                if (!neighbors) break;
                const nextCandidates = Array.from(neighbors.keys()).filter(n => !visitedEdgeKeys.has(getEdgeKey(curr, n)));
                if (nextCandidates.length === 1) {
                    const next = nextCandidates[0];
                    const edgeData = neighbors.get(next)!;
                    visitedEdgeKeys.add(getEdgeKey(curr, next));
                    nodes.push(next);
                    edges.push({ from: curr, to: next, distance: edgeData.distance });
                    geometry.push(...edgeData.geometry.slice(1));
                    curr = next;
                } else {
                    break;
                }
            }
            return { stations: nodes, edges, geometry };
        };

        const allNodes = Array.from(biAdj.keys());
        const startNodes = allNodes.filter(n => (biAdj.get(n)?.size || 0) !== 2);
        const rootNodes = startNodes.length > 0 ? startNodes : [allNodes[0]];

        rootNodes.forEach(startNode => {
            const neighbors = biAdj.get(startNode);
            if (!neighbors) return;
            neighbors.forEach((_, neighbor) => {
                const seg = traceSegment(startNode, neighbor);
                if (seg) segments.push(seg);
            });
        });

        return segments;
    }

    loadFromGranularData(data: RailData) {
        this.nodes.clear();
        this.adj.clear();
        this.stationsByName = {};
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
        const jointDataMap = new Map<string, any>();
        if (data.joints && data.joints.joints) {
            data.joints.joints.forEach((j: any) => jointDataMap.set(j.id, j));
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
                                    fullLineName: "",
                                    coords: jointInfo ? jointInfo.coordinates : [0, 0]
                                });
                            }
                        });
                    }
                });
            });
        }

        // 2. Load Edges from railroad_graph.json
        const sectionMap = new Map<number, Section>();
        data.sections.sections.forEach((s: Section) => sectionMap.set(s.id, s));

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

                const existsForward = this.adj.get(sourceId)?.some(e => e.to === targetId);
                if (!existsForward) {
                    this.addEdge(sourceId, targetId, totalDistance, combinedGeometry, lineId);
                }
            });
        });

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

            // Register normalized match for robustness
            const normalizedKey = normalizeKey(simplifiedKey);
            if (normalizedKey !== simplifiedKey) {
                // Ensure map points to fullId
                this.lineIdMap.set(normalizedKey, fullId);

                if (!this.reverseLineIdMap.has(normalizedKey)) {
                    this.reverseLineIdMap.set(normalizedKey, []);
                }
                const normList = this.reverseLineIdMap.get(normalizedKey)!;
                if (!normList.includes(simplifiedKey)) {
                    normList.push(simplifiedKey);
                }
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

        const node: StationNode = { id, name, company, line, fullLineName: lineKey, coords: midpoint };
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

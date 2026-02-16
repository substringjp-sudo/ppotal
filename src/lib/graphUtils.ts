export interface StationNode {
    id: string; // company::simplifiedLine::stationName::index
    name: string;
    company: string;
    line: string; // simplified line
    fullLineName: string; // company::fullLineName
    coords: [number, number]; // [lon, lat]
}

export interface Edge {
    to: string;
    distance: number;
    geometry: [number, number][];
}

const normalizeKey = (key: string): string => {
    if (!key) return "";
    const parts = key.split("::");
    if (parts.length >= 2) {
        // Simple internal normalization mirroring lineUtils to keep graphUtils robust
        return `${parts[0]}::${parts[1].replace(/(線| Line| 선)$/, "").trim()}`;
    }
    return key;
};

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
            this.loadFromSystematicJson(data);
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

    addEdge(u: string, v: string, distance: number, geometry: [number, number][]) {
        if (!this.adj.has(u)) this.adj.set(u, []);
        if (!this.adj.has(v)) this.adj.set(v, []);

        this.adj.get(u)?.push({ to: v, distance, geometry });
        // Assuming undirected for now, but need to check if geometry needs reversing
        this.adj.get(v)?.push({ to: u, distance, geometry: [...geometry].reverse() });
    }

    getShortestPathByName(startName: string, endName: string, allowedLines: string[] | null = null, startCoords?: [number, number], endCoords?: [number, number]): { path: string[], distance: number, geometries: [number, number][][] } | null {
        let startIds = this.stationsByName[startName];
        let endIds = this.stationsByName[endName];

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
        // ... legacy/direct ID internal logic if needed, or remove?
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
    getLineSegments(fullLineId: string): { stations: string[], edges: { from: string, to: string, distance: number }[] }[] {
        const simplifiedIds = this.reverseLineIdMap.get(fullLineId) || [fullLineId];

        const lineEdges = Array.from(this.adj.entries())
            .filter(([u]) => simplifiedIds.some(id => u.startsWith(id)))
            .flatMap(([u, edges]) => edges.filter(e => simplifiedIds.some(id => e.to.startsWith(id))).map(e => ({ from: u, ...e })));

        if (lineEdges.length === 0) return [];

        // Helper to get name from ID
        const getName = (id: string) => this.nodes.get(id)?.name || id.split('::').pop() || id;

        // Group platforms into logical stations by name
        const nameToRepId = new Map<string, string>();
        // 양방향 인접 리스트: Name -> Map<TargetName, Distance>
        const biAdj = new Map<string, Map<string, number>>();

        lineEdges.forEach(e => {
            const uName = getName(e.from);
            const vName = getName(e.to);

            if (uName === vName) return; // Skip internal platform connections

            if (!nameToRepId.has(uName)) nameToRepId.set(uName, e.from);
            if (!nameToRepId.has(vName)) nameToRepId.set(vName, e.to);

            // 양방향으로 저장
            if (!biAdj.has(uName)) biAdj.set(uName, new Map());
            if (!biAdj.has(vName)) biAdj.set(vName, new Map());

            const fwdDist = biAdj.get(uName)!.get(vName) || Infinity;
            biAdj.get(uName)!.set(vName, Math.min(fwdDist, e.distance));
            const bwdDist = biAdj.get(vName)!.get(uName) || Infinity;
            biAdj.get(vName)!.set(uName, Math.min(bwdDist, e.distance));
        });

        // edge key를 사용하여 중복 방문 방지
        const getEdgeKey = (u: string, v: string) => [u, v].sort().join('<->');
        const visitedEdgeKeys = new Set<string>();

        const segments: { stations: string[], edges: { from: string, to: string, distance: number }[] }[] = [];

        // DFS로 segment 추출: 한 시작점에서 분기점까지 또는 끝까지
        const traceSegment = (startName: string, firstNeighbor?: string) => {
            const names = [startName];
            const edges: { from: string, to: string, distance: number }[] = [];
            let curr = startName;

            // 첫 번째 이웃이 지정된 경우 해당 방향으로 시작
            if (firstNeighbor) {
                const dist = biAdj.get(curr)!.get(firstNeighbor)!;
                const edgeKey = getEdgeKey(curr, firstNeighbor);
                if (visitedEdgeKeys.has(edgeKey)) return null;
                visitedEdgeKeys.add(edgeKey);
                edges.push({
                    from: nameToRepId.get(curr)!,
                    to: nameToRepId.get(firstNeighbor)!,
                    distance: dist
                });
                names.push(firstNeighbor);
                curr = firstNeighbor;
            }

            while (true) {
                const neighbors = biAdj.get(curr);
                if (!neighbors) break;

                // 미방문 edge가 있는 이웃 찾기
                const unvisited = Array.from(neighbors.entries())
                    .filter(([name]) => !visitedEdgeKeys.has(getEdgeKey(curr, name)));

                if (unvisited.length === 0) break;

                // 미방문 edge가 1개면 직선 진행
                // 미방문 edge가 2개 이상이면 분기점 - 하나만 따라가고 나머지는 나중에
                const [nextName, dist] = unvisited[0];
                const edgeKey = getEdgeKey(curr, nextName);
                visitedEdgeKeys.add(edgeKey);
                edges.push({
                    from: nameToRepId.get(curr)!,
                    to: nameToRepId.get(nextName)!,
                    distance: dist
                });
                names.push(nextName);
                curr = nextName;

                // 다음 노드가 분기점(미방문 edge 2개 이상)이면 여기서 끊어서
                // 후속 segment가 이 노드에서 시작하여 branch로 연결되도록 함
                const nextNeighbors = biAdj.get(curr);
                if (nextNeighbors) {
                    const nextUnvisited = Array.from(nextNeighbors.entries())
                        .filter(([name]) => !visitedEdgeKeys.has(getEdgeKey(curr, name)));
                    if (nextUnvisited.length > 1) break; // 다음 노드가 분기점이면 segment 종료
                }
            }

            if (names.length > 1) {
                return { stations: names.map(n => nameToRepId.get(n)!), edges };
            }
            return null;
        };

        const logicalNodes = Array.from(nameToRepId.keys());

        // 1. leaf 노드 (degree 1)를 먼저 탐색하여 메인 라인 시작
        const leaves = logicalNodes.filter(name => (biAdj.get(name)?.size || 0) === 1);

        for (const leaf of leaves) {
            const neighbors = biAdj.get(leaf);
            if (!neighbors) continue;

            for (const [neighbor] of neighbors) {
                const edgeKey = getEdgeKey(leaf, neighbor);
                if (visitedEdgeKeys.has(edgeKey)) continue;

                const seg = traceSegment(leaf, neighbor);
                if (seg) segments.push(seg);
            }
        }

        // 2. 분기점에서 남은 edge 처리
        let changed = true;
        while (changed) {
            changed = false;
            for (const name of logicalNodes) {
                const neighbors = biAdj.get(name);
                if (!neighbors) continue;

                for (const [neighbor] of neighbors) {
                    const edgeKey = getEdgeKey(name, neighbor);
                    if (visitedEdgeKeys.has(edgeKey)) continue;

                    const seg = traceSegment(name, neighbor);
                    if (seg) {
                        segments.push(seg);
                        changed = true;
                    }
                }
            }
        }

        return segments;
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

/**
 * Calculates the shortest distance from a point to a line segment.
 * @param p [lon, lat]
 * @param v segment start [lon, lat]
 * @param w segment end [lon, lat]
 */
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
                            // console.log(`Adding logical fallback edge: ${nameA} -> ${nameB} (${lineName})`);
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

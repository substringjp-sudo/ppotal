export interface StationNode {
    id: string; // company::line::stationName
    name: string;
    company: string;
    line: string;
    coords: [number, number]; // [lon, lat]
}

export interface Edge {
    to: string;
    distance: number;
    geometry: [number, number][];
}

export class RailroadGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, Edge[]> = new Map();

    addNode(node: StationNode) {
        this.nodes.set(node.id, node);
        if (!this.adj.has(node.id)) {
            this.adj.set(node.id, []);
        }
    }

    addEdge(u: string, v: string, distance: number, geometry: [number, number][]) {
        if (!this.adj.has(u)) this.adj.set(u, []);
        if (!this.adj.has(v)) this.adj.set(v, []);

        this.adj.get(u)?.push({ to: v, distance, geometry });
        // Assuming undirected for now, but need to check if geometry needs reversing
        this.adj.get(v)?.push({ to: u, distance, geometry: [...geometry].reverse() });
    }

    getShortestPath(startId: string, endId: string): { path: string[], distance: number, geometries: [number, number][][] } | null {
        const distances: Record<string, number> = {};
        const previous: Record<string, string | null> = {};
        const geometries: Record<string, [number, number][][]> = {};
        const nodes = new Set<string>();

        for (const nodeId of this.nodes.keys()) {
            distances[nodeId] = Infinity;
            previous[nodeId] = null;
            geometries[nodeId] = [];
            nodes.add(nodeId);
        }

        distances[startId] = 0;

        while (nodes.size > 0) {
            let closestNode: string | null = null;
            for (const nodeId of nodes) {
                if (closestNode === null || distances[nodeId] < distances[closestNode]) {
                    closestNode = nodeId;
                }
            }

            if (closestNode === null || distances[closestNode] === Infinity) break;
            if (closestNode === endId) break;

            nodes.delete(closestNode);

            const neighbors = this.adj.get(closestNode) || [];
            for (const neighbor of neighbors) {
                if (!nodes.has(neighbor.to)) continue;

                const alt = distances[closestNode] + neighbor.distance;
                if (alt < distances[neighbor.to]) {
                    distances[neighbor.to] = alt;
                    previous[neighbor.to] = closestNode;
                    // Store the geometry used to reach this node
                    geometries[neighbor.to] = [...geometries[closestNode], neighbor.geometry];
                }
            }
        }

        if (distances[endId] === Infinity) return null;

        const path: string[] = [];
        let curr: string | null = endId;
        while (curr !== null) {
            path.unshift(curr);
            curr = previous[curr];
        }

        return {
            path,
            distance: distances[endId],
            geometries: geometries[endId]
        };
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

export const buildGraph = (stationsGeoJson: any, sectionGeoJson: any): RailroadGraph => {
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

        const node: StationNode = { id, name, company, line, coords: midpoint };
        graph.addNode(node);

        if (!stationMap[lineKey]) stationMap[lineKey] = [];
        stationMap[lineKey].push(node);
    });

    // 2. Process Sections and Build Edges
    sectionGeoJson.features.forEach((f: any) => {
        const props = f.properties;
        const company = props.N02_004;
        const line = props.N02_003;
        const lineKey = `${company}::${line}`;
        const lineStations = stationMap[lineKey] || [];

        const geom = f.geometry;
        if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) return;

        const connectStations = (coords: [number, number][]) => {
            const start = coords[0];
            const end = coords[coords.length - 1];

            let startStation: StationNode | null = null;
            let endStation: StationNode | null = null;
            let minDistStart = 0.1; // 100m
            let minDistEnd = 0.1;

            for (const s of lineStations) {
                const dStart = haversineDistance(start, s.coords);
                const dEnd = haversineDistance(end, s.coords);

                if (dStart < minDistStart) {
                    minDistStart = dStart;
                    startStation = s;
                }
                if (dEnd < minDistEnd) {
                    minDistEnd = dEnd;
                    endStation = s;
                }
            }

            if (startStation && endStation && startStation.id !== endStation.id) {
                let dist = 0;
                for (let i = 0; i < coords.length - 1; i++) {
                    dist += haversineDistance(coords[i] as [number, number], coords[i + 1] as [number, number]);
                }
                graph.addEdge(startStation.id, endStation.id, dist, coords);
            }
        };

        if (geom.type === 'LineString') {
            connectStations(geom.coordinates as [number, number][]);
        } else {
            geom.coordinates.forEach((polyline: any) => connectStations(polyline as [number, number][]));
        }
    });

    // 3. Add Transfer Edges (Same station name, different lines)
    const stationsByName: Record<string, string[]> = {};
    for (const [id, node] of graph.nodes) {
        if (!stationsByName[node.name]) stationsByName[node.name] = [];
        stationsByName[node.name].push(id);
    }

    for (const name in stationsByName) {
        const ids = stationsByName[name];
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                // Transfer edge with small penalty (0.1km)
                graph.addEdge(ids[i], ids[j], 0.1, [
                    graph.nodes.get(ids[i])!.coords,
                    graph.nodes.get(ids[j])!.coords
                ]);
            }
        }
    }

    return graph;
};

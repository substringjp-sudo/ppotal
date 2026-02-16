import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';
import { fileURLToPath } from 'url';
import type { Feature, Point, FeatureCollection } from 'geojson';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface StationMaster {
    [id: string]: {
        id: string;
        primary_name: string;
        stations: {
            name: string;
            line: string;
            company: string;
            code: string;
            lat: number;
            lon: number;
            geometries: number[][][]; // Polygons
        }[];
        lat: number;
        lon: number;
    };
}

// Paths
const publicDir = path.join(__dirname, '../public');
const railroadPath = path.join(publicDir, 'N02-22_RailroadSection.geojson');
const stationPath = path.join(publicDir, 'station_master_list.json');
const outputPathGraph = path.join(publicDir, 'railroad_graph.json');
const outputPathGeo = path.join(publicDir, 'enriched_railroads.geojson');

console.log('Loading data...');
const railroadData = JSON.parse(fs.readFileSync(railroadPath, 'utf-8'));
const stationData: StationMaster = JSON.parse(fs.readFileSync(stationPath, 'utf-8'));

// Matching Logic
let matchedCount = 0;
const graphEdges: any[] = [];

// --- Topology Building ---
console.log('Building segment topology...');
const pointToStations: Map<string, Set<string>> = new Map();
const adjacency: Map<string, Set<number>> = new Map();

const getPointKey = (coord: number[]) => `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;

// 1. Identify "Station Nodes" in the railroad network
console.log('Identifying station-adjacent points...');
const uniquePointsMap: Map<string, number[]> = new Map();
railroadData.features.forEach((f: any) => {
    if (f.geometry.type !== 'LineString') return;
    const start = f.geometry.coordinates[0];
    const end = f.geometry.coordinates[f.geometry.coordinates.length - 1];
    uniquePointsMap.set(getPointKey(start), start);
    uniquePointsMap.set(getPointKey(end), end);
});

const THRESHOLD_KM = 0.3;
const stationFeatures = Object.values(stationData).map(s => turf.point([s.lon, s.lat], { id: s.id }));
const stationCollection = turf.featureCollection(stationFeatures);

uniquePointsMap.forEach((coord, key) => {
    const pt = turf.point(coord);
    const nearest = turf.nearestPoint(pt, stationCollection);
    const dist = turf.distance(pt, nearest);
    if (dist < THRESHOLD_KM) {
        if (!pointToStations.has(key)) pointToStations.set(key, new Set());
        pointToStations.get(key)!.add(nearest.properties.id);
    }
});

// 2. Build adjacency
railroadData.features.forEach((feature: any, index: number) => {
    if (feature.geometry.type !== 'LineString') return;
    const coords = feature.geometry.coordinates;
    const start = getPointKey(coords[0]);
    const end = getPointKey(coords[coords.length - 1]);

    if (!adjacency.has(start)) adjacency.set(start, new Set());
    if (!adjacency.has(end)) adjacency.set(end, new Set());
    adjacency.get(start)!.add(index);
    adjacency.get(end)!.add(index);
});

// 3. Propagate Station IDs using BFS (Independent search from each end)
console.log('Propagating station IDs via BFS...');

const findFirstStation = (featureIndex: number, side: 'start' | 'end'): string | null => {
    const feature = railroadData.features[featureIndex];
    const sideIdx = side === 'start' ? 0 : feature.geometry.coordinates.length - 1;
    const startPointKey = getPointKey(feature.geometry.coordinates[sideIdx]);

    const queue: { point: string; dist: number }[] = [{ point: startPointKey, dist: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const { point, dist } = queue.shift()!;
        if (visited.has(point)) continue;
        visited.add(point);

        if (pointToStations.has(point)) {
            return Array.from(pointToStations.get(point)!)[0];
        }

        if (dist > 40) continue; // Search up to 40 segments away

        const neighbors = adjacency.get(point) || new Set();
        for (const nextIdx of neighbors) {
            const nextFeature = railroadData.features[nextIdx];
            // Only propagate within same line to avoid "jumping" to crossing lines
            if (nextFeature.properties.N02_003 !== feature.properties.N02_003) continue;

            const nextCoords = nextFeature.geometry.coordinates;
            const nextStart = getPointKey(nextCoords[0]);
            const nextEnd = getPointKey(nextCoords[nextCoords.length - 1]);

            queue.push({ point: nextStart, dist: dist + 1 });
            queue.push({ point: nextEnd, dist: dist + 1 });
        }
    }
    return null;
};

// 4. Enrich features
const enrichedFeatures = railroadData.features.map((feature: any, index: number) => {
    if (feature.geometry.type !== 'LineString') return feature;

    const s1 = findFirstStation(index, 'start');
    const s2 = findFirstStation(index, 'end');

    const newProps = {
        ...feature.properties,
        start_station: s1 || '?',
        end_station: s2 || '?',
        length_km: turf.length(feature)
    };

    if (s1 && s2 && s1 !== s2) {
        matchedCount++;
        graphEdges.push({
            from: s1,
            to: s2,
            line: feature.properties.N02_003,
            company: feature.properties.N02_004,
            distance: newProps.length_km
        });
    }

    return { ...feature, properties: newProps };
});

console.log(`Matched ${matchedCount} segments connecting two stations.`);

// Output
console.log('Writing output files...');
fs.writeFileSync(outputPathGeo, JSON.stringify({
    type: 'FeatureCollection',
    features: enrichedFeatures
}, null, 2));

const graphData = {
    // Fix: Assign ID first then spread the rest to avoid overwrite warning
    nodes: Object.keys(stationData).map(id => {
        const data = stationData[id];
        return { ...data, id: id };
    }),
    edges: graphEdges
};

fs.writeFileSync(outputPathGraph, JSON.stringify(graphData, null, 2));

console.log('Done!');

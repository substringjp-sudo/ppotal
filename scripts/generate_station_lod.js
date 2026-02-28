const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const RAIL_DIR = path.join(PUBLIC_DIR, 'rail');

function generateStationLod() {
    console.log('Loading data...');
    const stations = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'stations.json'), 'utf-8'));
    const platforms = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms.json'), 'utf-8'));
    const graph = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'railroad_graph.json'), 'utf-8'));

    // 1. Group stations by name and proximity (Hubbing)
    const nameToId = new Map();
    const hubs = {};

    console.log('Grouping stations into hubs...');
    Object.values(stations).forEach(s => {
        const stationLines = new Set();
        if (s.platform_ids) {
            s.platform_ids.forEach(pid => {
                const p = platforms[pid];
                if (p) stationLines.add(`${p.company}::${p.line}`);
            });
        }

        const hubKey = `${s.name}_${s.name_en}`;
        let targetId = s.id;

        if (nameToId.has(hubKey)) {
            const existingId = nameToId.get(hubKey);
            const existing = hubs[existingId];
            if (existing) {
                const dLat = Math.abs(existing.centroid[0] - s.lat);
                const dLon = Math.abs(existing.centroid[1] - s.lon);
                if (dLat < 0.005 && dLon < 0.005) {
                    targetId = existingId;
                }
            }
        } else {
            nameToId.set(hubKey, s.id);
        }

        if (!hubs[targetId]) {
            hubs[targetId] = {
                id: targetId,
                name: s.name,
                name_en: s.name_en,
                nodeIds: [s.id],
                centroid: [s.lat, s.lon],
                lines: Array.from(stationLines),
                nodes: [{
                    id: s.id,
                    coord: [s.lat, s.lon],
                    lines: Array.from(stationLines)
                }]
            };
        } else {
            hubs[targetId].nodeIds.push(s.id);
            stationLines.forEach(l => {
                if (!hubs[targetId].lines.includes(l)) hubs[targetId].lines.push(l);
            });
            hubs[targetId].nodes.push({
                id: s.id,
                coord: [s.lat, s.lon],
                lines: Array.from(stationLines)
            });
            const totalNodes = hubs[targetId].nodes.length;
            const avgLat = hubs[targetId].nodes.reduce((acc, n) => acc + n.coord[0], 0) / totalNodes;
            const avgLon = hubs[targetId].nodes.reduce((acc, n) => acc + n.coord[1], 0) / totalNodes;
            hubs[targetId].centroid = [avgLat, avgLon];
        }
    });

    // 2. Assign importance metrics
    console.log('Calculating importance...');
    const hubList = Object.values(hubs);

    // Count neighbor node connections (to find terminals)
    const nodeToNeighbors = {};
    Object.entries(graph.stationGraph).forEach(([id, neighbors]) => {
        nodeToNeighbors[id] = Object.keys(neighbors).length;
    });

    hubList.forEach(hub => {
        let maxNeighbors = 0;
        hub.nodeIds.forEach(id => {
            maxNeighbors = Math.max(maxNeighbors, nodeToNeighbors[id] || 0);
        });
        hub.maxNeighbors = maxNeighbors;

        // Count line diversity
        const lineCount = hub.lines.length;
        const companyCount = new Set(hub.lines.map(l => l.split('::')[0])).size;

        let minZoom = 13; // Default for small stations

        if (lineCount >= 6 || (hub.name.includes("東京") && lineCount >= 4) || (hub.name.includes("新宿") && lineCount >= 4)) {
            minZoom = 1; // Major global hubs
        } else if (lineCount >= 4 || companyCount >= 3) {
            minZoom = 7; // Regional hubs
        } else if (lineCount >= 3 || companyCount >= 2) {
            minZoom = 8; // Important transfer stations
        } else if (lineCount === 2) {
            minZoom = 9; // Basic transfer stations
        } else if (maxNeighbors === 1 || maxNeighbors >= 3) {
            minZoom = 11; // Terminals or forks often slightly more visible
        } else {
            minZoom = 12; // Regular line station
        }

        // Boost some names (major cities)
        if (hub.name.endsWith("駅") && hub.name.length < 5 && lineCount >= 2) minZoom = Math.min(minZoom, 8);

        hub.minZoom = minZoom;
    });

    // 3. Spatially cull dense stations at low zooms (to keep the map readable)
    console.log('Spatial culling...');
    [7, 8, 9, 10, 11, 12].forEach(z => {
        const cullDist = z === 7 ? 0.05 : (z === 8 ? 0.02 : (z === 9 ? 0.01 : 0.005));
        const currentShow = hubList.filter(h => h.minZoom <= z).sort((a, b) => b.lines.length - a.lines.length);
        const accepted = [];

        currentShow.forEach(cand => {
            const tooDense = accepted.some(acc => {
                const dLat = Math.abs(acc.centroid[0] - cand.centroid[0]);
                const dLon = Math.abs(acc.centroid[1] - cand.centroid[1]);
                return dLat < cullDist && dLon < cullDist;
            });
            if (tooDense) {
                // If it was already set to show at this zoom, we might push it to a later zoom if it's not a major hub
                if (cand.lines.length < 3) {
                    cand.minZoom = Math.max(cand.minZoom, z + 1);
                }
            } else {
                accepted.push(cand);
            }
        });
    });

    // 4. Save results
    console.log('Writing output...');
    const output = hubList.map(h => ({
        id: h.id,
        name: h.name,
        name_en: h.name_en,
        z: h.minZoom,
        lines: h.lines,
        nodes: h.nodes.map(n => ({ id: n.id, c: n.coord })),
        c: h.centroid
    }));

    fs.writeFileSync(path.join(RAIL_DIR, 'stations_lod.json'), JSON.stringify(output));
    console.log(`Generated LOD info for ${output.length} stations.`);
}

generateStationLod();

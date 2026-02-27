const fs = require('fs');
const path = require('path');

const SECTIONS_PATH = path.join(__dirname, '../public/rail/sections.json');
const STATIONS_PATH = path.join(__dirname, '../public/rail/stations.json');
const PLATFORMS_PATH = path.join(__dirname, '../public/rail/platforms.json');
const GRAPH_PATH = path.join(__dirname, '../public/rail/railroad_graph.json');

const coordKey = (pt) => `${Number(pt[0]).toFixed(6)},${Number(pt[1]).toFixed(6)}`;

function main() {
    console.log('Loading data...');
    const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'));
    const platforms = JSON.parse(fs.readFileSync(PLATFORMS_PATH, 'utf8'));
    const sectionsData = JSON.parse(fs.readFileSync(SECTIONS_PATH, 'utf8'));
    const sections = sectionsData.sections;

    console.log('Indexing sections...');
    const coordToSections = new Map();
    sections.forEach(s => {
        const startKey = coordKey(s.geometry[0]);
        const endKey = coordKey(s.geometry[s.geometry.length - 1]);

        if (!coordToSections.has(startKey)) coordToSections.set(startKey, []);
        coordToSections.get(startKey).push(s);

        if (!coordToSections.has(endKey)) coordToSections.set(endKey, []);
        coordToSections.get(endKey).push(s);
    });

    const coordToStationId = new Map();
    Object.keys(stations).forEach(id => {
        const s = stations[id];
        coordToStationId.set(coordKey([s.lon, s.lat]), id);
    });

    // Map platform coordinates to their station IDs
    // Also track which lines each station serves
    const stationServedLines = new Map();
    Object.keys(stations).forEach(sid => {
        const s = stations[sid];
        const lines = new Set();
        (s.platform_ids || []).forEach(pid => {
            if (platforms[pid]) lines.add(platforms[pid].line);
        });
        stationServedLines.set(sid, lines);
    });

    Object.keys(platforms).forEach(pid => {
        const p = platforms[pid];
        if (p.geometries) {
            const stationId = Object.keys(stations).find(sid => (stations[sid].platform_ids || []).includes(pid));
            if (stationId) {
                p.geometries.forEach(gen => {
                    gen.forEach(pt => {
                        coordToStationId.set(coordKey(pt), stationId);
                    });
                });
            }
        }
    });

    console.log('Building railroad graph...');
    const platformGraph = {};
    const stationGraph = {};

    Object.keys(stations).forEach(stationId => {
        const station = stations[stationId];
        platformGraph[stationId] = {};
        stationGraph[stationId] = {};

        (station.platform_ids || []).forEach(platformId => {
            const platform = platforms[platformId];
            if (!platform || !platform.geometries) return;

            const platformConnections = [];
            const targetLineId = platform.line;
            const seenPortalKeys = new Set();

            platform.geometries.forEach(geo => {
                geo.forEach((pt, ptIdx) => {
                    const portalKey = coordKey(pt);
                    if (seenPortalKeys.has(portalKey)) return;
                    seenPortalKeys.add(portalKey);

                    const neighbors = [];
                    const foundStations = new Set();

                    const candidateSections = (coordToSections.get(portalKey) || [])
                        .filter(s => s.line_id === targetLineId);

                    candidateSections.forEach(startSection => {
                        const sStart = coordKey(startSection.geometry[0]);
                        const sEnd = coordKey(startSection.geometry[startSection.geometry.length - 1]);
                        const nextKey = sStart === portalKey ? sEnd : sStart;

                        const q = [{
                            currKey: nextKey,
                            path: [startSection.id],
                            skipped: [],
                            visited: new Set([portalKey, sStart, sEnd])
                        }];

                        while (q.length > 0) {
                            const { currKey, path, skipped, visited } = q.shift();

                            if (coordToStationId.has(currKey) && coordToStationId.get(currKey) !== stationId) {
                                const hitStationId = coordToStationId.get(currKey);
                                const servedLines = stationServedLines.get(hitStationId);

                                if (servedLines.has(targetLineId)) {
                                    // This is an actual STOP for this line
                                    if (!foundStations.has(hitStationId)) {
                                        foundStations.add(hitStationId);
                                        const targetStation = stations[hitStationId];

                                        const neighbor = {
                                            station_id: hitStationId,
                                            name: targetStation.name,
                                            line_id: targetLineId,
                                            available_lines: Array.from(servedLines),
                                            sections: path,
                                            skipped: skipped
                                        };
                                        neighbors.push(neighbor);

                                        // Add to flattened station graph for routing
                                        if (!stationGraph[stationId][hitStationId]) {
                                            stationGraph[stationId][hitStationId] = {
                                                section_ids: [],
                                                available_lines: neighbor.available_lines
                                            };
                                        }
                                        const existingSecs = new Set(stationGraph[stationId][hitStationId].section_ids);
                                        path.forEach(sid => existingSecs.add(sid));
                                        stationGraph[stationId][hitStationId].section_ids = Array.from(existingSecs);
                                    }
                                    continue; // Stop BFS here since we hit a stopping station
                                } else {
                                    // This station is EXCLUDED (SKIPPED) by this line
                                    if (!skipped.includes(hitStationId)) {
                                        skipped.push(hitStationId);
                                    }
                                    // CONTINUE BFS to find the next stopping station
                                }
                            }

                            const nextSections = (coordToSections.get(currKey) || [])
                                .filter(s => s.line_id === targetLineId && !path.includes(s.id));

                            nextSections.forEach(ns => {
                                const nsStart = coordKey(ns.geometry[0]);
                                const nsEnd = coordKey(ns.geometry[ns.geometry.length - 1]);
                                const nextKey = nsStart === currKey ? nsEnd : nsStart;

                                if (!visited.has(nextKey)) {
                                    const nextVisited = new Set(visited);
                                    nextVisited.add(nextKey);
                                    q.push({
                                        currKey: nextKey,
                                        path: [...path, ns.id],
                                        skipped: [...skipped],
                                        visited: nextVisited
                                    });
                                }
                            });
                        }
                    });

                    if (neighbors.length > 0) {
                        platformConnections.push({
                            point: pt,
                            point_index: ptIdx,
                            neighbors: neighbors
                        });
                    }
                });
            });

            if (platformConnections.length > 0) {
                platformGraph[stationId][platformId] = platformConnections;
            }
        });
    });

    const output = {
        stationGraph,
        platformGraph
    };

    fs.writeFileSync(GRAPH_PATH, JSON.stringify(output, null, 2));
    console.log(`Saved new graph to ${GRAPH_PATH}`);
}

main();

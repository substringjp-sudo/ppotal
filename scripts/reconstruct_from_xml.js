const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, '../public/N02-22.xml');
const OUTPUT_PATH = path.join(__dirname, '../public/systematic_railroad_network.json');

function haversineDistance(coords1, coords2) {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getPointKey(coords) {
    return `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
}

function solve() {
    console.log('Reading XML file...');
    const content = fs.readFileSync(XML_PATH, 'utf8');

    console.log('Parsing Curves...');
    const curveMap = new Map();
    const curveRegex = /<gml:Curve gml:id="([^"]+)">[\s\S]*?<gml:posList>([\s\S]*?)<\/gml:posList>/g;
    let match;
    while ((match = curveRegex.exec(content)) !== null) {
        const id = match[1];
        const posList = match[2].trim().split(/\s+/).map(Number);
        const coords = [];
        for (let i = 0; i < posList.length; i += 2) {
            coords.push([posList[i + 1], posList[i]]); // [lng, lat]
        }
        curveMap.set(id, coords);
    }
    console.log(`Found ${curveMap.size} curves.`);

    console.log('Parsing Stations...');
    const stationIdToName = new Map();
    const stationBlocks = content.split('<ksj:Station ');
    for (let i = 1; i < stationBlocks.length; i++) {
        const block = stationBlocks[i];
        const idMatch = block.match(/gml:id="([^"]+)"/);
        const nameMatch = block.match(/<ksj:stationName>([^<]+)<\/ksj:stationName>/);
        if (idMatch && nameMatch) {
            stationIdToName.set(idMatch[1], nameMatch[1]);
        }
    }

    console.log('Parsing RailroadSections...');
    const sections = [];
    const sectionBlocks = content.split('<ksj:RailroadSection ');
    for (let i = 1; i < sectionBlocks.length; i++) {
        const block = sectionBlocks[i];
        const idMatch = block.match(/gml:id="([^"]+)"/);
        const curveMatch = block.match(/<ksj:location xlink:href="#([^"]+)"\/>/);
        const lineMatch = block.match(/<ksj:railwayLineName>([^<]+)<\/ksj:railwayLineName>/);
        const companyMatch = block.match(/<ksj:operationCompany>([^<]+)<\/ksj:operationCompany>/);
        const stnMatch = block.match(/<ksj:station xlink:href="#([^"]+)"\/>/);

        if (idMatch && curveMatch && lineMatch && companyMatch) {
            sections.push({
                id: idMatch[1],
                curveId: curveMatch[1],
                lineName: lineMatch[1],
                company: companyMatch[1],
                stationId: stnMatch ? stnMatch[1] : null,
                stationName: stnMatch ? stationIdToName.get(stnMatch[1]) : null
            });
        }
    }

    const result = { routes: [], stations: {}, transfers: [] };

    console.log('Building Global Platform Registry...');
    const globalPointsToStationIds = new Map(); // pointKey -> Set(fullStationId)
    const stationDataMap = new Map(); // fullStationId -> { name, coords, platforms: [] }

    for (const s of sections) {
        if (s.stationName) {
            const fullId = `${s.company}::${s.lineName}::${s.stationName}`;
            const curve = curveMap.get(s.curveId);
            if (!curve) continue;

            if (!stationDataMap.has(fullId)) {
                stationDataMap.set(fullId, {
                    name: s.stationName,
                    coords: curve[Math.floor(curve.length / 2)],
                    platforms: []
                });
            }
            const data = stationDataMap.get(fullId);
            data.platforms.push(curve);

            const p1 = getPointKey(curve[0]);
            const p2 = getPointKey(curve[curve.length - 1]);
            if (!globalPointsToStationIds.has(p1)) globalPointsToStationIds.set(p1, new Set());
            if (!globalPointsToStationIds.has(p2)) globalPointsToStationIds.set(p2, new Set());
            globalPointsToStationIds.get(p1).add(fullId);
            globalPointsToStationIds.get(p2).add(fullId);
        }
    }

    for (const [id, data] of stationDataMap) {
        result.stations[id] = data;
    }

    console.log('Building Route Topology...');
    const routeGroups = new Map();
    for (const s of sections) {
        const key = `${s.company}::${s.lineName}`;
        if (!routeGroups.has(key)) routeGroups.set(key, []);
        routeGroups.get(key).push(s);
    }

    for (const [routeKey, routeSections] of routeGroups) {
        const tracks = routeSections.filter(s => !s.stationName);
        const routeStations = [...new Set(routeSections.filter(s => s.stationName).map(s => `${s.company}::${s.lineName}::${s.stationName}`))];

        if (routeStations.length === 0) continue;

        const adj = new Map();
        for (const t of tracks) {
            const curve = curveMap.get(t.curveId);
            if (!curve) continue;
            const p1 = getPointKey(curve[0]);
            const p2 = getPointKey(curve[curve.length - 1]);
            const dist = haversineDistance(curve[0], curve[curve.length - 1]);
            if (!adj.has(p1)) adj.set(p1, []);
            if (!adj.has(p2)) adj.set(p2, []);
            adj.get(p1).push({ to: p2, dist, geom: curve });
            adj.get(p2).push({ to: p1, dist, geom: [...curve].reverse() });
        }

        const routeEdges = [];
        const seenEdges = new Set();

        for (const s1FullId of routeStations) {
            const s1Meta = stationDataMap.get(s1FullId);
            const startPoints = new Set();
            for (const plat of s1Meta.platforms) {
                startPoints.add(getPointKey(plat[0]));
                startPoints.add(getPointKey(plat[plat.length - 1]));
            }

            for (const startPoint of startPoints) {
                const q = [{ node: startPoint, dist: 0, geom: [] }];
                const visited = new Set([startPoint]);

                while (q.length > 0) {
                    const { node, dist, geom } = q.shift();

                    if (dist > 0) { // Only check for targets IF we have moved from the start point
                        const targetStations = globalPointsToStationIds.get(node);
                        if (targetStations) {
                            let foundOther = false;
                            for (const s2FullId of targetStations) {
                                if (s2FullId === s1FullId) continue;
                                foundOther = true;
                                const edgeKey = [s1FullId, s2FullId].sort().join('<->');
                                if (!seenEdges.has(edgeKey)) {
                                    const p1 = result.stations[s1FullId].coords;
                                    const p2 = result.stations[s2FullId].coords;
                                    routeEdges.push({
                                        from: s1FullId,
                                        to: s2FullId,
                                        distance: dist,
                                        geometry: [p1, ...geom, p2]
                                    });
                                    seenEdges.add(edgeKey);
                                }
                            }
                            if (foundOther) continue; // Stop at the first junction with another station
                        }
                    }

                    (adj.get(node) || []).forEach(edge => {
                        if (visited.has(edge.to)) return;
                        visited.add(edge.to);
                        q.push({
                            node: edge.to,
                            dist: dist + edge.dist,
                            geom: [...geom, ...edge.geom.slice(1)]
                        });
                    });
                }
            }
        }
        result.routes.push({ id: routeKey, company: routeSections[0].company, line: routeSections[0].lineName, edges: routeEdges });
    }

    console.log('Identifying Transfers...');
    const allIds = Object.keys(result.stations);
    const seenTransfers = new Set();
    for (let i = 0; i < allIds.length; i++) {
        for (let j = i + 1; j < allIds.length; j++) {
            const id1 = allIds[i];
            const id2 = allIds[j];
            const s1Name = result.stations[id1].name;
            const s2Name = result.stations[id2].name;
            const dist = haversineDistance(result.stations[id1].coords, result.stations[id2].coords);
            if (s1Name === s2Name && dist < 1.0) {
                const key = [id1, id2].sort().join('|');
                if (!seenTransfers.has(key)) {
                    result.transfers.push({ from: id1, to: id2, distance: Math.max(0.01, dist), type: 'logical' });
                    seenTransfers.add(key);
                }
            }
        }
    }

    console.log('Writing output...');
    const finalData = JSON.parse(JSON.stringify(result, (key, value) => {
        if ((key === 'coords' || key === 'geometry' || key === 'platforms') && Array.isArray(value)) {
            return value.map(v => Array.isArray(v) ? v.map(n => Math.round(n * 1000000) / 1000000) : Math.round(v * 1000000) / 1000000);
        }
        return value;
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log('Done!');
}

solve();

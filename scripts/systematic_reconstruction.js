const fs = require('fs');
const path = require('path');

const STATION_PATH = path.join(__dirname, '../public/N02-22_Station.geojson');
const SECTION_PATH = path.join(__dirname, '../public/N02-22_RailroadSection.geojson');
const OUTPUT_PATH = path.join(__dirname, '../public/systematic_railroad_network.json');

/**
 * 2D 하버사인 거리 계산 (km)
 */
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

/**
 * 선분 위의 최근접 점 찾기 (t: 0~1)
 */
function getClosestPointOnSegment(p, a, b) {
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
        param = 0;
    } else if (param > 1) {
        xx = x2; yy = y2;
        param = 1;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    return { point: [xx, yy], t: param, distSq: (x - xx) ** 2 + (y - yy) ** 2 };
}

function solve() {
    console.log('Loading datasets...');
    const stationsData = JSON.parse(fs.readFileSync(STATION_PATH, 'utf8'));
    const sectionsData = JSON.parse(fs.readFileSync(SECTION_PATH, 'utf8'));

    const routeMap = {};

    stationsData.features.forEach(f => {
        const company = f.properties.N02_004;
        const line = f.properties.N02_003;
        const name = f.properties.N02_005;
        const key = `${company}::${line}`;

        if (!routeMap[key]) {
            routeMap[key] = { company, line, stations: [], sections: [] };
        }

        const coords = f.geometry.coordinates;
        const midpoint = [
            (coords[0][0] + coords[coords.length - 1][0]) / 2,
            (coords[0][1] + coords[coords.length - 1][1]) / 2
        ];

        routeMap[key].stations.push({ name, coords: midpoint, id: `${key}::${name}::${routeMap[key].stations.length}` });
    });

    sectionsData.features.forEach(f => {
        const company = f.properties.N02_004;
        const line = f.properties.N02_003;
        const key = `${company}::${line}`;

        if (routeMap[key]) {
            routeMap[key].sections.push(f.geometry);
        }
    });

    const resultNetwork = {
        routes: [],
        stations: {}, // id -> info
    };

    console.log(`Processing ${Object.keys(routeMap).length} routes...`);

    let processedCount = 0;
    for (const key in routeMap) {
        const route = routeMap[key];
        const stationsOnRoute = route.stations;
        const sections = route.sections;

        if (stationsOnRoute.length < 2) continue;

        // 1. 모든 세그먼트 및 역 투영 준비
        const allSegments = [];
        sections.forEach(geom => {
            const extract = (coords) => {
                for (let i = 0; i < coords.length - 1; i++) {
                    allSegments.push({ p1: coords[i], p2: coords[i + 1], stations: [] });
                }
            };
            if (geom.type === 'LineString') extract(geom.coordinates);
            else if (geom.type === 'MultiLineString') geom.coordinates.forEach(extract);
        });

        const projectedStations = stationsOnRoute.map(s => {
            let minDistSq = Infinity;
            let bestProjected = null;
            let bestSegIdx = -1;
            let bestT = 0;

            allSegments.forEach((seg, idx) => {
                const res = getClosestPointOnSegment(s.coords, seg.p1, seg.p2);
                if (res.distSq < minDistSq) {
                    minDistSq = res.distSq;
                    bestProjected = res.point;
                    bestSegIdx = idx;
                    bestT = res.t;
                }
            });
            // 세그먼트에 역 정보 등록 (역 건너뛰기 방지를 위한 핵심 로직)
            if (bestSegIdx !== -1) {
                allSegments[bestSegIdx].stations.push({ id: s.id, projected: bestProjected, t: bestT });
            }
            return { ...s, projected: bestProjected, segIdx: bestSegIdx, t: bestT };
        });

        // 2. 그래프 구축 엔진 (Universal Healing & Partitioning)
        const segmentAdj = new Map();
        function getClusteredKey(coords) {
            // 약 11.1m 단위 클러스터링
            return `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
        }

        function addSegmentEdge(p1, p2, dist, geom) {
            const u = getClusteredKey(p1);
            const v = getClusteredKey(p2);
            if (u === v) return;
            if (!segmentAdj.has(u)) segmentAdj.set(u, []);
            if (!segmentAdj.has(v)) segmentAdj.set(v, []);
            segmentAdj.get(u).push({ to: v, dist, geom });
            segmentAdj.get(v).push({ to: u, dist, geom: [...geom].reverse() });
        }

        // 모든 세그먼트를 소속된 역들에 따라 조각조각 분할
        allSegments.forEach(seg => {
            if (seg.stations.length === 0) {
                addSegmentEdge(seg.p1, seg.p2, haversineDistance(seg.p1, seg.p2), [seg.p1, seg.p2]);
            } else {
                seg.stations.sort((a, b) => a.t - b.t);
                let lastPt = seg.p1;
                seg.stations.forEach(st => {
                    addSegmentEdge(lastPt, st.projected, haversineDistance(lastPt, st.projected), [lastPt, st.projected]);
                    lastPt = st.projected;
                });
                addSegmentEdge(lastPt, seg.p2, haversineDistance(lastPt, seg.p2), [lastPt, seg.p2]);
            }
        });

        // 3. 역 간 실제 경로 탐색 (Dijkstra)
        const edges = [];
        const seenEdges = new Set();
        const stationConnectivity = new Map();

        projectedStations.forEach(startS => {
            if (startS.segIdx === -1) return;
            const startNodeKey = getClusteredKey(startS.projected);
            const q = [{ node: startNodeKey, dist: 0, pathGeom: [startS.coords, startS.projected] }];
            const dists = { [startNodeKey]: 0 };
            const visited = new Set();

            while (q.length > 0) {
                q.sort((a, b) => a.dist - b.dist);
                const { node, dist, pathGeom } = q.shift();
                if (visited.has(node)) continue;
                visited.add(node);

                // 현재 노드가 "다른 역"인지 확인
                const otherS = projectedStations.find(ps => ps.id !== startS.id && getClusteredKey(ps.projected) === node);
                if (otherS && dist > 0) {
                    const pair = [startS.id, otherS.id].sort().join('<->');
                    if (!seenEdges.has(pair)) {
                        edges.push({
                            from: startS.id, to: otherS.id,
                            distance: dist,
                            geometry: [...pathGeom, otherS.coords]
                        });
                        seenEdges.add(pair);
                        if (!stationConnectivity.has(startS.id)) stationConnectivity.set(startS.id, new Set());
                        if (!stationConnectivity.has(otherS.id)) stationConnectivity.set(otherS.id, new Set());
                        stationConnectivity.get(startS.id).add(otherS.id);
                        stationConnectivity.get(otherS.id).add(startS.id);
                    }
                    continue; // 한 방향으로 첫 번째 역만 찾고 더 깊이 안 들어감 (역 건너뛰기 방지)
                }

                (segmentAdj.get(node) || []).forEach(next => {
                    const newDist = dist + next.dist;
                    if (!dists[next.to] || newDist < dists[next.to]) {
                        dists[next.to] = newDist;
                        const newGeom = [...pathGeom, ...next.geom.slice(1)];
                        q.push({ node: next.to, dist: newDist, pathGeom: newGeom });
                    }
                });
            }
        });

        // 4. 고강도 단절 보정 (Greedy Sequence Recovery)
        // Dijkstra로 충분히 연결되지 않은 역들을 위해, 노선 내 가장 가까운 단절 역을 순차적으로 연결
        const sortedStations = [...stationsOnRoute];
        // 팁: stationsOnRoute는 보통 원본 데이터의 순서를 어느 정도 따름. 하지만 더 정확히 하려면 좌표 기반 정렬이나 최소 신장 트리 고려 가능.

        projectedStations.forEach(s => {
            const conns = stationConnectivity.get(s.id) || new Set();
            if (conns.size < 1) { // 여전히 고립된 역
                let minDist = Infinity;
                let bestNeighbor = null;
                projectedStations.forEach(other => {
                    if (s.id === other.id) return;
                    const d = haversineDistance(s.coords, other.coords);
                    if (d < minDist) {
                        // 이미 2개 이상의 연결을 가진 역은 피함 (선형 구조 유지)
                        const otherConns = stationConnectivity.get(other.id) || new Set();
                        if (otherConns.size < 2 || projectedStations.length <= 2) {
                            minDist = d;
                            bestNeighbor = other;
                        }
                    }
                });

                if (bestNeighbor && minDist < 50) { // 최대 50km까지 허용
                    const pair = [s.id, bestNeighbor.id].sort().join('<->');
                    if (!seenEdges.has(pair)) {
                        edges.push({ from: s.id, to: bestNeighbor.id, distance: minDist, geometry: [s.coords, bestNeighbor.coords] });
                        seenEdges.add(pair);
                        if (!stationConnectivity.has(s.id)) stationConnectivity.set(s.id, new Set());
                        if (!stationConnectivity.has(bestNeighbor.id)) stationConnectivity.set(bestNeighbor.id, new Set());
                        stationConnectivity.get(s.id).add(bestNeighbor.id);
                        stationConnectivity.get(bestNeighbor.id).add(s.id);
                    }
                }
            }
        });

        resultNetwork.routes.push({
            id: key, company: route.company, line: route.line,
            edges: sortEdges(edges)
        });

        projectedStations.forEach(s => {
            resultNetwork.stations[s.id] = { name: s.name, coords: s.coords };
        });

        processedCount++;
        if (processedCount % 50 === 0) console.log(`Processed ${processedCount} routes...`);
    }

    console.log('Final Formatting...');
    const optimizedNetwork = JSON.parse(JSON.stringify(resultNetwork, (key, value) => {
        if (key === 'coords' || key === 'geometry') {
            if (Array.isArray(value)) {
                return value.map(v => Array.isArray(v) ? v.map(n => Math.round(n * 100000) / 100000) : Math.round(v * 100000) / 100000);
            }
        }
        return value;
    }));

    const jsonStr = JSON.stringify(optimizedNetwork, (key, value) => {
        if (key === 'geometry') return `__GEOM_START__${JSON.stringify(value)}__GEOM_END__`;
        return value;
    }, 2);

    const formattedJson = jsonStr.replace(/"__GEOM_START__([\s\S]+?)__GEOM_END__"/g, (m, p1) => p1.replace(/\\"/g, '"'));
    fs.writeFileSync(OUTPUT_PATH, formattedJson);
    console.log('Success!');
}

function sortEdges(edges) {
    if (edges.length <= 1) return edges;
    const adj = new Map();
    edges.forEach(e => {
        if (!adj.has(e.from)) adj.set(e.from, []);
        if (!adj.has(e.to)) adj.set(e.to, []);
        adj.get(e.from).push(e);
        adj.get(e.to).push(e);
    });

    let startNode = null;
    for (const [node, nbrs] of adj) { if (nbrs.length === 1) { startNode = node; break; } }
    if (!startNode) startNode = Array.from(adj.keys())[0];

    const sorted = [];
    const visitedEdges = new Set();
    const visitedNodes = new Set();
    let currentNode = startNode;

    while (true) {
        visitedNodes.add(currentNode);
        const neighbors = adj.get(currentNode) || [];
        const nextEdge = neighbors.find(e => !visitedEdges.has([e.from, e.to].sort().join('-').replace(/[^\w-]/g, '')));

        if (!nextEdge) {
            // 다른 컴포넌트나 분기된 가지가 있는지 확인
            let found = false;
            for (const node of visitedNodes) {
                const cand = (adj.get(node) || []).find(e => !visitedEdges.has([e.from, e.to].sort().join('-').replace(/[^\w-]/g, '')));
                if (cand) { currentNode = node; found = true; break; }
            }
            if (!found) break;
            continue;
        }

        const edgeId = [nextEdge.from, nextEdge.to].sort().join('-').replace(/[^\w-]/g, '');
        visitedEdges.add(edgeId);
        const nextNode = (nextEdge.from === currentNode) ? nextEdge.to : nextEdge.from;

        if (nextEdge.from === currentNode) {
            sorted.push(nextEdge);
        } else {
            sorted.push({
                from: nextEdge.to, to: nextEdge.from, distance: nextEdge.distance,
                geometry: [...nextEdge.geometry].reverse()
            });
        }
        currentNode = nextNode;
    }
    return sorted;
}

solve();

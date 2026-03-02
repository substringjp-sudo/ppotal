/**
 * build_graph_v3.js
 * 
 * 일본 철도망 통합 그래프 생성 스크립트 v3
 * 
 * 기능:
 *   1. sections_geom_high.json의 좌표 데이터를 기반으로 section 끝점을 역/Joint에 매핑
 *   2. sections_meta.json의 start/end 정보를 보강/검증
 *   3. 통합 그래프 데이터 생성:
 *      - railroad_network.json: 역-역 연결 + 노선별 section 목록 + 거리
 *      - 노선별 노선 전체 형태 그리기
 *      - 역과 역 사이의 최단경로 탐색
 *      - 특정 역에 연결되는 역 목록
 * 
 * 입력:
 *   - public/rail/sections_meta.json
 *   - public/rail/sections_geom_high.json
 *   - public/rail/platforms_meta.json
 *   - public/rail/platforms_geom.json
 *   - public/rail/stations_master.json
 *   - public/rail/joints.json
 *   - public/rail/lines.json
 * 
 * 출력:
 *   - public/rail/railroad_network.json (통합 그래프)
 */

const fs = require('fs');
const path = require('path');

const RAIL_DIR = path.join(__dirname, '..', 'public', 'rail');

// ============================================================
// 유틸리티 함수
// ============================================================

/** Google Encoded Polyline 디코딩 [lon, lat] 형식 반환 */
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        shift = 0; result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        points.push([lng / 1e5, lat / 1e5]);
    }
    return points;
}

/** Haversine 거리 계산 (미터) */
function haversine(c1, c2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(c2[1] - c1[1]);
    const dLon = toRad(c2[0] - c1[0]);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// 데이터 로드
// ============================================================
console.log('📂 데이터 로드 중...');

const sectionsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'sections_meta.json'), 'utf8'));
const sectionsGeom = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'sections_geom_high.json'), 'utf8'));
const platformsMeta = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms_meta.json'), 'utf8'));
const platformsGeom = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'platforms_geom.json'), 'utf8'));
const stationsMaster = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'stations_master.json'), 'utf8'));
const jointsData = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'joints.json'), 'utf8'));
const lines = JSON.parse(fs.readFileSync(path.join(RAIL_DIR, 'lines.json'), 'utf8'));

console.log(`  Sections: ${Object.keys(sectionsMeta).length}`);
console.log(`  Platforms: ${Object.keys(platformsMeta).length}`);
console.log(`  Stations: ${Object.keys(stationsMaster).length}`);
console.log(`  Joints: ${jointsData.joints.length}`);
console.log(`  Lines: ${Object.keys(lines).length}`);

// ============================================================
// Phase 1: 좌표 인덱스 구축
// ============================================================
console.log('\n🔧 Phase 1: 좌표 인덱스 구축...');

// 역에 연결 가능한 좌표들: 플랫폼 지오메트리의 양 끝점 + 플랫폼 중심 좌표 + 역 중심 좌표
const stationCoords = {}; // stationId -> [coord1, coord2, ...]

Object.entries(stationsMaster).forEach(([sid, station]) => {
    const coords = [];
    coords.push([station.lon, station.lat]);
    (station.platform_ids || []).forEach(pid => {
        const pm = platformsMeta[pid];
        if (pm) coords.push([pm.lon, pm.lat]);
        const pg = platformsGeom[pid];
        if (pg) {
            pg.forEach(enc => {
                const pts = decodePolyline(enc);
                if (pts.length > 0) {
                    coords.push(pts[0]);
                    coords.push(pts[pts.length - 1]);
                }
            });
        }
    });
    stationCoords[sid] = coords;
});

// Joint 좌표 인덱스
const jointCoords = {};
jointsData.joints.forEach(j => {
    jointCoords[j.id] = j.coordinates;
});

console.log(`  역 좌표 인덱스: ${Object.keys(stationCoords).length} 역`);
console.log(`  Joint 좌표 인덱스: ${Object.keys(jointCoords).length} 개`);

// ============================================================
// Phase 2: Section 끝점 검증 및 보강
// ============================================================
console.log('\n🔧 Phase 2: Section 끝점 매핑 보강...');

const STATION_MATCH_THRESHOLD = 800; // 역 매칭 기준 800m (큰 역 고려)
const JOINT_MATCH_THRESHOLD = 50;

const enhancedSections = {};
let correctedStart = 0, correctedEnd = 0;
let unmatchedStart = 0, unmatchedEnd = 0;

function findNearestStation(coord) {
    let bestId = null, bestDist = Infinity;
    Object.entries(stationCoords).forEach(([sid, coords]) => {
        coords.forEach(c => {
            const d = haversine(coord, c);
            if (d < bestDist) { bestDist = d; bestId = sid; }
        });
    });
    return { id: bestId, dist: bestDist };
}

function findNearestJoint(coord) {
    let bestId = null, bestDist = Infinity;
    Object.entries(jointCoords).forEach(([jid, jcoord]) => {
        const d = haversine(coord, jcoord);
        if (d < bestDist) { bestDist = d; bestId = jid; }
    });
    return { id: bestId, dist: bestDist };
}

function resolveEndpoint(metaId, coord) {
    if (String(metaId).startsWith('J_')) {
        const nearJ = findNearestJoint(coord);
        if (nearJ.dist < JOINT_MATCH_THRESHOLD) {
            return { id: nearJ.id, type: 'joint', corrected: nearJ.id !== metaId };
        }
        const nearS = findNearestStation(coord);
        if (nearS.dist < STATION_MATCH_THRESHOLD) {
            return { id: nearS.id, type: 'station', corrected: true };
        }
        return { id: metaId, type: 'unmatched', corrected: false };
    } else {
        if (stationsMaster[metaId]) {
            return { id: metaId, type: 'station', corrected: false };
        }
        const nearS = findNearestStation(coord);
        if (nearS.dist < STATION_MATCH_THRESHOLD) {
            return { id: nearS.id, type: 'station', corrected: true };
        }
        return { id: metaId, type: 'unmatched', corrected: false };
    }
}

Object.entries(sectionsMeta).forEach(([secId, meta]) => {
    const encoded = sectionsGeom[secId];
    if (!encoded) return;
    const pts = decodePolyline(encoded);
    if (pts.length < 2) return;

    const startRes = resolveEndpoint(meta.start, pts[0]);
    const endRes = resolveEndpoint(meta.end, pts[pts.length - 1]);

    if (startRes.corrected) correctedStart++;
    if (endRes.corrected) correctedEnd++;
    if (startRes.type === 'unmatched') unmatchedStart++;
    if (endRes.type === 'unmatched') unmatchedEnd++;

    enhancedSections[secId] = {
        start: startRes.id,
        end: endRes.id,
        _startType: startRes.type,
        _endType: endRes.type,
        _startCoord: pts[0],
        _endCoord: pts[pts.length - 1],
        line_id: meta.line_id,
        company_id: meta.company_id,
        length: meta.length
    };
});

console.log(`  보강된 Section: ${Object.keys(enhancedSections).length}`);
console.log(`  Start 수정: ${correctedStart}, End 수정: ${correctedEnd}`);
console.log(`  매핑 실패 - Start: ${unmatchedStart}, End: ${unmatchedEnd}`);

// ============================================================
// Phase 3: 인접 리스트 구축 (역 + Joint 통합)
// ============================================================
console.log('\n🔧 Phase 3: 인접 리스트 구축...');

const adjacency = {};

function addEdge(from, to, sectionId, lineId, companyId, length) {
    if (!adjacency[from]) adjacency[from] = [];
    adjacency[from].push({ neighbor: to, sectionId, lineId, companyId, length });
    if (!adjacency[to]) adjacency[to] = [];
    adjacency[to].push({ neighbor: from, sectionId, lineId, companyId, length });
}

Object.entries(enhancedSections).forEach(([secId, sec]) => {
    if (sec._startType === 'unmatched' || sec._endType === 'unmatched') return;
    if (sec.start === sec.end) return;
    addEdge(sec.start, sec.end, secId, sec.line_id, sec.company_id, sec.length);
});

const nodeCount = Object.keys(adjacency).length;
const edgeCount = Object.values(adjacency).reduce((s, edges) => s + edges.length, 0) / 2;
console.log(`  노드: ${nodeCount} (역 + Joint)`);
console.log(`  엣지: ${edgeCount} (Section)`);

// ============================================================
// Phase 4: Joint 경유 BFS로 역-역 직접 연결 그래프 생성
// ============================================================
console.log('\n🔧 Phase 4: 역-역 직접 연결 그래프 (BFS)...');

// 각 역에서 BFS → Joint를 통과하며 다음 역까지 탐색
// 같은 노선 ID로만 Joint를 통과 (노선 일관성 유지)
const stationGraph = {};

function isStation(nodeId) {
    return !String(nodeId).startsWith('J_');
}

Object.keys(stationsMaster).forEach(startStation => {
    if (!adjacency[startStation]) return;

    stationGraph[startStation] = {};

    // BFS queue
    const visited = new Set([startStation]);
    const queue = [];

    adjacency[startStation].forEach(edge => {
        queue.push({
            currentNode: edge.neighbor,
            sections: [edge.sectionId],
            throughJoints: [],
            lineId: edge.lineId,
            companyId: edge.companyId,
            totalLength: edge.length || 0
        });
    });

    while (queue.length > 0) {
        const item = queue.shift();
        const { currentNode, sections, throughJoints, lineId, companyId, totalLength } = item;

        if (isStation(currentNode)) {
            // 역에 도달! 연결 기록
            if (!stationGraph[startStation][currentNode]) {
                stationGraph[startStation][currentNode] = { connections: [] };
            }
            stationGraph[startStation][currentNode].connections.push({
                line_id: lineId,
                company_id: companyId,
                section_ids: [...sections],
                via_joints: [...throughJoints],
                distance: totalLength
            });
            continue;
        }

        // Joint에 도달 → 같은 노선의 다음 section을 따라 계속 탐색
        if (visited.has(currentNode)) continue;
        visited.add(currentNode);

        const nextEdges = adjacency[currentNode] || [];
        nextEdges.forEach(nextEdge => {
            // 같은 노선만 따라감
            if (nextEdge.lineId !== lineId) return;
            if (visited.has(nextEdge.neighbor) && nextEdge.neighbor === startStation) return;
            if (sections.includes(nextEdge.sectionId)) return;
            if (sections.length >= 50) return;

            queue.push({
                currentNode: nextEdge.neighbor,
                sections: [...sections, nextEdge.sectionId],
                throughJoints: [...throughJoints, currentNode],
                lineId,
                companyId,
                totalLength: totalLength + (nextEdge.length || 0)
            });
        });
    }

    if (Object.keys(stationGraph[startStation]).length === 0) {
        delete stationGraph[startStation];
    }
});

// 통계
let graphStations = Object.keys(stationGraph).length;
let totalConnections = 0;
Object.values(stationGraph).forEach(neighbors => {
    totalConnections += Object.keys(neighbors).length;
});
console.log(`  그래프 내 역: ${graphStations}`);
console.log(`  총 연결 수: ${totalConnections / 2} (양방향 제거)`);

// ============================================================
// Phase 4.5: 환승 연결 + Joint 크로스 노선 연결
// ============================================================
console.log('\n🔧 Phase 4.5: 환승 및 크로스 노선 연결...');

// 4.5-1: 같은 역에 속한 다른 플랫폼 간 환승 연결
// stations_master의 platform_ids에 여러 노선이 있으면, 같은 역 내 환승 가능
let transferEdges = 0;
Object.entries(stationsMaster).forEach(([sid, station]) => {
    const platLines = [];
    (station.platform_ids || []).forEach(pid => {
        const pm = platformsMeta[pid];
        if (pm) platLines.push({ pid, lineId: pm.line, companyId: pm.company });
    });
    // 같은 역에서 여러 노선이 있으면, 각 노선 플랫폼을 가진 이웃 역들 간 환승 처리
    // (이미 같은 역 내 그래프 엔트리가 있으므로, 여기서는 "이 역을 통하는 환승" 정보를 기록)
    // 이건 station_graph에서 이미 같은 역 ID를 공유하므로 자연스럽게 처리됨
});

// 4.5-2: Joint를 통한 크로스 노선 연결 (다른 노선이지만 같은 Joint에서 만나는 경우)
// 예: 府中競馬正門前 역 → J_49 → 다른 노선의 역
// 이 경우 BFS에서 노선이 달라서 건너뛰었지만, Joint에서 다른 노선으로 갈아타는 것이 가능

// Joint에 연결된 모든 역을 찾고, 직접 역-역 연결이 없는 경우 크로스 연결 추가
Object.entries(jointCoords).forEach(([jointId, jcoord]) => {
    if (!adjacency[jointId]) return;

    // 이 Joint에서 닿을 수 있는 역들 (BFS, 노선 제한 없이, 1스텝만)
    const reachableStations = [];
    adjacency[jointId].forEach(edge => {
        if (isStation(edge.neighbor)) {
            reachableStations.push({
                stationId: edge.neighbor,
                sectionId: edge.sectionId,
                lineId: edge.lineId,
                companyId: edge.companyId,
                length: edge.length
            });
        }
    });

    // 역 쌍 중에서 기존 그래프에 연결이 없는 경우 크로스 연결 추가
    for (let i = 0; i < reachableStations.length; i++) {
        for (let j = i + 1; j < reachableStations.length; j++) {
            const a = reachableStations[i];
            const b = reachableStations[j];
            if (a.stationId === b.stationId) continue;

            // 기존에 이미 연결되어 있는지 확인
            if (stationGraph[a.stationId]?.[b.stationId]) continue;

            // 크로스 노선 연결 추가 (양방향)
            if (!stationGraph[a.stationId]) stationGraph[a.stationId] = {};
            if (!stationGraph[a.stationId][b.stationId]) {
                stationGraph[a.stationId][b.stationId] = { connections: [] };
            }
            stationGraph[a.stationId][b.stationId].connections.push({
                line_id: a.lineId,
                company_id: a.companyId,
                section_ids: [a.sectionId, b.sectionId],
                via_joints: [jointId],
                distance: (a.length || 0) + (b.length || 0),
                _cross_line: true // 크로스 노선 연결 표시
            });

            if (!stationGraph[b.stationId]) stationGraph[b.stationId] = {};
            if (!stationGraph[b.stationId][a.stationId]) {
                stationGraph[b.stationId][a.stationId] = { connections: [] };
            }
            stationGraph[b.stationId][a.stationId].connections.push({
                line_id: b.lineId,
                company_id: b.companyId,
                section_ids: [b.sectionId, a.sectionId],
                via_joints: [jointId],
                distance: (a.length || 0) + (b.length || 0),
                _cross_line: true
            });

            transferEdges++;
        }
    }
});

console.log(`  크로스 노선 연결 추가: ${transferEdges}`);

// 재계산
graphStations = Object.keys(stationGraph).length;
totalConnections = 0;
Object.values(stationGraph).forEach(neighbors => {
    totalConnections += Object.keys(neighbors).length;
});
console.log(`  그래프 내 역: ${graphStations}`);
console.log(`  총 연결 수: ${totalConnections / 2} (양방향 제거)`);

// ============================================================
// Phase 5: 연결성 검증 (Connected Components)
// ============================================================
console.log('\n🔧 Phase 5: 연결성 검증...');

const allGraphStations = new Set(Object.keys(stationGraph));
Object.values(stationGraph).forEach(neighbors => {
    Object.keys(neighbors).forEach(nid => allGraphStations.add(nid));
});

const visitedBfs = new Set();
const components = [];

function bfsComponent(startId) {
    const queue = [startId];
    const component = [];
    visitedBfs.add(startId);
    while (queue.length > 0) {
        const cur = queue.shift();
        component.push(cur);
        const neighbors = stationGraph[cur];
        if (!neighbors) return component;
        Object.keys(neighbors).forEach(nid => {
            if (!visitedBfs.has(nid)) {
                visitedBfs.add(nid);
                queue.push(nid);
            }
        });
    }
    return component;
}

for (const sid of allGraphStations) {
    if (!visitedBfs.has(sid)) {
        components.push(bfsComponent(sid));
    }
}

components.sort((a, b) => b.length - a.length);
console.log(`  Connected Components: ${components.length}`);
console.log(`  최대 컴포넌트: ${components[0]?.length || 0} 역`);
if (components.length > 1) {
    components.slice(1, Math.min(11, components.length)).forEach((comp, i) => {
        const names = comp.slice(0, 3).map(id => stationsMaster[id]?.name || id);
        console.log(`  Component ${i + 2}: ${comp.length}역 - ${names.join(', ')}...`);
    });
}

// ============================================================
// Phase 6: 노선별 데이터 생성
// ============================================================
console.log('\n🔧 Phase 6: 노선별 데이터 생성...');

const lineData = {};

Object.entries(enhancedSections).forEach(([secId, sec]) => {
    if (sec._startType === 'unmatched' || sec._endType === 'unmatched') return;

    const lid = sec.line_id;
    if (!lineData[lid]) {
        lineData[lid] = {
            line_id: lid,
            company_id: sec.company_id,
            name: lines[lid]?.name || `Line ${lid}`,
            name_en: lines[lid]?.name_en || '',
            color: lines[lid]?.color || '#888888',
            sections: [],
            stations: new Set()
        };
    }

    lineData[lid].sections.push(secId);
    if (isStation(sec.start)) lineData[lid].stations.add(sec.start);
    if (isStation(sec.end)) lineData[lid].stations.add(sec.end);
});

// Set → Array 변환
Object.values(lineData).forEach(ld => {
    ld.stations = [...ld.stations];
});

console.log(`  노선 수: ${Object.keys(lineData).length}`);

// ============================================================
// Phase 7: 출력 파일 생성
// ============================================================
console.log('\n📝 Phase 7: 통합 그래프 파일 생성...');

const output = {
    _metadata: {
        version: '3.0',
        generated: new Date().toISOString(),
        stats: {
            stations: graphStations,
            connections: totalConnections / 2,
            lines: Object.keys(lineData).length,
            sections: Object.keys(enhancedSections).length,
            components: components.length,
            cross_line_connections: transferEdges
        }
    },
    station_graph: stationGraph,
    line_data: lineData,
    sections: Object.fromEntries(
        Object.entries(enhancedSections).map(([secId, sec]) => [
            secId,
            {
                start: sec.start,
                end: sec.end,
                start_type: sec._startType,
                end_type: sec._endType,
                line_id: sec.line_id,
                company_id: sec.company_id,
                length: sec.length
            }
        ])
    )
};

const outputPath = path.join(RAIL_DIR, 'railroad_network.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
console.log(`  ✅ 저장: ${outputPath} (${fileSizeMB} MB)`);

// ============================================================
// 요약 보고
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('📊 통합 그래프 생성 완료 요약');
console.log('='.repeat(60));
console.log(`  역:               ${graphStations}`);
console.log(`  역-역 연결:       ${totalConnections / 2}`);
console.log(`  노선:             ${Object.keys(lineData).length}`);
console.log(`  Section:          ${Object.keys(enhancedSections).length}`);
console.log(`  연결 컴포넌트:    ${components.length}`);
console.log(`  크로스 노선 연결: ${transferEdges}`);
console.log(`  Start 보정:       ${correctedStart}`);
console.log(`  End 보정:         ${correctedEnd}`);
console.log(`  매핑 실패:        Start ${unmatchedStart}, End ${unmatchedEnd}`);
console.log('='.repeat(60));

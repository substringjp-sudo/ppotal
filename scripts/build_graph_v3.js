/**
 * build_graph_v3.js
 * 
 * 일본 철도망 통합 그래프 생성 스크립트 v3.1
 * 
 * v3.1 변경사항:
 *   - Phase 0 추가: 조인트 through_pairs 계산 (각도 기반)
 *     → 각 조인트에서 어떤 section 쌍이 "직통"인지 기록
 *   - Phase 4 수정: BFS에서 두 가지 필터 적용
 *     ① 중간에 역(station)이 있으면 그 역에서 항상 끊기 (중간역 강제 경유)
 *     ② 조인트 통과 시 through_pairs로 진입-이탈 방향 검사
 *     → 시모사만스키에서 나리타를 거치지 않고 구즈미로 가는 경로 차단
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

/** 각도 정규화 (-180 ~ 180) */
function normalizeAngle(a) {
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return a;
}

/**
 * 조인트에서 특정 섹션이 이탈하는 방향 각도를 계산
 * (조인트 접점 기준으로 섹션이 뻗어나가는 방향)
 */
function getLeavingAngle(sectionId, jointId, sectionsGeom, enhancedSections) {
    const sec = enhancedSections[sectionId];
    if (!sec) return null;
    const encoded = sectionsGeom[sectionId];
    if (!encoded) return null;
    const coords = decodePolyline(encoded);
    if (coords.length < 2) return null;

    let pJoint, pNext;
    if (sec.start === jointId) {
        pJoint = coords[0];
        // 더 먼 포인트로 방향 결정 (작은 노이즈 제거)
        pNext = coords[Math.min(2, coords.length - 1)];
    } else if (sec.end === jointId) {
        pJoint = coords[coords.length - 1];
        pNext = coords[Math.max(coords.length - 3, 0)];
    } else {
        return null;
    }

    const dx = pNext[0] - pJoint[0];
    const dy = pNext[1] - pJoint[1];
    if (dx === 0 && dy === 0) return null;
    return Math.atan2(dy, dx) * 180 / Math.PI;
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

const stationCoords = {};

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

const STATION_MATCH_THRESHOLD = 800;
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
// Phase 3.5: 조인트 Through-Pairs 계산 (각도 기반)
// ============================================================
console.log('\n🔧 Phase 3.5: 조인트 Through-Pairs 계산 (각도 기반)...');

/**
 * 특정 조인트에서 어떤 섹션 쌍이 "직통(through)"인지 계산
 *
 * 원리:
 *   - 열차가 직통으로 지나가면 선로가 거의 일직선 → 진입각과 이탈각 차이 ≈ 0°
 *   - 분기선은 크게 꺾임 → 진입각과 이탈각 차이 >> 0°
 *
 * through 판정 기준:
 *   섹션 A(→ 조인트 방향)와 섹션 B(조인트 → 방향)의 각도 차이가
 *   THROUGH_ANGLE_THRESHOLD(60°) 미만이면 직통 쌍으로 기록
 */
const THROUGH_ANGLE_THRESHOLD = 60; // 직통 판정 각도 임계값 (도)

// jointId → Set<"secA:secB"> (직통 섹션 쌍, 정렬된 순서)
const jointThroughPairs = {};

// jointId → Map<sectionId, angle> (각 조인트에서 각 섹션의 이탈 각도)
const jointSectionAngles = {};

// 모든 조인트에 연결된 섹션 목록 구축
const jointSections = {}; // jointId → [sectionId, ...]
Object.entries(enhancedSections).forEach(([secId, sec]) => {
    if (sec._startType === 'unmatched' || sec._endType === 'unmatched') return;
    [sec.start, sec.end].forEach(nodeId => {
        if (String(nodeId).startsWith('J_')) {
            if (!jointSections[nodeId]) jointSections[nodeId] = [];
            if (!jointSections[nodeId].includes(secId)) {
                jointSections[nodeId].push(secId);
            }
        }
    });
});

let throughPairsCount = 0;
let jointsWithThroughPairs = 0;

Object.entries(jointSections).forEach(([jointId, secIds]) => {
    // degree < 3 이면 분기가 없므로 through_pairs 불필요
    if (secIds.length < 3) return;

    // 각 섹션의 이탈 각도 계산
    const angles = {};
    secIds.forEach(sid => {
        const a = getLeavingAngle(sid, jointId, sectionsGeom, enhancedSections);
        if (a !== null) angles[sid] = a;
    });

    if (Object.keys(angles).length < 2) return;

    const throughPairs = [];

    // 모든 섹션 쌍 비교
    const sidsWithAngles = Object.keys(angles);
    for (let i = 0; i < sidsWithAngles.length; i++) {
        for (let j = i + 1; j < sidsWithAngles.length; j++) {
            const sidA = sidsWithAngles[i];
            const sidB = sidsWithAngles[j];

            // 섹션 A를 통해 조인트에 진입하는 방향 (= A 이탈각 + 180°)
            const arrivalFromA = normalizeAngle(angles[sidA] + 180);
            // 섹션 B로 이탈하는 방향
            const leavingToB = angles[sidB];

            const diff = Math.abs(normalizeAngle(arrivalFromA - leavingToB));

            if (diff < THROUGH_ANGLE_THRESHOLD) {
                // 직통 쌍 기록 (양방향 모두 기록: A→B, B→A)
                throughPairs.push([sidA, sidB]);
            }
        }
    }

    if (throughPairs.length > 0) {
        jointThroughPairs[jointId] = throughPairs;
        jointSectionAngles[jointId] = angles;
        throughPairsCount += throughPairs.length;
        jointsWithThroughPairs++;
    }
});

console.log(`  Through-pairs가 있는 조인트: ${jointsWithThroughPairs}`);
console.log(`  총 Through-pair 수: ${throughPairsCount}`);

// 빠른 조회를 위한 Set 구축: "jointId:secA:secB" (사전순 정렬)
const throughPairSet = new Set(); // "jointId:minSec:maxSec"
Object.entries(jointThroughPairs).forEach(([jointId, pairs]) => {
    pairs.forEach(([a, b]) => {
        const key = `${jointId}:${[a, b].sort().join(':')}`;
        throughPairSet.add(key);
    });
});

/**
 * 조인트에서 prevSectionId로 진입했을 때 nextSectionId로 이탈하는 것이
 * "직통(through)"인지 확인
 */
function isThroughPass(jointId, prevSectionId, nextSectionId) {
    // degree < 3 조인트는 항상 통과 가능
    if (!jointSections[jointId] || jointSections[jointId].length < 3) return true;
    // through_pairs가 없는 조인트는 통과 허용 (데이터 부족 케이스)
    if (!jointThroughPairs[jointId]) return true;

    const key = `${jointId}:${[prevSectionId, nextSectionId].sort().join(':')}`;
    return throughPairSet.has(key);
}

// ============================================================
// Phase 4: Joint 경유 BFS로 역-역 직접 연결 그래프 생성
// ============================================================
console.log('\n🔧 Phase 4: 역-역 직접 연결 그래프 (BFS + 방향 필터링)...');

const stationGraph = {};

function isStation(nodeId) {
    return !String(nodeId).startsWith('J_');
}

Object.keys(stationsMaster).forEach(startStation => {
    if (!adjacency[startStation]) return;

    stationGraph[startStation] = {};

    const visited = new Set([startStation]);
    const queue = [];

    adjacency[startStation].forEach(edge => {
        queue.push({
            currentNode: edge.neighbor,
            sections: [edge.sectionId],
            throughJoints: [],
            lineId: edge.lineId,
            companyId: edge.companyId,
            totalLength: edge.length || 0,
            prevSectionId: edge.sectionId  // 이전 섹션 ID (through 판정에 사용)
        });
    });

    while (queue.length > 0) {
        const item = queue.shift();
        const { currentNode, sections, throughJoints, lineId, companyId, totalLength, prevSectionId } = item;

        if (isStation(currentNode)) {
            // ==========================================================
            // ① 역에 도달! 연결 기록
            // ==========================================================
            // 중간에 역을 만나면 무조건 여기서 끊김 (중간역 경유 강제)
            // 이 역이 startStation이 아닌 경우에만 기록
            if (currentNode !== startStation) {
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
            }
            // 역에서 탐색 중단 (중간역을 거쳐 더 멀리 가지 않음)
            continue;
        }

        // ==========================================================
        // ② Joint에 도달
        // ==========================================================
        if (visited.has(currentNode)) continue;
        visited.add(currentNode);

        const jointId = currentNode;
        const nextEdges = adjacency[jointId] || [];

        nextEdges.forEach(nextEdge => {
            // 같은 노선만 따라감
            if (nextEdge.lineId !== lineId) return;
            if (sections.includes(nextEdge.sectionId)) return;
            if (sections.length >= 50) return;

            // ==========================================================
            // ③ Through-pairs 필터: 이 조인트에서 prevSection → nextSection이
            //    직통(through)인지 확인. 분기(branch)면 진행하지 않음.
            // ==========================================================
            if (!isThroughPass(jointId, prevSectionId, nextEdge.sectionId)) {
                return; // 이 방향으로는 진행 불가 (꺾이는 분기선)
            }

            queue.push({
                currentNode: nextEdge.neighbor,
                sections: [...sections, nextEdge.sectionId],
                throughJoints: [...throughJoints, jointId],
                lineId,
                companyId,
                totalLength: totalLength + (nextEdge.length || 0),
                prevSectionId: nextEdge.sectionId
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

let transferEdges = 0;

// Joint를 통한 크로스 노선 연결
// (다른 노선이지만 같은 Joint에서 바로 역과 연결되는 경우)
Object.entries(jointCoords).forEach(([jointId, jcoord]) => {
    if (!adjacency[jointId]) return;

    // 이 Joint에서 1스텝으로 닿을 수 있는 역들
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

    // 역 쌍에서 기존 그래프에 없는 경우 크로스 연결 추가
    for (let i = 0; i < reachableStations.length; i++) {
        for (let j = i + 1; j < reachableStations.length; j++) {
            const a = reachableStations[i];
            const b = reachableStations[j];
            if (a.stationId === b.stationId) continue;
            if (stationGraph[a.stationId]?.[b.stationId]) continue;

            // Through-pairs 필터 적용: 크로스 노선 연결도 방향성 검사
            // (단, 크로스 노선이면 다른 노선 간 연결이므로 through 필터 완화)
            if (a.lineId === b.lineId) {
                // 같은 노선인데 직접 연결이 없는 경우 - through filter 적용
                if (!isThroughPass(jointId, a.sectionId, b.sectionId)) continue;
            }

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
                _cross_line: true
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

graphStations = Object.keys(stationGraph).length;
totalConnections = 0;
Object.values(stationGraph).forEach(neighbors => {
    totalConnections += Object.keys(neighbors).length;
});
console.log(`  그래프 내 역: ${graphStations}`);
console.log(`  총 연결 수: ${totalConnections / 2} (양방향 제거)`);

// ============================================================
// Phase 4.8: 검증 - 시모사만스키(下総松崎) 사례 확인
// ============================================================
console.log('\n🔍 Phase 4.8: 나리타선 분기 검증...');

const shimoSaId = '003071'; // 下総松崎
const naritaId = '003161';  // 成田
const kuzumiId = '003034';  // 久住
const airportT2Id = '003173'; // 空港第2ビル

const shimoNeighbors = stationGraph[shimoSaId] ? Object.keys(stationGraph[shimoSaId]) : [];
console.log(`  下総松崎(${shimoSaId}) 이웃 역 수: ${shimoNeighbors.length}`);
console.log(`  -> 나리타(${naritaId}) 연결: ${shimoNeighbors.includes(naritaId) ? '✅ 있음' : '❌ 없음 (오류!)'}`);
console.log(`  -> 久住(${kuzumiId}) 연결: ${shimoNeighbors.includes(kuzumiId) ? '❌ 있음 (오류!)' : '✅ 없음 (올바름)'}`);
console.log(`  -> 空港第2ビル(${airportT2Id}) 연결: ${shimoNeighbors.includes(airportT2Id) ? '❌ 있음 (오류!)' : '✅ 없음 (올바름)'}`);

const naritaNeighbors = stationGraph[naritaId] ? Object.keys(stationGraph[naritaId]) : [];
console.log(`\n  成田(${naritaId}) 이웃 역 수: ${naritaNeighbors.length}`);
console.log(`  -> 下総松崎(${shimoSaId}) 연결: ${naritaNeighbors.includes(shimoSaId) ? '✅ 있음' : '❌ 없음 (오류!)'}`);
console.log(`  -> 久住(${kuzumiId}) 연결: ${naritaNeighbors.includes(kuzumiId) ? '✅ 있음' : '❌ 없음 (오류!)'}`);
console.log(`  -> 空港第2ビル(${airportT2Id}) 연결: ${naritaNeighbors.includes(airportT2Id) ? '✅ 있음' : '❌ 없음 (오류!)'}`);

const kuzumiNeighbors = stationGraph[kuzumiId] ? Object.keys(stationGraph[kuzumiId]) : [];
console.log(`\n  久住(${kuzumiId}) 이웃 역 수: ${kuzumiNeighbors.length}`);
console.log(`  -> 成田(${naritaId}) 연결: ${kuzumiNeighbors.includes(naritaId) ? '✅ 있음' : '❌ 없음 (오류!)'}`);
console.log(`  -> 空港第2ビル(${airportT2Id}) 연결: ${kuzumiNeighbors.includes(airportT2Id) ? '❌ 있음 (오류!)' : '✅ 없음 (올바름)'}`);

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

Object.values(lineData).forEach(ld => {
    ld.stations = [...ld.stations];
});

console.log(`  노선 수: ${Object.keys(lineData).length}`);

// ============================================================
// Phase 6.5: through_pairs를 joints에 포함하여 저장
// (노선도 렌더링 시 분기 방향 표현에 활용)
// ============================================================
console.log('\n🔧 Phase 6.5: Joints에 through_pairs 메타데이터 추가...');

const jointsWithPairs = jointsData.joints.map(j => {
    const pairs = jointThroughPairs[j.id];
    if (pairs) {
        return { ...j, through_pairs: pairs };
    }
    return j;
});

const jointsOutput = { joints: jointsWithPairs };
const jointsOutputPath = path.join(RAIL_DIR, 'joints.json');
fs.writeFileSync(jointsOutputPath, JSON.stringify(jointsOutput, null, 1), 'utf8');
console.log(`  ✅ joints.json 업데이트 완료 (through_pairs ${jointsWithThroughPairs}개 조인트에 추가)`);

// ============================================================
// Phase 7: 출력 파일 생성
// ============================================================
console.log('\n📝 Phase 7: 통합 그래프 파일 생성...');

const output = {
    _metadata: {
        version: '3.1',
        generated: new Date().toISOString(),
        stats: {
            stations: graphStations,
            connections: totalConnections / 2,
            lines: Object.keys(lineData).length,
            sections: Object.keys(enhancedSections).length,
            components: components.length,
            cross_line_connections: transferEdges,
            joints_with_through_pairs: jointsWithThroughPairs,
            total_through_pairs: throughPairsCount
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
console.log('📊 통합 그래프 생성 완료 요약 (v3.1)');
console.log('='.repeat(60));
console.log(`  역:                     ${graphStations}`);
console.log(`  역-역 연결:             ${totalConnections / 2}`);
console.log(`  노선:                   ${Object.keys(lineData).length}`);
console.log(`  Section:                ${Object.keys(enhancedSections).length}`);
console.log(`  연결 컴포넌트:          ${components.length}`);
console.log(`  크로스 노선 연결:       ${transferEdges}`);
console.log(`  Through-pairs 조인트:   ${jointsWithThroughPairs}`);
console.log(`  총 Through-pair 수:     ${throughPairsCount}`);
console.log(`  Start 보정:             ${correctedStart}`);
console.log(`  End 보정:               ${correctedEnd}`);
console.log(`  매핑 실패:              Start ${unmatchedStart}, End ${unmatchedEnd}`);
console.log('='.repeat(60));

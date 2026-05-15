import { useMemo } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { RailData } from '../types/railData';

export interface TopologyNode {
    id: string;
    name: string;
    name_en?: string;
    name_kr?: string;
    x: number;
    y: number;
    isJoint: boolean;
    isVisited: boolean;
}

export interface TopologyEdge {
    from: string;
    to: string;
    isVisited: boolean;
}

export interface TopologyLoop {
    cx: number;
    cy: number;
    a: number;  // 수평 반축
    b: number;  // 수직 반축 (a * 0.5)
    stationIds: Set<string>;
}

export function useLineTopology(
    lineId: string,
    segments: LineSegment[],
    nodes: Map<string, StationNode>,
    visitedStations: Set<string>,
    visitedEdges: Set<string>,
    railData: RailData | null
) {
    return useMemo(() => {
        if (!segments || segments.length === 0) return { nodes: [], edges: [] };

        // === Phase 1: 원시 그래프 구축 ===
        const rawAdj = new Map<string, Set<string>>();
        const edgeGeomMap = new Map<string, [number, number][]>();
        const edgeSecMap = new Map<string, string>(); // edgeKey → sectionId

        segments.forEach(seg => {
            seg.edges.forEach(edge => {
                if (!rawAdj.has(edge.from)) rawAdj.set(edge.from, new Set());
                if (!rawAdj.has(edge.to)) rawAdj.set(edge.to, new Set());
                rawAdj.get(edge.from)!.add(edge.to);
                rawAdj.get(edge.to)!.add(edge.from);

                const key = [edge.from, edge.to].sort().join('<->');
                edgeGeomMap.set(key, seg.geometry);
                if (edge.sectionId) edgeSecMap.set(key, edge.sectionId);
            });
        });

        const isJoint = (id: string) => id.startsWith('J_');

        // === Phase 2: joint through_pairs 인덱스 구축 ===
        // jointPassMap: jointId → Set of "sectionIdA:sectionIdB" (sorted) that can pass through
        const jointPassMap = new Map<string, Set<string>>();
        // jointCoords: jointId → [lon, lat]
        const jointCoords = new Map<string, [number, number]>();

        if (railData?.joints?.joints) {
            (railData.joints.joints as any[]).forEach(j => {
                if (j.coordinates) jointCoords.set(j.id, j.coordinates);
                if (j.through_pairs) {
                    const pairs = new Set<string>();
                    (j.through_pairs as [string, string][]).forEach(([a, b]) => {
                        pairs.add([a, b].sort().join(':'));
                    });
                    jointPassMap.set(j.id, pairs);
                }
            });
        }

        // joint를 통과할 수 있는지 판별:
        // comingFrom → joint → goingTo 에서
        // comingFrom-joint 엣지의 sectionId와 joint-goingTo 엣지의 sectionId를 통해 through_pairs 조회
        function canPassThrough(comingFrom: string, joint: string, goingTo: string): boolean {
            const pairs = jointPassMap.get(joint);
            if (!pairs) {
                // through_pairs 데이터 없으면: 연결수 2개면 무조건 통과, 3+ 이면 통과 허용
                // (지선 분기 판별 불가 시 안전하게 연결 허용)
                return true;
            }

            const keyIn = [comingFrom, joint].sort().join('<->');
            const keyOut = [joint, goingTo].sort().join('<->');
            const secIn = edgeSecMap.get(keyIn);
            const secOut = edgeSecMap.get(keyOut);

            if (!secIn || !secOut) {
                // sectionId 없으면 통과 허용 (안전 fallback)
                return true;
            }

            return pairs.has([secIn, secOut].sort().join(':'));
        }

        // === Phase 3: Joint 제거 - 역-역 직접 연결 그래프 생성 ===
        const realStationIds = Array.from(rawAdj.keys()).filter(id => !isJoint(id));

        const collapsedAdj = new Map<string, Set<string>>();
        const collapsedEdgeVisited = new Map<string, boolean>();
        const collapsedEdgeGeomKeys = new Map<string, { startKey: string; endKey: string }>();

        realStationIds.forEach(id => collapsedAdj.set(id, new Set()));

        for (const startStation of realStationIds) {
            type Frame = {
                node: string;
                from: string | null;
                pathKeys: string[];
                visitedJoints: Set<string>;
                firstKey: string | null;
                lastKey: string | null;
            };

            const stack: Frame[] = [{
                node: startStation, from: null, pathKeys: [],
                visitedJoints: new Set(), firstKey: null, lastKey: null
            }];

            while (stack.length > 0) {
                const { node, from, pathKeys, visitedJoints, firstKey, lastKey } = stack.pop()!;

                for (const neighbor of rawAdj.get(node) || []) {
                    if (neighbor === from) continue;
                    if (isJoint(neighbor) && visitedJoints.has(neighbor)) continue;

                    // joint에서의 각도/통과 가능성 체크
                    if (isJoint(node) && from !== null) {
                        if (!canPassThrough(from, node, neighbor)) continue;
                    }

                    const edgeKey = [node, neighbor].sort().join('<->');
                    const newPathKeys = [...pathKeys, edgeKey];
                    const newFirstKey = firstKey ?? edgeKey;
                    const newLastKey = edgeKey;

                    if (isJoint(neighbor)) {
                        const newVisited = new Set(visitedJoints);
                        newVisited.add(neighbor);
                        stack.push({
                            node: neighbor, from: node, pathKeys: newPathKeys,
                            visitedJoints: newVisited, firstKey: newFirstKey, lastKey: newLastKey
                        });
                    } else {
                        // 도착역 발견 → collapsed edge 추가
                        const collapsedKey = [startStation, neighbor].sort().join('<->');
                        if (!collapsedAdj.get(startStation)!.has(neighbor)) {
                            collapsedAdj.get(startStation)!.add(neighbor);
                            if (!collapsedAdj.has(neighbor)) collapsedAdj.set(neighbor, new Set());
                            collapsedAdj.get(neighbor)!.add(startStation);

                            const allVisited = newPathKeys.every(k => visitedEdges.has(k));
                            collapsedEdgeVisited.set(collapsedKey, allVisited);
                            collapsedEdgeGeomKeys.set(collapsedKey, {
                                startKey: newFirstKey,
                                endKey: newLastKey ?? newFirstKey
                            });
                        }
                    }
                }
            }
        }

        // === Phase 4: 레이아웃 (collapsed 그래프 기반 - 실제 역만) ===
        const [_, lineName] = lineId.split('::');
        const lineSequence = railData?.railroadNetwork?.line_data?.[lineName]?.stations || [];

        const getLabelWidth = (nodeId: string) => {
            const node = nodes.get(nodeId);
            if (!node) return 0;
            return Math.max((node.name || "").length * 9, (node.name_en || "").length * 4.5);
        };

        const calculateSpacingX = (idA: string, idB: string) => {
            const gap = (getLabelWidth(idA) + getLabelWidth(idB)) / 2 + 35;
            return Math.max(80, gap);
        };

        // 분기 방향 계산: 실제 역 좌표(coords) 또는 joint 좌표(jointCoords)를 이용
        const getBranchDirection = (u: string, v: string, prevU: string | null): number => {
            if (!prevU) return 1;

            // prevU → u 방향각 (실제 좌표 기반)
            let inAngle = 0;
            {
                const coordPrevU = nodes.get(prevU)?.coords;
                const coordU = nodes.get(u)?.coords;
                if (coordPrevU && coordU) {
                    inAngle = Math.atan2(coordU[1] - coordPrevU[1], coordU[0] - coordPrevU[0]);
                } else {
                    // 기하학 fallback
                    const geomKey = collapsedEdgeGeomKeys.get([prevU, u].sort().join('<->'));
                    if (geomKey) {
                        const geom = edgeGeomMap.get(geomKey.endKey);
                        if (geom && geom.length >= 2) {
                            const last = geom.length - 1;
                            inAngle = Math.atan2(geom[last][1] - geom[last - 1][1], geom[last][0] - geom[last - 1][0]);
                        }
                    }
                }
            }

            // u → v 방향각
            let outAngle = 0;
            {
                const coordU = nodes.get(u)?.coords;
                const coordV = nodes.get(v)?.coords;
                if (coordU && coordV) {
                    outAngle = Math.atan2(coordV[1] - coordU[1], coordV[0] - coordU[0]);
                } else {
                    const geomKey = collapsedEdgeGeomKeys.get([u, v].sort().join('<->'));
                    if (geomKey) {
                        const geom = edgeGeomMap.get(geomKey.startKey);
                        if (geom && geom.length >= 2) {
                            outAngle = Math.atan2(geom[1][1] - geom[0][1], geom[1][0] - geom[0][0]);
                        }
                    }
                }
            }

            let diff = outAngle - inAngle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            if (diff > 0.1) return -1;
            if (diff < -0.1) return 1;
            return 0;
        };

        const getLongestSimplePath = (starts: string[], available: Set<string>): { path: string[], score: number } => {
            let best: string[] = [];
            let bestScore = -1;
            let ops = 0;
            const MAX_OPS = 20000;

            for (const start of starts) {
                if (!available.has(start)) continue;
                const stack: { node: string, path: string[], visited: Set<string>, score: number }[] = [
                    { node: start, path: [start], visited: new Set([start]), score: 10 }
                ];
                while (stack.length > 0) {
                    ops++;
                    if (ops > MAX_OPS) return { path: best, score: bestScore };
                    const curr = stack.pop()!;
                    if (curr.score > bestScore || (curr.score === bestScore && curr.path.length > best.length)) {
                        bestScore = curr.score; best = curr.path;
                    }
                    for (const n of collapsedAdj.get(curr.node) || []) {
                        if (available.has(n) && !curr.visited.has(n)) {
                            const nv = new Set(curr.visited); nv.add(n);
                            stack.push({ node: n, path: [...curr.path, n], visited: nv, score: curr.score + 10 });
                        }
                    }
                }
            }
            return { path: best, score: bestScore };
        };

        const topoNodes = new Map<string, TopologyNode>();
        const unvisited = new Set(Array.from(collapsedAdj.keys()));
        const laneUsage = new Map<number, number>();
        const loopMetadata: TopologyLoop[] = [];
        const OCCUPATION_BUFFER = 120;
        const spacingY = 40;
        const baseY = 75;

        const findAvailableLane = (startX: number, preferredOffset: number): number => {
            let offset = preferredOffset;
            for (let step = 0; step < 20; step++) {
                if ((laneUsage.get(offset) || 0) < startX) return offset;
                offset = preferredOffset + (step + 1) * (preferredOffset >= 0 ? 1 : -1);
            }
            return offset;
        };

        while (unvisited.size > 0) {
            const candidates: { u: string, v: string }[] = [];
            for (const u of topoNodes.keys()) {
                for (const v of collapsedAdj.get(u) || []) {
                    if (unvisited.has(v)) candidates.push({ u, v });
                }
            }

            let basePath: string[] = [];
            let juncU: string | null = null;
            let juncV: string | null = null;

            if (candidates.length > 0) {
                let bestScore = -1;
                let bestCand = candidates[0];
                for (const cand of candidates) {
                    const res = getLongestSimplePath([cand.v], unvisited);
                    if (res.score > bestScore || (res.score === bestScore && res.path.length > basePath.length)) {
                        bestScore = res.score; basePath = res.path; bestCand = cand;
                    }
                }
                juncU = bestCand.u; juncV = bestCand.v;
            } else {
                const availableArray = Array.from(unvisited);
                let degree1 = availableArray.filter(n =>
                    Array.from(collapsedAdj.get(n) || []).filter(nx => unvisited.has(nx)).length === 1
                );
                if (degree1.length === 0) {
                    const officialStart = availableArray.find(n => n === lineSequence[0]);
                    if (officialStart) degree1 = [officialStart];
                    else if (lineSequence.length > 0) {
                        const any = availableArray.find(n => lineSequence.indexOf(n) !== -1);
                        if (any) degree1 = [any];
                    }
                }
                const starts = degree1.length > 0 ? degree1 : [availableArray[0]];
                basePath = getLongestSimplePath(starts, unvisited).path;
            }

            // 순환선 루프 감지
            if (basePath.length > 2) {
                const last = basePath[basePath.length - 1];
                const cycleNeighbors = Array.from(collapsedAdj.get(last) || [])
                    .filter(n => basePath.includes(n) && n !== basePath[basePath.length - 2]);
                if (cycleNeighbors.length > 0) {
                    let earliestIdx = basePath.length;
                    for (const n of cycleNeighbors) {
                        const idx = basePath.indexOf(n);
                        if (idx < earliestIdx) earliestIdx = idx;
                    }
                    if (basePath.length - earliestIdx > 3 && earliestIdx > 0) {
                        basePath = juncU ? basePath.slice(0, earliestIdx) : basePath.slice(earliestIdx);
                    }
                }
            }

            let laneOffset = 0;
            let startX = 25;

            if (juncU && juncV) {
                const uData = topoNodes.get(juncU)!;
                startX = uData.x + calculateSpacingX(juncU, juncV);

                // juncU가 순환선 소속이면 → 루프 중심 높이로 본선을 직선 연장
                const parentLoop = loopMetadata.find(lm => lm.stationIds.has(juncU));
                if (parentLoop) {
                    const loopCenterLane = Math.round((parentLoop.cy - baseY) / spacingY);
                    laneOffset = loopCenterLane;
                    // 순환선의 오른쪽 끝(cx + a)에서 적절한 간격만큼 띄웁니다.
                    startX = Math.max(startX, parentLoop.cx + parentLoop.a + calculateSpacingX(juncU, juncV));
                } else {
                    const assignedNeighbors = Array.from(collapsedAdj.get(juncU) || []).filter(n => topoNodes.has(n));
                    const prevU = assignedNeighbors.find(n => topoNodes.get(n)!.x < uData.x) || assignedNeighbors[0] || null;
                    const idealOffsetDir = getBranchDirection(juncU, juncV, prevU);
                    const uLane = Math.round((uData.y - baseY) / spacingY);
                    laneOffset = findAvailableLane(startX, uLane + idealOffsetDir);
                }
            } else {
                if (topoNodes.size > 0) {
                    let maxLane = 0;
                    for (const l of laneUsage.keys()) maxLane = Math.max(maxLane, Math.abs(l));
                    laneOffset = maxLane + 2;
                }
                startX = 25;
            }

            const currentY = baseY + laneOffset * spacingY;
            const N = basePath.length;
            const isLoop = N > 3 && collapsedAdj.get(basePath[N - 1])?.has(basePath[0]);

            if (isLoop) {
                // === 방향 결정 ===
                // juncU 있음(본선 → 순환): junction은 왼쪽(angle=π), 본선이 왼쪽에 이미 있음
                // juncU 없음(순환 → 본선): junction은 오른쪽(angle=0), 이후 본선이 오른쪽으로 연장
                const loopFacesRight = !juncU; // true = junction이 오른쪽

                // 본선 연결역(juncV) 인덱스 결정
                let junctionIdx = 0;
                if (juncV) {
                    const idx = basePath.indexOf(juncV);
                    if (idx !== -1) junctionIdx = idx;
                } else {
                    // 독립 순환선: 이미 배치된 노드와 연결되는 역을 junction으로
                    for (let i = 0; i < N; i++) {
                        const ext = Array.from(collapsedAdj.get(basePath[i]) || [])
                            .filter(n => !basePath.includes(n) && topoNodes.has(n));
                        if (ext.length > 0) { junctionIdx = i; break; }
                    }
                }

                // 타원 크기: 역 간 최소 180px 확보
                const VR = 0.5; // 수직 반축 비율 (위아래 줄인 타원)
                const factor = 2 * Math.PI * Math.sqrt((1 + VR ** 2) / 2);
                const a = Math.max(90, (N * 90) / factor);
                const b = a * VR;

                // 타원 중심 위치
                // 루프가 먼저 그려지든 나중에 그려지든, 현재의 startX(여유 공간 시작점)의 오른쪽에
                // 그려져야 하므로 cx는 항상 startX + a 입니다.
                const cx = startX + a;
                const cy = currentY;

                // junction 기준 각도: 오른쪽이면 0, 왼쪽이면 π
                const junctionAngle = loopFacesRight ? 0 : Math.PI;

                for (let i = 0; i < N; i++) {
                    const relIdx = (i - junctionIdx + N) % N;
                    // 시계 방향으로 배열
                    const angle = junctionAngle - relIdx * (2 * Math.PI / N);
                    const x = cx + a * Math.cos(angle);
                    const y = cy + b * Math.sin(angle);

                    const node = basePath[i];
                    const nodeData = nodes.get(node);
                    topoNodes.set(node, {
                        id: node, name: nodeData?.name || node,
                        name_en: nodeData?.name_en, name_kr: nodeData?.name_kr,
                        x, y, isJoint: false,
                        isVisited: nodeData ? visitedStations.has(node) : false
                    });
                    unvisited.delete(node);
                }

                loopMetadata.push({ cx, cy, a, b, stationIds: new Set(basePath) });

                const topLane = Math.floor((cy - b - baseY) / spacingY);
                const bottomLane = Math.ceil((cy + b - baseY) / spacingY);
                for (let l = topLane; l <= bottomLane; l++) {
                    laneUsage.set(l, Math.max(laneUsage.get(l) || 0, Math.abs(cx) + a + OCCUPATION_BUFFER));
                }
            } else {
                let currX = startX;
                for (let i = 0; i < basePath.length; i++) {
                    const node = basePath[i];
                    if (i > 0) currX += calculateSpacingX(basePath[i - 1], node);
                    const nodeData = nodes.get(node);
                    topoNodes.set(node, {
                        id: node, name: nodeData?.name || node,
                        name_en: nodeData?.name_en, name_kr: nodeData?.name_kr,
                        x: currX, y: currentY, isJoint: false,
                        isVisited: nodeData ? visitedStations.has(node) : false
                    });
                    unvisited.delete(node);
                }
                laneUsage.set(laneOffset, Math.max(laneUsage.get(laneOffset) || 0, currX + OCCUPATION_BUFFER));
            }
        }

        // 최종 엣지 목록
        const finalEdges: TopologyEdge[] = [];
        const finalEdgeInfos = new Map<string, { from: string, to: string, isVisited: boolean }>();
        for (const [key, isVisited] of collapsedEdgeVisited) {
            const [from, to] = key.split('<->');
            const edge = { from, to, isVisited };
            finalEdges.push(edge);
            finalEdgeInfos.set(key, edge);
        }

        return {
            nodes: Array.from(topoNodes.values()),
            edges: finalEdges,
            adj: collapsedAdj,
            nodesById: topoNodes,
            edgeInfos: finalEdgeInfos,
            loops: loopMetadata,
        };
    }, [segments, nodes, visitedStations, visitedEdges, railData, lineId]);
}

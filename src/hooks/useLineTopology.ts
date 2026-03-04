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
            return Math.max((node.name || "").length * 18, (node.name_en || "").length * 9);
        };

        const calculateSpacingX = (idA: string, idB: string) => {
            const gap = (getLabelWidth(idA) + getLabelWidth(idB)) / 2 + 70;
            return Math.max(160, gap);
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
            if (diff > 0.05) return -1;
            if (diff < -0.05) return 1;
            return 1;
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
        const OCCUPATION_BUFFER = 240;
        const spacingY = 80;
        const baseY = 150;

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
            let startX = 50;

            if (juncU && juncV) {
                const uData = topoNodes.get(juncU)!;
                startX = uData.x + calculateSpacingX(juncU, juncV);
                const assignedNeighbors = Array.from(collapsedAdj.get(juncU) || []).filter(n => topoNodes.has(n));
                const prevU = assignedNeighbors.find(n => topoNodes.get(n)!.x < uData.x) || assignedNeighbors[0] || null;
                const idealOffsetDir = getBranchDirection(juncU, juncV, prevU);
                const uLane = Math.round((uData.y - baseY) / spacingY);
                laneOffset = findAvailableLane(startX, uLane + idealOffsetDir);
            } else {
                if (topoNodes.size > 0) {
                    let maxLane = 0;
                    for (const l of laneUsage.keys()) maxLane = Math.max(maxLane, Math.abs(l));
                    laneOffset = maxLane + 2;
                }
                startX = 50;
            }

            const currentY = baseY + laneOffset * spacingY;
            const N = basePath.length;
            const isLoop = N > 3 && collapsedAdj.get(basePath[N - 1])?.has(basePath[0]);

            if (isLoop) {
                let L_total = 0;
                const t_values: number[] = [0];
                for (let i = 0; i < N; i++) {
                    const nextIdx = (i + 1) % N;
                    L_total += calculateSpacingX(basePath[i], basePath[nextIdx]);
                    if (i < N - 1) t_values.push(L_total);
                }
                let R = 150, D = 0;
                if (L_total >= 2 * Math.PI * R) D = (L_total - 2 * Math.PI * R) / 2;
                else R = L_total / (2 * Math.PI);
                const cx1 = startX, cy = currentY + R, cx2 = cx1 + D;
                const getLoopXY = (t: number) => {
                    if (t < D) return { x: cx1 + t, y: cy - R };
                    if (t < D + Math.PI * R) { const th = -Math.PI / 2 + (t - D) / R; return { x: cx2 + R * Math.cos(th), y: cy + R * Math.sin(th) }; }
                    if (t < 2 * D + Math.PI * R) return { x: cx2 - (t - (D + Math.PI * R)), y: cy + R };
                    const th = Math.PI / 2 + (t - (2 * D + Math.PI * R)) / R;
                    return { x: cx1 + R * Math.cos(th), y: cy + R * Math.sin(th) };
                };
                for (let i = 0; i < N; i++) {
                    const node = basePath[i];
                    const pos = getLoopXY(t_values[i]);
                    const nodeData = nodes.get(node);
                    topoNodes.set(node, {
                        id: node, name: nodeData?.name || node,
                        name_en: nodeData?.name_en, name_kr: nodeData?.name_kr,
                        x: pos.x, y: pos.y, isJoint: false,
                        isVisited: nodeData ? visitedStations.has(node) : false
                    });
                    unvisited.delete(node);
                }
                const endLane = laneOffset + Math.ceil(2 * R / spacingY);
                const loopMaxX = cx2 + R + OCCUPATION_BUFFER;
                for (let l = laneOffset; l <= endLane; l++) laneUsage.set(l, Math.max(laneUsage.get(l) || 0, loopMaxX));
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
            edgeInfos: finalEdgeInfos
        };
    }, [segments, nodes, visitedStations, visitedEdges, railData, lineId]);
}

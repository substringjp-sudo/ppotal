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

        const adj = new Map<string, Set<string>>();
        const edgeInfos = new Map<string, { from: string, to: string, isVisited: boolean }>();
        const edgeSecMap = new Map<string, string>();
        const edgeGeomMap = new Map<string, [number, number][]>();

        // 1. Build Adjacency List & Extracts
        segments.forEach(seg => {
            seg.edges.forEach(edge => {
                if (!adj.has(edge.from)) adj.set(edge.from, new Set());
                if (!adj.has(edge.to)) adj.set(edge.to, new Set());
                adj.get(edge.from)!.add(edge.to);
                adj.get(edge.to)!.add(edge.from);

                const edgeKey = [edge.from, edge.to].sort().join('<->');
                edgeInfos.set(edgeKey, {
                    from: edge.from,
                    to: edge.to,
                    isVisited: visitedEdges.has(edgeKey)
                });

                if (edge.sectionId) edgeSecMap.set(edgeKey, edge.sectionId);
                edgeGeomMap.set(edgeKey, seg.geometry);
            });
        });

        const throughPairSet = new Set<string>();
        if (railData?.joints?.joints) {
            railData.joints.joints.forEach((j: any) => {
                if (j.through_pairs) {
                    j.through_pairs.forEach(([a, b]: [string, string]) => {
                        const key = `${j.id}:${[a, b].sort().join(':')}`;
                        throughPairSet.add(key);
                    });
                }
            });
        }

        const [_, lineName] = lineId.split('::');
        const lineSequence = railData?.railroadNetwork?.line_data?.[lineName]?.stations || [];

        // --- 알고리즘 헬퍼 함수들 ---

        // 역 이름 길이에 따른 X축 여백 동적 할당
        const getLabelWidth = (nodeId: string) => {
            if (nodeId.startsWith('J_')) return 0;
            const node = nodes.get(nodeId);
            if (!node) return 0;
            const nameLen = (node.name || "").length * 18;
            const enLen = (node.name_en || "").length * 9;
            return Math.max(nameLen, enLen);
        };

        const calculateSpacingX = (idA: string, idB: string) => {
            const isAJoint = idA.startsWith('J_');
            const isBJoint = idB.startsWith('J_');
            const widthA = getLabelWidth(idA);
            const widthB = getLabelWidth(idB);

            if (isAJoint || isBJoint) {
                const labelWidth = isAJoint ? widthB : widthA;
                return Math.max(80, (labelWidth / 2) + 60);
            } else {
                const dynamicGap = (widthA + widthB) / 2 + 70;
                return Math.max(160, dynamicGap);
            }
        };

        // 분기 지점 기하학적 꺾임 각도 도출 (-1 위 / 1 아래)
        const getBranchDirection = (u: string, v: string, prevU: string | null): number => {
            if (!prevU) return 1;
            const keyIn = [prevU, u].sort().join('<->');
            const geomIn = edgeGeomMap.get(keyIn);
            let inAngle = 0;
            if (geomIn && geomIn.length >= 2) {
                const sorted = prevU < u;
                const p1 = sorted ? geomIn[geomIn.length - 2] : geomIn[1];
                const pU = sorted ? geomIn[geomIn.length - 1] : geomIn[0];
                inAngle = Math.atan2(pU[1] - p1[1], pU[0] - p1[0]);
            }

            const keyOut = [u, v].sort().join('<->');
            const geomOut = edgeGeomMap.get(keyOut);
            let outAngle = 0;
            if (geomOut && geomOut.length >= 2) {
                const sorted = u < v;
                const pU = sorted ? geomOut[0] : geomOut[geomOut.length - 1];
                const p2 = sorted ? geomOut[1] : geomOut[geomOut.length - 2];
                outAngle = Math.atan2(p2[1] - pU[1], p2[0] - pU[0]);
            }

            let diff = outAngle - inAngle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;

            if (diff > 0.05) return -1; // 윗쪽 배치
            if (diff < -0.05) return 1; // 아랫쪽 배치
            return 1;
        };

        // 가장 긴 단순 경로 탐색 (가점 부여 기반)
        const getLongestSimplePath = (
            starts: string[],
            available: Set<string>
        ): { path: string[], score: number } => {
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
                        bestScore = curr.score;
                        best = curr.path;
                    }

                    const neighbors = Array.from(adj.get(curr.node) || []).filter(n => available.has(n) && !curr.visited.has(n));
                    for (const n of neighbors) {
                        const nv = new Set(curr.visited);
                        nv.add(n);
                        let nextScore = curr.score + 10;

                        // Through_pairs 우선 보너스
                        if (curr.path.length >= 2) {
                            const prevNode = curr.path[curr.path.length - 2];
                            const junction = curr.node;
                            const sec1 = edgeSecMap.get([prevNode, junction].sort().join('<->'));
                            const sec2 = edgeSecMap.get([junction, n].sort().join('<->'));
                            if (sec1 && sec2 && junction.startsWith('J_')) {
                                if (throughPairSet.has(`${junction}:${[sec1, sec2].sort().join(':')}`)) {
                                    nextScore += 50; // 확실한 직통 본선 가중치 부여
                                }
                            }
                        }
                        stack.push({ node: n, path: [...curr.path, n], visited: nv, score: nextScore });
                    }
                }
            }
            return { path: best, score: bestScore };
        };

        // --- 마스터 레이아웃 엔진 ---
        const topoNodes = new Map<string, TopologyNode>();
        const unvisited = new Set(Array.from(adj.keys()));
        const laneUsage = new Map<number, number>();
        const OCCUPATION_BUFFER = 240;
        const spacingY = 80;
        const baseY = 150;

        // X 위치에서 겹치지 않는 가장 이상적인 사용 가능 레인 반환
        const findAvailableLane = (startX: number, preferredOffset: number): number => {
            let offset = preferredOffset;
            let step = 0;
            const direction = preferredOffset >= 0 ? 1 : -1;
            while (step < 20) {
                const maxX = laneUsage.get(offset) || 0;
                if (maxX < startX) return offset;
                step++;
                offset = preferredOffset + (step * direction);
            }
            return offset;
        };

        while (unvisited.size > 0) {
            // 연결된 파편 중 지선을 뻗기 좋은 후보 물색
            const candidates: { u: string, v: string }[] = [];
            for (const u of topoNodes.keys()) {
                for (const v of adj.get(u) || []) {
                    if (unvisited.has(v)) {
                        candidates.push({ u, v });
                    }
                }
            }

            let basePath: string[] = [];
            let juncU: string | null = null;
            let juncV: string | null = null;

            if (candidates.length > 0) {
                // 이미 그려진 본선에서 나가는 지선들 중 가장 긴 녀석 찾기
                let bestScore = -1;
                let bestCand = candidates[0];
                for (const cand of candidates) {
                    const res = getLongestSimplePath([cand.v], unvisited);
                    let finalScore = res.score;

                    // 이 지선이 사실은 원래 노선의 주된 맥락과 똑같이 꺾이는 각도라면 가점 부여
                    const prevUParams = Array.from(adj.get(cand.u) || []).filter(nx => topoNodes.has(nx));
                    const prevU = prevUParams.find(nx => topoNodes.get(nx)!.x < topoNodes.get(cand.u)!.x) || prevUParams[0];
                    if (prevU) {
                        const sec1 = edgeSecMap.get([prevU, cand.u].sort().join('<->'));
                        const sec2 = edgeSecMap.get([cand.u, cand.v].sort().join('<->'));
                        if (sec1 && sec2 && cand.u.startsWith('J_')) {
                            if (throughPairSet.has(`${cand.u}:${[sec1, sec2].sort().join(':')}`)) {
                                finalScore += 50;
                            }
                        }
                    }

                    if (finalScore > bestScore || (finalScore === bestScore && res.path.length > basePath.length)) {
                        bestScore = finalScore;
                        basePath = res.path;
                        bestCand = cand;
                    }
                }
                juncU = bestCand.u;
                juncV = bestCand.v;
            } else {
                // 맨 처음 그리는 본선 (가장 뼈대) 또는 완전히 끊어진 별개 블록
                const availableArray = Array.from(unvisited);
                let degree1 = availableArray.filter(n => {
                    return Array.from(adj.get(n) || []).filter(nx => unvisited.has(nx)).length === 1;
                });

                // 순환선(야마노테 등) 처리 로직: 지정된 순서의 첫 역을 무조건 기착지로
                if (degree1.length === 0) {
                    const officialStart = availableArray.find(n => n === lineSequence[0]);
                    if (officialStart) {
                        degree1 = [officialStart];
                    } else if (lineSequence.length > 0) {
                        const anyOfficial = availableArray.find(n => lineSequence.indexOf(n) !== -1);
                        if (anyOfficial) degree1 = [anyOfficial];
                    }
                }

                const starts = degree1.length > 0 ? degree1 : [availableArray[0]];
                basePath = getLongestSimplePath(starts, unvisited).path;
            }

            // --- 라쏘(Lasso) 형태 또는 순환선 감지 및 잘라내기 ---
            if (basePath.length > 2) {
                const lastNode = basePath[basePath.length - 1];
                const cycleNeighbors = Array.from(adj.get(lastNode) || []).filter(n => basePath.includes(n) && n !== basePath[basePath.length - 2]);
                if (cycleNeighbors.length > 0) {
                    let earliestIdx = basePath.length;
                    for (const n of cycleNeighbors) {
                        const idx = basePath.indexOf(n);
                        if (idx < earliestIdx) earliestIdx = idx;
                    }
                    const cycleLength = basePath.length - earliestIdx;
                    if (cycleLength > 3) {
                        if (earliestIdx > 0) {
                            if (!juncU) {
                                basePath = basePath.slice(earliestIdx);
                            } else {
                                basePath = basePath.slice(0, earliestIdx);
                            }
                        }
                    }
                }
            }

            let laneOffset = 0;
            let startX = 50;

            if (juncU && juncV) {
                // Branch 지선 레이아웃 세팅
                const uData = topoNodes.get(juncU)!;
                startX = uData.x + calculateSpacingX(juncU, juncV);

                const assignedNeighbors = Array.from(adj.get(juncU) || []).filter(n => topoNodes.has(n));
                const prevU = assignedNeighbors.find(n => topoNodes.get(n)!.x < uData.x) || assignedNeighbors[0] || null;

                let idealOffsetDir = getBranchDirection(juncU, juncV, prevU);
                const uLane = Math.round((uData.y - baseY) / spacingY);
                laneOffset = findAvailableLane(startX, uLane + idealOffsetDir);
            } else {
                // 새로운 본선 레이아웃 세팅
                if (topoNodes.size > 0) {
                    let maxLane = 0;
                    for (const l of laneUsage.keys()) maxLane = Math.max(maxLane, Math.abs(l));
                    laneOffset = maxLane + 2;
                } else {
                    laneOffset = 0;
                }
                startX = 50;
            }

            const currentY = baseY + laneOffset * spacingY;
            const N = basePath.length;
            const isLoop = N > 3 && adj.get(basePath[N - 1])?.has(basePath[0]);

            if (isLoop) {
                // --- 순환선(루프) 파라메트릭 타원(캡슐) 레이아웃 ---
                let L_total = 0;
                const t_values: number[] = [0];
                for (let i = 0; i < N; i++) {
                    const nextIdx = (i + 1) % N;
                    L_total += calculateSpacingX(basePath[i], basePath[nextIdx]);
                    if (i < N - 1) t_values.push(L_total);
                }

                let R = 150;
                let D = 0;
                if (L_total >= 2 * Math.PI * R) {
                    D = (L_total - 2 * Math.PI * R) / 2;
                } else {
                    R = L_total / (2 * Math.PI);
                }

                const cx1 = startX;
                const cy = currentY + R;
                const cx2 = cx1 + D;

                const getLoopXY = (t: number) => {
                    if (t < D) {
                        return { x: cx1 + t, y: cy - R };
                    } else if (t < D + Math.PI * R) {
                        const theta = -Math.PI / 2 + (t - D) / R;
                        return { x: cx2 + R * Math.cos(theta), y: cy + R * Math.sin(theta) };
                    } else if (t < 2 * D + Math.PI * R) {
                        return { x: cx2 - (t - (D + Math.PI * R)), y: cy + R };
                    } else {
                        const theta = Math.PI / 2 + (t - (2 * D + Math.PI * R)) / R;
                        return { x: cx1 + R * Math.cos(theta), y: cy + R * Math.sin(theta) };
                    }
                };

                for (let i = 0; i < N; i++) {
                    const node = basePath[i];
                    const pos = getLoopXY(t_values[i]);
                    const nodeData = nodes.get(node);
                    const isJoint = node.startsWith('J_');

                    topoNodes.set(node, {
                        id: node,
                        name: nodeData?.name || node,
                        name_en: nodeData?.name_en,
                        name_kr: nodeData?.name_kr,
                        x: pos.x,
                        y: pos.y,
                        isJoint,
                        isVisited: !isJoint && nodeData ? visitedStations.has(node) : false
                    });
                    unvisited.delete(node);
                }

                const startLane = laneOffset;
                const endLane = laneOffset + Math.ceil(2 * R / spacingY);
                const loopMaxX = cx2 + R + OCCUPATION_BUFFER;
                for (let l = startLane; l <= endLane; l++) {
                    laneUsage.set(l, Math.max(laneUsage.get(l) || 0, loopMaxX));
                }
            } else {
                // --- 일반 직선형/지선형 배치 ---
                let currX = startX;

                // 길게 뻗은 본선/지선을 수평으로 단번에 배치
                for (let i = 0; i < basePath.length; i++) {
                    const node = basePath[i];
                    if (i > 0) {
                        currX += calculateSpacingX(basePath[i - 1], node);
                    }

                    const nodeData = nodes.get(node);
                    const isJoint = node.startsWith('J_');

                    topoNodes.set(node, {
                        id: node,
                        name: nodeData?.name || node,
                        name_en: nodeData?.name_en,
                        name_kr: nodeData?.name_kr,
                        x: currX,
                        y: currentY,
                        isJoint,
                        isVisited: !isJoint && nodeData ? visitedStations.has(node) : false
                    });
                    unvisited.delete(node);
                }

                laneUsage.set(laneOffset, Math.max(laneUsage.get(laneOffset) || 0, currX + OCCUPATION_BUFFER));
            }
        }

        return {
            nodes: Array.from(topoNodes.values()),
            edges: Array.from(edgeInfos.values()),
            adj,
            nodesById: topoNodes,
            edgeInfos
        };
    }, [segments, nodes, visitedStations, visitedEdges, railData, lineId]);
}

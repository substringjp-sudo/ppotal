import { useMemo } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { RailData } from '../types/railData';
import { layoutLine } from '../lib/lineLayout';

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
    /** How the connection should be drawn. */
    kind: 'track' | 'express' | 'ring';
    /** Stations an express service runs past, sizing its arc. */
    passes: number;
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

        // === Phase 4: 스키매틱 레이아웃 ===
        const [, lineName] = lineId.split('::');
        const lineSequence = railData?.railroadNetwork?.line_data?.[lineName]?.stations || [];

        const coordinates = new Map<string, [number, number]>();
        collapsedAdj.forEach((_neighbours, id) => {
            const coord = nodes.get(id)?.coords;
            if (coord) coordinates.set(id, coord);
        });

        const layout = layoutLine(collapsedAdj, {
            preferredOrder: lineSequence,
            coordinates
        });

        const labelWidth = (id: string) => {
            const node = nodes.get(id);
            if (!node) return 40;
            return Math.max((node.name || '').length * 9, (node.name_en || '').length * 4.5, 40);
        };

        // Columns are sized to the widest label they hold, so names never
        // collide and stations still line up vertically across rows.
        const halfWidth = new Array(Math.max(1, layout.columnCount)).fill(24);
        layout.nodes.forEach(placed => {
            halfWidth[placed.column] = Math.max(halfWidth[placed.column], labelWidth(placed.id) / 2);
        });

        const COLUMN_GAP = 26;
        const ROW_HEIGHT = 46;
        const BASE_X = 40;
        const BASE_Y = 60;

        const columnX: number[] = [];
        for (let c = 0; c < halfWidth.length; c++) {
            columnX[c] = c === 0
                ? BASE_X + halfWidth[0]
                : columnX[c - 1] + halfWidth[c - 1] + COLUMN_GAP + halfWidth[c];
        }

        const topoNodes = new Map<string, TopologyNode>();
        const place = (id: string, x: number, y: number) => {
            const data = nodes.get(id);
            topoNodes.set(id, {
                id,
                name: data?.name || id,
                name_en: data?.name_en,
                name_kr: data?.name_kr,
                x,
                y,
                isJoint: false,
                isVisited: visitedStations.has(id)
            });
        };

        layout.nodes.forEach(placed => {
            place(placed.id, columnX[placed.column] ?? BASE_X, BASE_Y + placed.row * ROW_HEIGHT);
        });

        // Circle lines are drawn as a circle rather than unrolled into a strip.
        const loopMetadata: TopologyLoop[] = [];
        layout.rings.forEach(ring => {
            const count = ring.members.length;
            const spanX = (columnX[Math.min(ring.startColumn + ring.columnSpan, columnX.length - 1)] ?? 400)
                - (columnX[ring.startColumn] ?? BASE_X);
            const a = Math.max(120, spanX / 2, (count * 70) / (2 * Math.PI));
            const b = a * 0.5;
            const cx = (columnX[ring.startColumn] ?? BASE_X) + a;
            const cy = BASE_Y + ring.row * ROW_HEIGHT;

            ring.members.forEach((id, index) => {
                const angle = -Math.PI / 2 + (index / count) * 2 * Math.PI;
                place(id, cx + a * Math.cos(angle), cy + b * Math.sin(angle));
            });

            loopMetadata.push({ cx, cy, a, b, stationIds: new Set(ring.members) });
        });

        // A circle line reaches above its own row, so slide everything down
        // until nothing is cut off at the top.
        const topMost = Math.min(...Array.from(topoNodes.values()).map(n => n.y), BASE_Y);
        const shift = topMost < BASE_Y ? BASE_Y - topMost : 0;
        if (shift > 0) {
            topoNodes.forEach(node => { node.y += shift; });
            loopMetadata.forEach(loop => { loop.cy += shift; });
        }

        // === Phase 5: 엣지 ===
        const finalEdges: TopologyEdge[] = [];
        const finalEdgeInfos = new Map<string, { from: string, to: string, isVisited: boolean }>();

        const pushEdge = (from: string, to: string, kind: TopologyEdge['kind'], passes: number) => {
            const key = [from, to].sort().join('<->');
            if (finalEdgeInfos.has(key)) return;
            const isVisited = collapsedEdgeVisited.get(key) ?? false;
            const edge: TopologyEdge = { from, to, isVisited, kind, passes };
            finalEdges.push(edge);
            finalEdgeInfos.set(key, edge);
        };

        layout.edges.forEach(edge => pushEdge(edge.from, edge.to, edge.kind, edge.passes));

        // Ring segments are not part of the layered result; add them directly.
        layout.rings.forEach(ring => {
            ring.members.forEach((id, index) => {
                const next = ring.members[(index + 1) % ring.members.length];
                if (collapsedAdj.get(id)?.has(next)) pushEdge(id, next, 'ring', 0);
            });
        });

        // Anything the layout could not account for still needs drawing.
        collapsedAdj.forEach((neighbours, from) => {
            neighbours.forEach(to => {
                if (topoNodes.has(from) && topoNodes.has(to)) pushEdge(from, to, 'track', 0);
            });
        });

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

"use client";

import React, { useMemo, useState } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';

import { Language } from '../lib/translations';
import { getLineColor } from '../lib/lineColors';
import { RailData } from '../types/railData';

// --- PROPS INTERFACE ---
interface LineTopologyGraphProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedStations: Set<string>;
    visitedEdges: Set<string>;
    onStationClick?: (stationName: string) => void;
    language: Language;
    railData: RailData | null;
}

// --- LAYOUT CONSTANTS ---
const NODE_SIZE = 8;
const GRID_SPACING_X = 90; // Increased for more space
const GRID_SPACING_Y = 60;
const JOINT_SPACING_X = 25; // Reduced spacing for joints
const JOINT_SPACING_Y = 25;
const STROKE_WIDTH = 4;
const STROKE_WIDTH_VISITED = 6;
const FONT_SIZE = 14;

// --- SVG PATH GENERATION ---
const createCurvePath = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    isLongDistance: boolean
): string => {
    const [start, end] = p1.x < p2.x ? [p1, p2] : [p2, p1];
    const midX = (start.x + end.x) / 2;
    const xDist = Math.abs(end.x - start.x);

    // Handle vertical or near-vertical lines
    if (xDist < 1) {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    if (isLongDistance) {
        const arcHeight = xDist / 3;
        const direction = (start.y >= 0 && end.y >= 0) ? -1 : 1;
        const controlY = Math.min(start.y, end.y) + arcHeight * direction;
        return `M ${start.x} ${start.y} Q ${midX} ${controlY}, ${end.x} ${end.y}`;
    }

    const cx1 = midX, cy1 = start.y;
    const cx2 = midX, cy2 = end.y;
    return `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
};

// --- LAYOUT ALGORITHM HOOK ---
const useSubwayLayout = (segments: LineSegment[], nodes: Map<string, StationNode>) => {
    return useMemo(() => {
        if (!segments || segments.length === 0) {
            return { nodePositions: new Map(), edges: [], boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
        }

        const adj = new Map<string, string[]>();
        const allEdges = new Set<string>();
        const edgeObjects: { from: string, to: string }[] = [];

        segments.forEach(seg => {
            seg.edges.forEach(({ from, to }) => {
                if (!adj.has(from)) adj.set(from, []);
                if (!adj.has(to)) adj.set(to, []);
                adj.get(from)!.push(to);
                adj.get(to)!.push(from);
                const edgeKey = [from, to].sort().join('-');
                if (!allEdges.has(edgeKey)) {
                    allEdges.add(edgeKey);
                    edgeObjects.push({ from, to });
                }
            });
        });

        // 1. Find Longest Path (Backbone)
        let longestPath: string[] = [];
        let endpoints = Array.from(adj.keys()).filter(id => (adj.get(id)?.length ?? 0) <= 1);

        // Handle pure cycles (e.g., Yamanote Line)
        if (endpoints.length === 0 && adj.size > 0) {
            const isPureCycle = Array.from(adj.keys()).every(id => adj.get(id)?.length === 2);
            if (isPureCycle) {
                const startNode = Array.from(adj.keys())[0];
                const path: string[] = [];
                let curr = startNode;
                const visitedInCycle = new Set<string>();
                while (curr && !visitedInCycle.has(curr)) {
                    path.push(curr);
                    visitedInCycle.add(curr);
                    const next = (adj.get(curr) || []).find(n => !visitedInCycle.has(n));
                    curr = next!;
                }
                longestPath = path;
                // Add the closing edge for the cycle
                const closingEdgeKey = [path[0], path[path.length - 1]].sort().join('-');
                if (!allEdges.has(closingEdgeKey)) {
                    edgeObjects.push({ from: path[0], to: path[path.length - 1] });
                }
            } else {
                // For complex graphs with no endpoints, start from the most connected node
                endpoints = [Array.from(adj.keys()).sort((a, b) => (adj.get(b)?.length ?? 0) - (adj.get(a)?.length ?? 0))[0]];
            }
        }

        if (longestPath.length === 0) {
            endpoints.forEach(startNode => {
                const stack: { node: string; path: string[] }[] = [{ node: startNode, path: [startNode] }];
                const visited = new Set([startNode]);
                while (stack.length > 0) {
                    const { node, path } = stack.pop()!;
                    if (path.length > longestPath.length) longestPath = path;
                    (adj.get(node) || []).forEach(neighbor => {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            stack.push({ node: neighbor, path: [...path, neighbor] });
                        }
                    });
                }
            });
        }

        const nodePositions = new Map<string, { x: number; y: number }>();
        const occupiedCoords = new Set<string>();

        // 2. Place Backbone Nodes with adaptive spacing
        let currentX = 0;
        longestPath.forEach((nodeId, index) => {
            if (index > 0) {
                const prevNodeId = longestPath[index - 1];
                const isCurrentJoint = nodeId.startsWith('J_');
                const isPrevJoint = prevNodeId.startsWith('J_');
                currentX += isCurrentJoint || isPrevJoint ? JOINT_SPACING_X : GRID_SPACING_X;
            }
            const pos = { x: currentX, y: 0 };
            nodePositions.set(nodeId, pos);
            occupiedCoords.add(`${pos.x},${pos.y}`);
        });

        // 3. Place Branch Nodes using BFS with adaptive spacing
        const queue: string[] = [...longestPath];
        const visited = new Set<string>(longestPath);

        while (queue.length > 0) {
            const parentId = queue.shift()!;
            const parentPos = nodePositions.get(parentId)!;

            (adj.get(parentId) || []).forEach(childId => {
                if (!visited.has(childId)) {
                    visited.add(childId);
                    const isChildJoint = childId.startsWith('J_');
                    const spacingX = isChildJoint ? JOINT_SPACING_X : GRID_SPACING_X;
                    const spacingY = isChildJoint ? JOINT_SPACING_Y : GRID_SPACING_Y;

                    let offset = 1;
                    while (true) {
                        const yOffset = (offset % 2 !== 0) ? Math.ceil(offset / 2) : -Math.ceil(offset / 2);
                        const targetY = parentPos.y + yOffset * spacingY;
                        const targetX = parentPos.x + spacingX;
                        if (!occupiedCoords.has(`${targetX},${targetY}`)) {
                            const pos = { x: targetX, y: targetY };
                            nodePositions.set(childId, pos);
                            occupiedCoords.add(`${pos.x},${pos.y}`);
                            break;
                        }
                        offset++;
                    }
                    queue.push(childId);
                }
            });
        }

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pos of nodePositions.values()) {
            minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x); maxY = Math.max(maxY, pos.y);
        }
        const padding = FONT_SIZE * 4;
        const boundingBox = { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };

        return { nodePositions, edges: edgeObjects, boundingBox };

    }, [segments, nodes]);
};

// --- MAIN COMPONENT ---
const LineTopologyGraph: React.FC<LineTopologyGraphProps> = ({
    lineId, segments, nodes, visitedStations, visitedEdges, onStationClick, language, railData
}) => {
    const { nodePositions, edges, boundingBox } = useSubwayLayout(segments, nodes);
    const [hoveredStation, setHoveredStation] = useState<string | null>(null);

    const lineColor = useMemo(() => getLineColor(lineId, railData) || '#3498db', [lineId, railData]);
    const visitedColor = '#2ecc71';

    const width = boundingBox.maxX - boundingBox.minX;
    const height = boundingBox.maxY - boundingBox.minY;

    return (
        <div style={{ width: '100%', height: '450px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #eee', overflow: 'auto', position: 'relative' }}>
            <svg viewBox={`${boundingBox.minX} ${boundingBox.minY} ${width} ${height}`} style={{ minWidth: '100%', minHeight: '100%' }}>
                {/* Render Edges */}
                <g>
                    {edges.map(({ from, to }) => {
                        const p1 = nodePositions.get(from);
                        const p2 = nodePositions.get(to);
                        if (!p1 || !p2) return null;

                        const edgeKey = [from, to].sort().join('<->');
                        const isVisited = visitedEdges.has(edgeKey);
                        const isJointEdge = from.startsWith('J_') || to.startsWith('J_');
                        const xDist = Math.abs(p1.x - p2.x);
                        const yDist = Math.abs(p1.y - p2.y);
                        const isLongDistance = xDist > (isJointEdge ? JOINT_SPACING_X * 2 : GRID_SPACING_X * 1.5) || yDist > GRID_SPACING_Y * 2;

                        return (
                            <path
                                key={`${from}-${to}`}
                                d={createCurvePath(p1, p2, isLongDistance)}
                                fill="none"
                                stroke={isVisited ? visitedColor : lineColor}
                                strokeWidth={isVisited ? STROKE_WIDTH_VISITED : STROKE_WIDTH}
                                strokeOpacity={isVisited ? 1.0 : (isJointEdge ? 0.6 : 0.8)}
                            />
                        );
                    })}
                </g>

                {/* Render Nodes */}
                <g>
                    {Array.from(nodePositions.entries()).map(([id, pos]) => {
                        const nodeData = nodes.get(id);
                        if (id.startsWith('J_')) {
                            // Render joints as small, subtle dots
                            return <circle key={id} cx={pos.x} cy={pos.y} r={STROKE_WIDTH / 2} fill={lineColor} />
                        }
                        if (!nodeData) return null;

                        const isVisited = visitedStations.has(nodeData.name);
                        const isHovered = hoveredStation === id;
                        const stationName = language === 'en' && nodeData.name_en ? nodeData.name_en : nodeData.name;

                        return (
                            <g key={id} transform={`translate(${pos.x}, ${pos.y})`} onClick={() => onStationClick?.(nodeData.name)} onMouseEnter={() => setHoveredStation(id)} onMouseLeave={() => setHoveredStation(null)} style={{ cursor: 'pointer' }}>
                                <circle r={NODE_SIZE} fill={isHovered ? '#FF5733' : '#ffffff'} stroke={isVisited ? visitedColor : lineColor} strokeWidth={isVisited ? STROKE_WIDTH_VISITED : STROKE_WIDTH} />
                                <text fontSize={FONT_SIZE} fontFamily="Inter, system-ui, sans-serif" fontWeight="500" fill="#333" textAnchor="middle" y={-NODE_SIZE * 2} style={{ pointerEvents: 'none' }}>
                                    {stationName}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};

export default React.memo(LineTopologyGraph);

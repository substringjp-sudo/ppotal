import React, { useMemo } from 'react';
import { StationNode } from '../lib/graphUtils';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';
import { getOfficialColor } from '../lib/lineColors';

interface TubeMapProps {
    lineId: string;
    topology: {
        type: string;
        main_line: string[];
        branches: Array<{
            junction: string;
            path: string[];
        }>;
    };
    nodes: Map<string, StationNode>;
    visitedStations: Set<string>;
    visitedEdges: Set<string>;
    onStationClick?: (stationName: string) => void;
    language: Language;
}

const STATION_SPACING = 60;
const BRANCH_ANGLE_RAD = Math.PI / 4; // 45 degrees
const BRANCH_LENGTH = 50;

interface NodePos {
    id: string;
    x: number;
    y: number;
    isJunction: boolean;
    isTerminus: boolean;
    branchIndex?: number; // 0 for main, 1+ for branches
}

const TubeMap: React.FC<TubeMapProps> = ({
    lineId,
    topology,
    nodes,
    visitedStations,
    visitedEdges,
    onStationClick,
    language
}) => {
    // 1. Calculate Layout
    const { nodePositions, edges, svgWidth, svgHeight, minX, minY } = useMemo(() => {
        const positions = new Map<string, NodePos>();
        const renderEdges: Array<{ u: string, v: string, isBranch: boolean }> = [];

        // 1. Layout Main Line (Horizontal)
        let maxX = 0;
        topology.main_line.forEach((stationId, index) => {
            const x = index * STATION_SPACING;
            positions.set(stationId, {
                id: stationId,
                x,
                y: 0,
                isJunction: false, // Updated later
                isTerminus: index === 0 || index === topology.main_line.length - 1,
                branchIndex: 0
            });
            maxX = x;
            if (index > 0) {
                renderEdges.push({
                    u: topology.main_line[index - 1],
                    v: stationId,
                    isBranch: false
                });
            }
        });

        // 2. Layout Branches
        let maxY = 0;
        let minYVal = 0;

        topology.branches.forEach((branch, bIdx) => {
            const junctionId = branch.junction;
            const junctionPos = positions.get(junctionId);

            if (!junctionPos) return; // Should not happen if data is consistent
            junctionPos.isJunction = true;

            // Determine direction (up or down based on index to alternate)
            // Or just always down for now? 
            // Let's alternate: even branches down, odd branches up
            const direction = bIdx % 2 === 0 ? 1 : -1;

            let prevId = junctionId;
            let currentX = junctionPos.x;
            let currentY = junctionPos.y;

            branch.path.forEach((stationId, idx) => {
                // Angle off for the first segment, then maybe straight?
                // Or constant angle?
                // Let's do constant 45 degree angle

                currentX += BRANCH_LENGTH * Math.cos(BRANCH_ANGLE_RAD);
                currentY += BRANCH_LENGTH * Math.sin(BRANCH_ANGLE_RAD) * direction;

                positions.set(stationId, {
                    id: stationId,
                    x: currentX,
                    y: currentY,
                    isJunction: false,
                    isTerminus: idx === branch.path.length - 1,
                    branchIndex: bIdx + 1
                });

                renderEdges.push({
                    u: prevId,
                    v: stationId,
                    isBranch: true
                });

                prevId = stationId;
                maxX = Math.max(maxX, currentX);
                maxY = Math.max(maxY, currentY);
                minYVal = Math.min(minYVal, currentY);
            });
        });

        // Add padding
        const PADDING = 40;
        const width = maxX + PADDING * 2;
        const height = (maxY - minYVal) + PADDING * 2;

        // Shift everything to fit padding
        const shiftX = PADDING;
        const shiftY = PADDING - minYVal;

        return {
            nodePositions: positions,
            edges: renderEdges,
            svgWidth: width,
            svgHeight: height,
            minX: shiftX,
            minY: shiftY
        };

    }, [topology]);

    const [, lineName] = lineId.split('::');

    // Get Line Color
    const lineColor = useMemo(() => {
        const official = getOfficialColor(lineId);
        if (official) return official;
        // Fallback hash color
        let hash = 0;
        for (let i = 0; i < lineId.length; i++) {
            hash = lineId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorPalette = [
            "#1B4F72", "#7B241C", "#186A3B", "#7D6608", "#4A235A",
            "#145A32", "#512E5F", "#0E6251", "#78281F", "#1B2631"
        ];
        return colorPalette[Math.abs(hash) % colorPalette.length];
    }, [lineId]);


    // Helper to get edge color
    const getEdgeColor = (u: string, v: string) => {
        const getName = (id: string) => nodes.get(id)?.name || id;
        const uName = getName(u);
        const vName = getName(v);
        // Check both directions (name-based key)
        const key = [uName, vName].sort().join('<->');
        return visitedEdges.has(key) ? '#2ecc71' : lineColor; // Green if visited, else line color
    };

    const getEdgeOpacity = (u: string, v: string) => {
        const getName = (id: string) => nodes.get(id)?.name || id;
        const uName = getName(u);
        const vName = getName(v);
        const key = [uName, vName].sort().join('<->');
        // If visited, full opacity. If not visited, lighter opacity?
        // Actually, typically the "line" is the line color, visited is overlay.
        // But here let's just use color to distinguish.
        return visitedEdges.has(key) ? 1.0 : 0.4;
    };

    const getStrokeWidth = (u: string, v: string) => {
        const getName = (id: string) => nodes.get(id)?.name || id;
        const uName = getName(u);
        const vName = getName(v);
        const key = [uName, vName].sort().join('<->');
        return visitedEdges.has(key) ? 8 : 6;
    }


    return (
        <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', padding: '10px' }}>
            <svg
                width={svgWidth}
                height={svgHeight}
                className="tube-map"
                style={{ minWidth: '100%' }}
            >
                {/* Defs for gradients or filters if needed */}

                {/* Render Edges */}
                {edges.map((edge, idx) => {
                    const paramsU = nodePositions.get(edge.u);
                    const paramsV = nodePositions.get(edge.v);
                    if (!paramsU || !paramsV) return null;

                    const uX = paramsU.x + minX;
                    const uY = paramsU.y + minY;
                    const vX = paramsV.x + minX;
                    const vY = paramsV.y + minY;

                    return (
                        <g key={`edge-${idx}`}>
                            {/* Outer glow/stroke for visited */}
                            {/* Main Stroke */}
                            <line
                                x1={uX} y1={uY} x2={vX} y2={vY}
                                stroke={getEdgeColor(edge.u, edge.v)}
                                strokeWidth={getStrokeWidth(edge.u, edge.v)}
                                strokeOpacity={getEdgeOpacity(edge.u, edge.v)}
                                strokeLinecap="round"
                            />
                        </g>
                    );
                })}

                {/* Render Stations */}
                {Array.from(nodePositions.values()).map(pos => {
                    const cx = pos.x + minX;
                    const cy = pos.y + minY;
                    const node = nodes.get(pos.id);
                    const name = node ? translateName(node.name, language, 'station') : pos.id.split('::').pop();
                    const isVisited = visitedStations.has(pos.id);

                    return (
                        <g
                            key={pos.id}
                            className="station-node"
                            onClick={() => {
                                const realName = nodes.get(pos.id)?.name;
                                if (realName && onStationClick) onStationClick(realName);
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Station Dot */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r={pos.isJunction ? 8 : (isVisited ? 6 : 5)}
                                fill="white"
                                stroke={isVisited ? '#2ecc71' : lineColor}
                                strokeWidth={isVisited ? 3 : 2}
                            />

                            {/* Station Name Label */}
                            <text
                                x={cx}
                                y={cy + 15}
                                transform={`rotate(45, ${cx}, ${cy + 15})`}
                                fontSize="12"
                                fontWeight={isVisited ? "bold" : "normal"}
                                fill={isVisited ? "#2ecc71" : "#333"}
                                textAnchor="start"
                                alignmentBaseline="middle"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {name}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TubeMap;

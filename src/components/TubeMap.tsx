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
    onPathCreate?: (startId: string, endId: string) => void;
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
    language,
    onPathCreate
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


    // Drag State
    const [dragStartId, setDragStartId] = React.useState<string | null>(null);
    const [dragCurrentPt, setDragCurrentPt] = React.useState<{ x: number, y: number } | null>(null);
    const [dragTargetId, setDragTargetId] = React.useState<string | null>(null);
    const [highlightedEdges, setHighlightedEdges] = React.useState<Set<string>>(new Set());

    const svgRef = React.useRef<SVGSVGElement>(null);

    // Auto-scroll refs
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollVelocityRef = React.useRef<number>(0);
    const animationFrameRef = React.useRef<number | null>(null);

    // BFS to find path between two nodes
    const findPath = (start: string, end: string) => {
        const queue: string[] = [start];
        const visited = new Set<string>();
        visited.add(start);
        const parent = new Map<string, string>();

        // Build adjacency if not already handy, or just search edges
        // We have `renderEdges` from useMemo, but we need adjacency list for efficient BFS
        // Let's build it on the fly or just iterate edges (small graph)
        // Optimization: Pre-calculate adjacency in useMemo if needed, but for < 100 nodes, straightforward is fine.

        while (queue.length > 0) {
            const u = queue.shift()!;
            if (u === end) break;

            // Find neighbors
            edges.forEach(edge => {
                let v: string | null = null;
                if (edge.u === u && !visited.has(edge.v)) v = edge.v;
                else if (edge.v === u && !visited.has(edge.u)) v = edge.u;

                if (v) {
                    visited.add(v);
                    parent.set(v, u);
                    queue.push(v);
                }
            });
        }

        // Reconstruct path
        const pathEdges = new Set<string>();
        let curr = end;
        while (curr !== start && parent.has(curr)) {
            const p = parent.get(curr)!;
            const key = [p, curr].sort().join('<->');
            pathEdges.add(key);
            curr = p;
        }
        return pathEdges;
    };

    // Auto-scroll loop
    React.useEffect(() => {
        if (!dragStartId) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            scrollVelocityRef.current = 0;
            return;
        }

        const loop = () => {
            if (scrollVelocityRef.current !== 0 && scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft += scrollVelocityRef.current;
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [dragStartId]);

    const handleStationMouseDown = (e: React.MouseEvent, stationId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDragStartId(stationId);
        setDragTargetId(stationId);
        setHighlightedEdges(new Set());

        const svg = svgRef.current;
        if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            setDragCurrentPt({ x: svgP.x, y: svgP.y });
        }
    };

    const handleSvgMouseMove = (e: React.MouseEvent) => {
        if (!dragStartId) return;
        const svg = svgRef.current;
        let svgP = { x: 0, y: 0 };

        if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            setDragCurrentPt({ x: svgP.x, y: svgP.y });
        }

        // Find Nearest Station for Drag Target
        let minDist = Infinity;
        let nearestId: string | null = null;

        nodePositions.forEach((pos, id) => {
            const dx = pos.x + minX - svgP.x;
            const dy = pos.y + minY - svgP.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Hint: Trigger radius can be generous
            if (dist < 40 && dist < minDist) {
                minDist = dist;
                nearestId = id;
            }
        });

        if (nearestId && nearestId !== dragTargetId) {
            setDragTargetId(nearestId);
            if (dragStartId) {
                const newPath = findPath(dragStartId, nearestId);
                setHighlightedEdges(newPath);
            }
        } else if (!nearestId && dragTargetId !== null) {
            // Optional: retain last target or clear? 
            // Clearing feels more responsive if you move far away.
            setDragTargetId(null);
            setHighlightedEdges(new Set());
        }

        // Calculate scroll velocity
        if (scrollContainerRef.current) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const w = rect.width;
            const threshold = 50;
            const speed = 10;

            if (relX < threshold) scrollVelocityRef.current = -speed;
            else if (relX > w - threshold) scrollVelocityRef.current = speed;
            else scrollVelocityRef.current = 0;
        }
    };

    const handleSvgMouseUp = () => {
        // If dropped on empty space but we have a valid target from hovering
        if (dragStartId && dragTargetId && dragStartId !== dragTargetId) {
            if (onPathCreate) {
                onPathCreate(dragStartId, dragTargetId);
            }
        }
        setDragStartId(null);
        setDragCurrentPt(null);
        setDragTargetId(null);
        setHighlightedEdges(new Set());
        scrollVelocityRef.current = 0;
    };

    const handleStationMouseUp = (e: React.MouseEvent, stationId: string) => {
        e.stopPropagation();
        // Handled basically same as dropping on global, but more specific.
        // If duplicate logic, just call general handler logic?
        // But here we ensure stationId is definitely the target.
        if (dragStartId && dragStartId !== stationId) {
            if (onPathCreate) {
                onPathCreate(dragStartId, stationId);
            }
        }
        setDragStartId(null);
        setDragCurrentPt(null);
        setDragTargetId(null);
        setHighlightedEdges(new Set());
    };

    return (
        <div
            ref={scrollContainerRef}
            style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', padding: '10px' }}
        >
            <svg
                ref={svgRef}
                width={svgWidth}
                height={svgHeight}
                className="tube-map"
                style={{ minWidth: '100%', cursor: dragStartId ? 'grabbing' : 'default' }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
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

                    const key = [edge.u, edge.v].sort().join('<->');
                    const isHighlighted = highlightedEdges.has(key);

                    return (
                        <g key={`edge-${idx}`}>
                            {/* Outer glow/stroke for visited */}
                            {/* Main Stroke */}
                            <line
                                x1={uX} y1={uY} x2={vX} y2={vY}
                                stroke={isHighlighted ? '#FF5733' : getEdgeColor(edge.u, edge.v)}
                                strokeWidth={isHighlighted ? 10 : getStrokeWidth(edge.u, edge.v)}
                                strokeOpacity={isHighlighted ? 0.8 : getEdgeOpacity(edge.u, edge.v)}
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

                    // Highlight if start of drag or current target
                    const isDragStart = dragStartId === pos.id;
                    const isDragTarget = dragTargetId === pos.id;
                    const inPath = (isDragTarget || isDragStart); // Simple highlight for endpoints

                    return (
                        <g
                            key={pos.id}
                            className="station-node"
                            onClick={() => {
                                const realName = nodes.get(pos.id)?.name;
                                if (realName && onStationClick) onStationClick(realName);
                            }}
                            onMouseDown={(e) => handleStationMouseDown(e, pos.id)}
                            onMouseUp={(e) => handleStationMouseUp(e, pos.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Station Dot */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r={pos.isJunction ? (inPath ? 12 : 8) : (isVisited ? (inPath ? 10 : 6) : (inPath ? 9 : 5))}
                                fill="white"
                                stroke={inPath ? "#FF5733" : (isVisited ? '#2ecc71' : lineColor)}
                                strokeWidth={inPath ? 5 : (isVisited ? 3 : 2)}
                            />

                            {/* Station Name Label */}
                            <text
                                x={cx}
                                y={cy + 15}
                                transform={`rotate(45, ${cx}, ${cy + 15})`}
                                fontSize="12"
                                fontWeight={isVisited || inPath ? "bold" : "normal"}
                                fill={isVisited || inPath ? (inPath ? "#FF5733" : "#2ecc71") : "#333"}
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

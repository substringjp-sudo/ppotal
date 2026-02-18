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
    onDragUpdate?: (waypoints: string[]) => void;
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
    onPathCreate,
    onDragUpdate
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
            const direction = bIdx % 2 === 0 ? 1 : -1;

            let prevId = junctionId;
            let currentX = junctionPos.x;
            let currentY = junctionPos.y;

            branch.path.forEach((stationId, idx) => {
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
        return '#333';
    }, [lineId]);

    const [dragStartId, setDragStartId] = React.useState<string | null>(null);
    const [dragCurrentPt, setDragCurrentPt] = React.useState<{ x: number, y: number } | null>(null);
    const [dragTargetId, setDragTargetId] = React.useState<string | null>(null);
    const [highlightedEdges, setHighlightedEdges] = React.useState<Set<string>>(new Set());

    const svgRef = React.useRef<SVGSVGElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const animationFrameRef = React.useRef<number | undefined>(undefined);
    const scrollVelocityRef = React.useRef<number>(0);

    // Helper to get edge color
    const getEdgeColor = (u: string, v: string) => {
        const uNode = nodes.get(u);
        const vNode = nodes.get(v);
        if (!uNode || !vNode) return lineColor;

        const edgeKey = [u, v].sort().join('<->');
        if (highlightedEdges.has(edgeKey)) return '#FF5733'; // Orange for dragging

        const key = [uNode.name, vNode.name].sort().join('<->');
        return visitedEdges.has(key) ? '#2ecc71' : lineColor; // Green if visited, else line color
    };

    const getEdgeOpacity = (u: string, v: string) => {
        const uNode = nodes.get(u);
        const vNode = nodes.get(v);
        if (!uNode || !vNode) return 0.4;

        const edgeKey = [u, v].sort().join('<->');
        if (highlightedEdges.has(edgeKey)) return 1.0;

        const key = [uNode.name, vNode.name].sort().join('<->');
        return visitedEdges.has(key) ? 1.0 : 0.4;
    };

    const getStrokeWidth = (u: string, v: string) => {
        const uNode = nodes.get(u);
        const vNode = nodes.get(v);
        if (!uNode || !vNode) return 6;

        const edgeKey = [u, v].sort().join('<->');
        if (highlightedEdges.has(edgeKey)) return 10;

        const key = [uNode.name, vNode.name].sort().join('<->');
        return visitedEdges.has(key) ? 8 : 6;
    }

    // BFS to find path between two nodes in the topology
    const findPath = (startId: string, endId: string): Set<string> => {
        const queue: Array<{ id: string, path: string[] }> = [{ id: startId, path: [] }];
        const visited = new Set<string>([startId]);

        while (queue.length > 0) {
            const { id, path } = queue.shift()!;
            if (id === endId) return new Set(path);

            // Find neighbors
            edges.forEach(edge => {
                let neighbor: string | null = null;
                if (edge.u === id) neighbor = edge.v;
                else if (edge.v === id) neighbor = edge.u;

                if (neighbor && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    const edgeKey = [id, neighbor].sort().join('<->');
                    queue.push({ id: neighbor, path: [...path, edgeKey] });
                }
            });
        }
        return new Set();
    };

    // Auto-scroll logic
    React.useEffect(() => {
        const loop = () => {
            if (scrollVelocityRef.current !== 0 && scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft += scrollVelocityRef.current;

                // When scrolling, we need to re-find the nearest node based on current cursor
                // because the stations moved relative to the screen.
                if (lastScreenCoordsRef.current && svgRef.current) {
                    const svg = svgRef.current;
                    const pt = svg.createSVGPoint();
                    pt.x = lastScreenCoordsRef.current.x;
                    pt.y = lastScreenCoordsRef.current.y;
                    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                    updateDragTarget(svgP.x, svgP.y);
                }
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [dragStartId, nodePositions, minX, minY]);

    const lastScreenCoordsRef = React.useRef<{ x: number, y: number } | null>(null);

    const updateDragTarget = (svgX: number, svgY: number) => {
        let minDist = Infinity;
        let nearestId: string | null = null;

        nodePositions.forEach((pos, id) => {
            const dx = pos.x + minX - svgX;
            const dy = pos.y + minY - svgY;
            const dist = Math.sqrt(dx * dx + dy * dy);
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

                // Provide real-time feedback to parent
                if (onDragUpdate) {
                    const waypointNames = [];
                    if (nodes.has(dragStartId)) waypointNames.push(nodes.get(dragStartId)!.name);
                    if (nodes.has(nearestId)) waypointNames.push(nodes.get(nearestId)!.name);
                    onDragUpdate(waypointNames);
                }
            }
        }
    };

    const handleDragMove = (clientX: number, clientY: number) => {
        if (!dragStartId) return;
        lastScreenCoordsRef.current = { x: clientX, y: clientY };

        const svg = svgRef.current;
        if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = clientX;
            pt.y = clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            setDragCurrentPt({ x: svgP.x, y: svgP.y });
            updateDragTarget(svgP.x, svgP.y);
        }

        // Calculate scroll velocity
        if (scrollContainerRef.current) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const relX = clientX - rect.left;
            const w = rect.width;
            const threshold = 60; // Slightly larger for mobile/touch
            const speed = 12;

            if (relX < threshold) scrollVelocityRef.current = -speed;
            else if (relX > w - threshold) scrollVelocityRef.current = speed;
            else scrollVelocityRef.current = 0;
        }
    };

    const handleStationMouseDown = (e: React.MouseEvent, stationId: string) => {
        e.stopPropagation();
        setDragStartId(stationId);
        setDragTargetId(stationId);
        setHighlightedEdges(new Set());
        handleDragMove(e.clientX, e.clientY);
    };

    const handleStationTouchStart = (e: React.TouchEvent, stationId: string) => {
        e.stopPropagation();
        // Don't preventDefault here as it might block scrolling if we don't start a drag
        const touch = e.touches[0];
        setDragStartId(stationId);
        setDragTargetId(stationId);
        setHighlightedEdges(new Set());
        handleDragMove(touch.clientX, touch.clientY);
    };

    const handleSvgMouseMove = (e: React.MouseEvent) => {
        handleDragMove(e.clientX, e.clientY);
    };

    const handleSvgTouchMove = (e: React.TouchEvent) => {
        if (!dragStartId) return;
        // If dragging stations, prevent page scroll
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
    };

    const handleSvgMouseUp = () => {
        if (dragStartId && dragTargetId && dragStartId !== dragTargetId) {
            if (onPathCreate) onPathCreate(dragStartId, dragTargetId);
        }
        setDragStartId(null);
        setDragCurrentPt(null);
        setDragTargetId(null);
        setHighlightedEdges(new Set());
        scrollVelocityRef.current = 0;
    };

    const handleSvgTouchEnd = (e: React.TouchEvent) => {
        handleSvgMouseUp();
    };

    const handleStationMouseUp = (e: React.MouseEvent | React.TouchEvent, stationId: string) => {
        e.stopPropagation();
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
                style={{ minWidth: '100%', cursor: dragStartId ? 'grabbing' : 'default', touchAction: 'none' }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onTouchMove={handleSvgTouchMove}
                onTouchEnd={handleSvgTouchEnd}
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
                        <g key={`${edge.u}-${edge.v}-${idx}`}>
                            <line
                                x1={uX}
                                y1={uY}
                                x2={vX}
                                y2={vY}
                                stroke={getEdgeColor(edge.u, edge.v)}
                                strokeWidth={getStrokeWidth(edge.u, edge.v)}
                                strokeOpacity={getEdgeOpacity(edge.u, edge.v)}
                                strokeLinecap="round"
                            />
                        </g>
                    );
                })}

                {/* Render Stations */}
                {Array.from(nodePositions.values()).map((pos, idx) => {
                    const cx = pos.x + minX;
                    const cy = pos.y + minY;
                    const node = nodes.get(pos.id);
                    const name = node ? translateName(node.name, language, 'station') : pos.id.split('::').pop();
                    const isVisited = node ? visitedStations.has(node.name) : false;

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
                            onTouchStart={(e) => handleStationTouchStart(e, pos.id)}
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

                            {/* Station Label */}
                            <text
                                x={cx}
                                y={cy + (pos.branchIndex === 0 ? (idx % 2 === 0 ? 25 : -20) : (pos.branchIndex! % 2 === 0 ? 25 : -20))}
                                textAnchor="middle"
                                style={{
                                    fontSize: inPath ? '12px' : '10px',
                                    fontWeight: inPath || isVisited ? 'bold' : 'normal',
                                    fill: inPath ? '#FF5733' : (isVisited ? '#27ae60' : '#333'),
                                    pointerEvents: 'none',
                                    userSelect: 'none'
                                }}
                            >
                                {name}
                            </text>
                        </g>
                    );
                })}

                {/* Drag preview line */}
                {dragStartId && dragCurrentPt && (
                    <line
                        x1={nodePositions.get(dragStartId)!.x + minX}
                        y1={nodePositions.get(dragStartId)!.y + minY}
                        x2={dragCurrentPt.x}
                        y2={dragCurrentPt.y}
                        stroke="#FF5733"
                        strokeWidth="4"
                        strokeDasharray="8,8"
                        style={{ pointerEvents: 'none' }}
                    />
                )}
            </svg>
        </div>
    );
};

export default TubeMap;

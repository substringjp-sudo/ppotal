import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TopologyNode, TopologyEdge, TopologyLoop } from '../hooks/useLineTopology';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';

interface TubeMapProps {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    adj?: Map<string, Set<string>>;
    nodesById?: Map<string, TopologyNode>;
    edgeInfos?: Map<string, { from: string, to: string, isVisited: boolean }>;
    visitedStations?: Set<string>;
    visitedEdges?: Set<string>;
    lineColor: string;
    onStationClick?: (id: string) => void;
    onPathCreate?: (path: string[]) => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    loops?: TopologyLoop[];
}

const TubeMap: React.FC<TubeMapProps> = ({
    nodes,
    edges,
    adj,
    nodesById,
    lineColor,
    onStationClick,
    onPathCreate,
    scrollContainerRef,
    loops,
}) => {
    const { language } = useI18n();
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const fallbackRef = useRef<HTMLDivElement>(null);
    // scrollContainerRef가 없으면 내부 fallback ref 사용
    const scrollRef = scrollContainerRef ?? fallbackRef;

    const [dragStartNode, setDragStartNode] = useState<string | null>(null);
    const [dragHistory, setDragHistory] = useState<string[]>([]);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
    const [nearestNode, setNearestNode] = useState<string | null>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft += e.deltaX;
            scrollRef.current.scrollTop += e.deltaY;
        }
    };

    const previewPath = dragHistory;

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = xs.length > 0 ? Math.min(...xs) - 40 : 0;
    const maxX = xs.length > 0 ? Math.max(...xs) + 40 : 1000;
    const minY = ys.length > 0 ? Math.min(...ys) - 40 : 0;
    const maxY = ys.length > 0 ? Math.max(...ys) + 120 : 350;

    const svgWidth = Math.max(maxX - minX, 800);
    const svgHeight = maxY - minY;

    const getSvgCoord = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!svgContainerRef.current) return { x: 0, y: 0 };
        const rect = svgContainerRef.current.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('clientX' in e) {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        } else {
            return { x: 0, y: 0 };
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        return { x: minX + x, y: minY + y };
    }, [minX, minY]);

    const handleStart = (nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
        setDragStartNode(nodeId);
        setDragHistory([nodeId]);
        setMousePos(getSvgCoord(e));
    };

    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (dragStartNode) {
            const coord = getSvgCoord(e);
            setMousePos(coord);

            // 1. Find the nearest station to the cursor
            let minDist = 15; // Magnet threshold (previously 30, halved for new layout)
            let found: string | null = null;
            nodes.forEach(n => {
                if (n.isJoint) return;
                const d = Math.sqrt(Math.pow(n.x - coord.x, 2) + Math.pow(n.y - coord.y, 2));
                if (d < minDist) {
                    minDist = d;
                    found = n.id;
                }
            });
            setNearestNode(found);

            // 2. Snake Update Logic
            if (found && found !== dragHistory[dragHistory.length - 1]) {
                const existingIndex = dragHistory.indexOf(found);
                if (existingIndex !== -1) {
                    setDragHistory(prev => prev.slice(0, existingIndex + 1));
                } else if (adj) {
                    const last = dragHistory[dragHistory.length - 1];
                    const queue: [string, string[]][] = [[last, []]];
                    const visited = new Set<string>([last]);
                    let subPath: string[] | null = null;

                    while (queue.length > 0) {
                        const [curr, path] = queue.shift()!;
                        if (curr === found) {
                            subPath = path;
                            break;
                        }
                        const neighbors = adj.get(curr);
                        if (neighbors) {
                            for (const n of neighbors) {
                                if (!visited.has(n)) {
                                    visited.add(n);
                                    queue.push([n, [...path, n]]);
                                }
                            }
                        }
                    }

                    if (subPath && subPath.length > 0) {
                        if (subPath.length <= 15) {
                            setDragHistory(prev => [...prev, ...subPath!]);
                        }
                    }
                }
            }

            // Auto-scroll logic
            if (scrollRef.current) {
                const scrollable = scrollRef.current;
                const scrollRect = scrollable.getBoundingClientRect();
                let clientX: number | undefined;
                if ('clientX' in e) {
                    clientX = (e as MouseEvent).clientX;
                } else if ('touches' in e && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                }

                if (clientX !== undefined) {
                    const threshold = 50;
                    const speed = 15;

                    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);

                    scrollIntervalRef.current = setInterval(() => {
                        if (scrollRef.current && clientX !== undefined) {
                            if (clientX < scrollRect.left + threshold) {
                                scrollRef.current.scrollLeft -= speed;
                            } else if (clientX > scrollRect.right - threshold) {
                                scrollRef.current.scrollLeft += speed;
                            } else {
                                if (scrollIntervalRef.current) {
                                    clearInterval(scrollIntervalRef.current);
                                    scrollIntervalRef.current = null;
                                }
                            }
                        }
                    }, 20);
                }
            }

            if (e.cancelable) e.preventDefault();
        }
    }, [dragStartNode, dragHistory, nodes, adj, getSvgCoord, minX, minY, scrollRef]);

    const handleEnd = (nodeId: string) => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
        if (dragStartNode) {
            const lastNode = dragHistory[dragHistory.length - 1];
            if (dragHistory.length > 1 && (nodeId === lastNode || !nodeId)) {
                onPathCreate?.(dragHistory);
            } else if (dragHistory.length === 1) {
                const node = nodes.find(n => n.id === nodeId);
                if (node && !node.isJoint) {
                    onStationClick?.(node.id);
                }
            }
        }
        setDragStartNode(null);
        setDragHistory([]);
        setMousePos(null);
        setNearestNode(null);
    };

    const handleGlobalEnd = useCallback(() => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
        if (dragStartNode && dragHistory.length > 1) {
            onPathCreate?.(dragHistory);
        }
        setDragStartNode(null);
        setDragHistory([]);
        setMousePos(null);
        setNearestNode(null);
    }, [dragStartNode, dragHistory, onPathCreate]);

    useEffect(() => {
        if (dragStartNode) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('mouseup', handleGlobalEnd);
            window.addEventListener('touchend', handleGlobalEnd);
            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('touchmove', handleMove);
                window.removeEventListener('mouseup', handleGlobalEnd);
                window.removeEventListener('touchend', handleGlobalEnd);
            };
        }
    }, [dragStartNode, handleMove, handleGlobalEnd]);

    const [scrollState, setScrollState] = useState({ left: 0, top: 0, width: 0, height: 0, scrollWidth: 0, scrollHeight: 0 });

    const updateScrollState = useCallback(() => {
        if (scrollRef.current) {
            const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight } = scrollRef.current;
            setScrollState({ left: scrollLeft, top: scrollTop, width: clientWidth, height: clientHeight, scrollWidth, scrollHeight });
        }
    }, [scrollContainerRef]);

    useEffect(() => {
        const container = scrollRef.current;
        if (container) {
            container.addEventListener('scroll', updateScrollState);
            const observer = new ResizeObserver(updateScrollState);
            observer.observe(container);
            updateScrollState();
            return () => {
                if (container) {
                    container.removeEventListener('scroll', updateScrollState);
                }
                observer.disconnect();
            };
        }
    }, [scrollContainerRef, updateScrollState]);

    const showMinimap = scrollState.scrollWidth > scrollState.width * 1.1 || scrollState.scrollHeight > scrollState.height * 1.1;

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const portal = document.getElementById('tube-minimap-portal');
        if (portal) {
            setTimeout(() => setPortalNode(portal), 0);
        }
    }, []);

    const [isMinimapDragging, setIsMinimapDragging] = useState(false);

    const handleMinimapInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const minimap = e.currentTarget as HTMLElement;
        const rect = minimap.getBoundingClientRect();
        let clientX: number | undefined;
        let clientY: number | undefined;

        if ('clientX' in e) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        if (clientX === undefined || clientY === undefined) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const ratioX = x / rect.width;
        const ratioY = y / rect.height;

        if (scrollRef.current) {
            const targetScrollX = ratioX * scrollState.scrollWidth - scrollState.width / 2;
            const targetScrollY = ratioY * scrollState.scrollHeight - scrollState.height / 2;
            scrollRef.current.scrollLeft = targetScrollX;
            scrollRef.current.scrollTop = targetScrollY;
        }
    }, [scrollState, scrollContainerRef]);

    const handleMinimapStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsMinimapDragging(true);
        handleMinimapInteraction(e);
    };

    useEffect(() => {
        if (isMinimapDragging) {
            const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
                const minimap = document.getElementById('tube-minimap');
                if (minimap && scrollRef.current) {
                    const rect = minimap.getBoundingClientRect();
                    let clientX: number;
                    let clientY: number;
                    if ('clientX' in e) {
                        clientX = (e as MouseEvent).clientX;
                        clientY = (e as MouseEvent).clientY;
                    } else {
                        clientX = (e as TouchEvent).touches[0].clientX;
                        clientY = (e as TouchEvent).touches[0].clientY;
                    }
                    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                    const ratioX = x / rect.width;
                    const ratioY = y / rect.height;

                    const targetScrollX = ratioX * scrollState.scrollWidth - scrollState.width / 2;
                    const targetScrollY = ratioY * scrollState.scrollHeight - scrollState.height / 2;
                    scrollRef.current.scrollLeft = targetScrollX;
                    scrollRef.current.scrollTop = targetScrollY;
                }
            };
            const handleGlobalEnd = () => setIsMinimapDragging(false);

            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('touchmove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalEnd);
            window.addEventListener('touchend', handleGlobalEnd);
            return () => {
                window.removeEventListener('mousemove', handleGlobalMove);
                window.removeEventListener('touchmove', handleGlobalMove);
                window.removeEventListener('mouseup', handleGlobalEnd);
                window.removeEventListener('touchend', handleGlobalEnd);
            };
        }
    }, [isMinimapDragging, scrollState, scrollContainerRef]);

    const lastNodeId = dragHistory[dragHistory.length - 1];
    const lastNodeObj = nodes.find(n => n.id === (lastNodeId || dragStartNode));
    const startNodeObj = nodes.find(n => n.id === dragStartNode);

    const drawEdge = (fromNode: TopologyNode, toNode: TopologyNode, key: string, stroke: string, strokeWidth: number, opacity: number, isPreview: boolean = false, dashArray?: string) => {
        if (!fromNode || !toNode) return null;

        // 1. Loop boundaries logic
        if (loops) {
            for (const loop of loops) {
                const fromInLoop = loop.stationIds.has(fromNode.id);
                const toInLoop = loop.stationIds.has(toNode.id);
                if ((fromInLoop && !toInLoop) || (!fromInLoop && toInLoop)) {
                    const loopNode = fromInLoop ? fromNode : toNode;
                    const extNode = fromInLoop ? toNode : fromNode;
                    const mx = (loopNode.x + extNode.x) / 2;
                    const my = (loopNode.y + extNode.y) / 2;
                    const inside = ((mx - loop.cx) / loop.a) ** 2 + ((my - loop.cy) / loop.b) ** 2 < 0.9;
                    if (inside) {
                        const odx = loopNode.x - loop.cx;
                        const ody = loopNode.y - loop.cy;
                        const olen = Math.sqrt(odx ** 2 + ody ** 2) || 1;
                        const cpX = loopNode.x + (odx / olen) * 25;
                        const cpY = loopNode.y + (ody / olen) * 25;
                        const d = `M ${fromNode.x} ${fromNode.y} Q ${cpX} ${cpY} ${toNode.x} ${toNode.y}`;
                        return (
                            <path
                                key={key} d={d} fill="none"
                                stroke={stroke} strokeWidth={strokeWidth}
                                strokeDasharray={dashArray}
                                strokeLinecap="round"
                                style={{ opacity, transition: 'all 0.3s ease', pointerEvents: isPreview ? 'none' : 'auto' }}
                            />
                        );
                    }
                }
            }
        }

        // 2. Row skipping logic
        const ROW_THRESHOLD = 10;
        const skippedNodes = nodes.filter(n =>
            n.id !== fromNode.id && n.id !== toNode.id && !n.isJoint &&
            Math.abs(n.y - fromNode.y) < ROW_THRESHOLD &&
            Math.abs(n.y - toNode.y) < ROW_THRESHOLD &&
            n.x > Math.min(fromNode.x, toNode.x) + 5 &&
            n.x < Math.max(fromNode.x, toNode.x) - 5
        );
        const isSkipping = skippedNodes.length > 0 && Math.abs(fromNode.y - toNode.y) < ROW_THRESHOLD;

        if (isSkipping) {
            const arcHeight = 10 + skippedNodes.length * 6;
            const mx = (fromNode.x + toNode.x) / 2;
            const my = Math.min(fromNode.y, toNode.y) - arcHeight;
            return (
                <path
                    key={key}
                    d={`M ${fromNode.x} ${fromNode.y} Q ${mx} ${my} ${toNode.x} ${toNode.y}`}
                    fill="none" stroke={stroke} strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    style={{ opacity, transition: 'all 0.3s ease', pointerEvents: isPreview ? 'none' : 'auto' }}
                />
            );
        }

        return (
            <line
                key={key}
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x} y2={toNode.y}
                stroke={stroke} strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeLinecap="round"
                style={{ opacity, transition: 'all 0.3s ease', pointerEvents: isPreview ? 'none' : 'auto' }}
            />
        );
    };

    const minimapJsx = (
        <div
            id="tube-minimap"
            style={{
                width: '80px',
                height: '30px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                zIndex: 10,
                overflow: 'hidden',
                cursor: 'move',
                pointerEvents: 'auto',
                userSelect: 'none',
                position: 'relative',
                maxWidth: '100%'
            }}
            onMouseDown={handleMinimapStart}
            onTouchStart={handleMinimapStart}
        >
            <svg
                width="100%"
                height="100%"
                viewBox={`${minX} ${minY} ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ opacity: 0.6 }}
            >
                {edges.map((edge, i) => {
                    const from = nodes.find(n => n.id === edge.from);
                    const to = nodes.find(n => n.id === edge.to);
                    if (!from || !to) return null;
                    return (
                        <line
                            key={`mini-edge-${i}`}
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke={edge.isVisited ? '#2ecc71' : lineColor}
                            strokeWidth={15}
                            strokeLinecap="round"
                        />
                    );
                })}
                {nodes.map(node => {
                    if (node.isJoint) return null;
                    return (
                        <circle
                            key={`mini-node-${node.id}`}
                            cx={node.x} cy={node.y} r={10}
                            fill={node.isVisited ? '#2ecc71' : '#fff'}
                            stroke={node.isVisited ? '#2ecc71' : lineColor}
                            strokeWidth={4}
                        />
                    );
                })}
            </svg>
            <div style={{
                position: 'absolute',
                top: `${(scrollState.top / scrollState.scrollHeight) * 100}%`,
                left: `${(scrollState.left / scrollState.scrollWidth) * 100}%`,
                width: `${(scrollState.width / scrollState.scrollWidth) * 100}%`,
                height: `${(scrollState.height / scrollState.scrollHeight) * 100}%`,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                border: '1.5px solid rgba(52, 152, 219, 0.5)',
                borderRadius: '2px',
                pointerEvents: 'none'
            }} />
        </div>
    );

    return (
        <div
            ref={svgContainerRef}
            onMouseMove={handleMove}
            onTouchMove={handleMove}
            onWheel={handleWheel}
            style={{
                cursor: dragStartNode ? 'grabbing' : 'default',
                userSelect: 'none',
                width: svgWidth,
                height: svgHeight,
            }}
        >
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`${minX} ${minY} ${svgWidth} ${svgHeight}`}
                style={{
                    display: 'block',
                    pointerEvents: 'auto'
                }}
            >
                <defs>
                    <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                </defs>

                {edges.map((edge, i) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const stroke = edge.isVisited ? '#2ecc71' : lineColor;
                    const strokeWidth = edge.isVisited ? 3 : 1.5;
                    const opacity = edge.isVisited ? 1.0 : 0.3;

                    return drawEdge(fromNode, toNode, `edge-${i}`, stroke, strokeWidth, opacity);
                })}


                {dragStartNode && previewPath.length > 1 && nodesById && (
                    <g style={{ pointerEvents: 'none' }}>
                        {previewPath.map((nodeId: string, idx: number) => {
                            if (idx === 0) return null;
                            const from = nodesById.get(previewPath[idx - 1]);
                            const to = nodesById.get(nodeId);
                            if (!from || !to) return null;
                            return drawEdge(from, to, `preview-${idx}`, "#007AFF", 2.5, 1.0, true);
                        })}
                    </g>
                )}

                {dragStartNode && lastNodeObj && mousePos && (
                    <g style={{ pointerEvents: 'none' }}>
                        {/* Guideline from the last captured node to the cursor (or potential next node) */}
                        {nearestNode && nearestNode !== lastNodeObj.id && nodesById?.get(nearestNode) ? (() => {
                            const nextNode = nodesById.get(nearestNode)!;
                            // Check if they are direct neighbors in the current topology
                            const isNeighbor = adj?.get(lastNodeObj.id)?.has(nearestNode);
                            return (
                                <>
                                    {/* Preview connection - use curved edge if neighbors */}
                                    {isNeighbor ?
                                        drawEdge(lastNodeObj, nextNode, 'preview-guide-connect', "#007AFF", 2.5, 0.6, true, '4,2') :
                                        <line x1={lastNodeObj.x} y1={lastNodeObj.y} x2={nextNode.x} y2={nextNode.y} stroke="#007AFF" strokeWidth={1} strokeDasharray="4,2" />
                                    }
                                    {/* Line from potential node to current mouse */}
                                    <line
                                        x1={nextNode.x} y1={nextNode.y}
                                        x2={mousePos.x} y2={mousePos.y}
                                        stroke="#007AFF" strokeWidth={1} strokeDasharray="2,2" strokeLinecap="round"
                                    />
                                </>
                            );
                        })() : (
                            <line
                                x1={lastNodeObj.x} y1={lastNodeObj.y}
                                x2={mousePos.x} y2={mousePos.y}
                                stroke="#007AFF" strokeWidth={1.5} strokeDasharray="4,2" strokeLinecap="round"
                            />
                        )}
                    </g>
                )}

                {nodes.map((node) => {
                    const isSelected = dragStartNode === node.id;
                    if (node.isJoint) return null;

                    return (
                        <g
                            key={node.id}
                            onMouseDown={(e) => handleStart(node.id, e)}
                            onTouchStart={(e) => handleStart(node.id, e)}
                            onMouseUp={() => handleEnd(node.id)}
                            onTouchEnd={() => handleEnd(node.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle cx={node.x} cy={node.y} r={12} fill="transparent" />
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 3.5 : 2.5}
                                fill="#ffffff"
                                filter="url(#nodeShadow)"
                                style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            />
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 3.5 : 2.5}
                                fill="none"
                                stroke={node.isVisited ? '#2ecc71' : lineColor}
                                strokeWidth={1}
                                style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            />
                            {node.isVisited && <circle cx={node.x} cy={node.y} r={1.5} fill="#2ecc71" />}
                            <text
                                x={node.x} y={node.y + 7.5}
                                textAnchor="middle"
                                style={{
                                    fontSize: '8px', fontWeight: '900', fill: '#0f172a',
                                    userSelect: 'none', paintOrder: 'stroke',
                                    stroke: '#ffffff', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round'
                                }}
                            >
                                <tspan x={node.x} dy="0">{getLocalizedName(node, language)}</tspan>
                                {language !== 'ja' && (
                                    <tspan x={node.x} dy="6" style={{ fontSize: '5px', fontWeight: '700', fill: '#64748b', opacity: 0.9 }}>
                                        {node.name}
                                    </tspan>
                                )}
                            </text>
                        </g>
                    );
                })}
            </svg>
            {showMinimap && portalNode && createPortal(minimapJsx, portalNode)}
        </div>
    );
};

TubeMap.displayName = 'TubeMap';
export default TubeMap;

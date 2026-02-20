import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TopologyNode, TopologyEdge } from '../hooks/useLineTopology';
import { Language } from '../lib/translations';


interface TubeMapProps {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    visitedStations?: Set<string>;
    visitedEdges?: Set<string>;
    lineColor: string;
    onStationClick?: (id: string) => void;
    onPathCreate?: (startId: string, endId: string) => void;
    language: Language;
}

const TubeMap: React.FC<TubeMapProps> = ({
    nodes,
    edges,
    visitedStations,
    visitedEdges,
    lineColor,
    onStationClick,
    onPathCreate,
    language
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragStartNode, setDragStartNode] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    // Calculate bounds with padding
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = xs.length > 0 ? Math.min(...xs) - 100 : 0;
    const maxX = xs.length > 0 ? Math.max(...xs) + 100 : 1000;
    const minY = ys.length > 0 ? Math.min(...ys) - 100 : 0;
    const maxY = ys.length > 0 ? Math.max(...ys) + 100 : 350;

    const svgWidth = Math.max(maxX - minX, 800);
    const svgHeight = Math.max(maxY - minY, 400);

    const getSvgCoord = useCallback((e: any) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Pixel coordinates within the content (accounting for scroll)
        const x = clientX - rect.left + containerRef.current.scrollLeft;
        const y = clientY - rect.top + containerRef.current.scrollTop;

        // Map pixel coord to viewBox coord
        // Since svgWidth/Height are the pixel dimensions of the SVG and viewBox is minX/minY/svgWidth/svgHeight
        // SVG Coord = ViewBoxStart + PixelOffset
        return { x: minX + x, y: minY + y };
    }, [minX, minY]);

    const handleStart = (nodeId: string, e: any) => {
        // Only trigger drag for non-joint nodes or if we want to allow joint selection
        setDragStartNode(nodeId);
        setMousePos(getSvgCoord(e));
        // We don't stop propagation here to allow potential scrolling if drag doesn't move much
    };

    const handleMove = (e: any) => {
        if (dragStartNode) {
            setMousePos(getSvgCoord(e));
            if (e.cancelable) e.preventDefault(); // Prevent scroll while dragging
        }
    };

    const handleEnd = (nodeId: string, e: any) => {
        if (dragStartNode) {
            if (dragStartNode !== nodeId) {
                onPathCreate?.(dragStartNode, nodeId);
            } else {
                const node = nodes.find(n => n.id === nodeId);
                if (node && !node.isJoint) {
                    onStationClick?.(node.id);
                }
            }
        }
        setDragStartNode(null);
        setMousePos(null);
    };

    const handleGlobalEnd = () => {
        setDragStartNode(null);
        setMousePos(null);
    };

    useEffect(() => {
        if (dragStartNode) {
            window.addEventListener('mouseup', handleGlobalEnd);
            window.addEventListener('touchend', handleGlobalEnd);
            return () => {
                window.removeEventListener('mouseup', handleGlobalEnd);
                window.removeEventListener('touchend', handleGlobalEnd);
            };
        }
    }, [dragStartNode]);

    const startNodeObj = nodes.find(n => n.id === dragStartNode);

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMove}
            onTouchMove={handleMove}
            style={{
                width: '100%',
                height: '400px',
                overflow: 'auto',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                WebkitOverflowScrolling: 'touch',
                cursor: dragStartNode ? 'grabbing' : 'default',
                userSelect: 'none'
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
                    <linearGradient id="visitedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2ecc71" />
                        <stop offset="100%" stopColor="#27ae60" />
                    </linearGradient>
                </defs>

                {/* 1. Edges */}
                {edges.map((edge, i) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    return (
                        <line
                            key={`edge-${i}`}
                            x1={fromNode.x}
                            y1={fromNode.y}
                            x2={toNode.x}
                            y2={toNode.y}
                            stroke={edge.isVisited ? 'url(#visitedGradient)' : lineColor}
                            strokeWidth={edge.isVisited ? 12 : 6}
                            strokeLinecap="round"
                            style={{
                                opacity: edge.isVisited ? 1 : 0.3,
                                transition: 'all 0.3s ease'
                            }}
                        />
                    );
                })}

                {/* 2. Drag feedback line */}
                {dragStartNode && startNodeObj && mousePos && (
                    <line
                        x1={startNodeObj.x}
                        y1={startNodeObj.y}
                        x2={mousePos.x}
                        y2={mousePos.y}
                        stroke="#FF5733"
                        strokeWidth={4}
                        strokeDasharray="8,4"
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* 3. Nodes */}
                {nodes.map((node) => {
                    const isSelected = dragStartNode === node.id;
                    if (node.isJoint) {
                        return (
                            <circle
                                key={node.id}
                                cx={node.x}
                                cy={node.y}
                                r={5}
                                fill={lineColor}
                                style={{ opacity: 0.5 }}
                            />
                        );
                    }

                    return (
                        <g
                            key={node.id}
                            onMouseDown={(e) => handleStart(node.id, e)}
                            onTouchStart={(e) => handleStart(node.id, e)}
                            onMouseUp={(e) => handleEnd(node.id, e)}
                            onTouchEnd={(e) => handleEnd(node.id, e)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Larger Hit Area */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={25}
                                fill="transparent"
                            />

                            {/* Outer Circle (White Background) */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 14 : 10}
                                fill="#ffffff"
                                filter="url(#nodeShadow)"
                                style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            />

                            {/* Border Circle */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? 14 : 10}
                                fill="none"
                                stroke={node.isVisited ? '#2ecc71' : lineColor}
                                strokeWidth={4}
                                style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            />

                            {/* Inner Dot for Visited */}
                            {node.isVisited && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={5}
                                    fill="#2ecc71"
                                />
                            )}

                            {/* Label */}
                            <text
                                x={node.x}
                                y={node.y + 35}
                                textAnchor="middle"
                                style={{
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    fill: '#2c3e50',
                                    userSelect: 'none',
                                    paintOrder: 'stroke',
                                    stroke: '#ffffff',
                                    strokeWidth: 4,
                                    strokeLinecap: 'round',
                                    strokeLinejoin: 'round'
                                }}
                            >
                                {language === 'en' && node.name_en ? node.name_en : node.name}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TubeMap;

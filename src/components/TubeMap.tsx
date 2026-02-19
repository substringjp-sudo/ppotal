import React, { useState, useRef, useEffect } from 'react';
import { TopologyNode, TopologyEdge } from '../hooks/useLineTopology';
import { Language } from '../lib/translations';
import { translateName } from '../lib/lineUtils';

interface TubeMapProps {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    visitedStations: Set<string>;
    visitedEdges: Set<string>;
    lineColor: string;
    onStationClick?: (stationName: string) => void;
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
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // 가로로 긴 노선도를 위해 노드들의 X 범위를 계산하여 스크롤 가능하게 함
    const minX = Math.min(...nodes.map(n => n.x), 0);
    const maxX = Math.max(...nodes.map(n => n.x), 1000);
    const minY = Math.min(...nodes.map(n => n.y), 0);
    const maxY = Math.max(...nodes.map(n => n.y), 300);

    const handleNodeClick = (node: TopologyNode) => {
        if (!node.isJoint) {
            onStationClick?.(node.name);
        }

        if (selectedNode && selectedNode !== node.id) {
            onPathCreate?.(selectedNode, node.id);
            setSelectedNode(null);
        } else {
            setSelectedNode(node.id);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '350px',
                overflowX: 'auto',
                overflowY: 'hidden',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #eee',
                position: 'relative'
            }}
        >
            <svg
                width={maxX - minX + 200}
                height={maxY - minY + 100}
                style={{ cursor: 'crosshair' }}
            >
                {/* 1. Draw Edges */}
                {edges.map((edge, i) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    return (
                        <line
                            key={`edge-${i}`}
                            x1={fromNode.x - minX + 50}
                            y1={fromNode.y - minY + 50}
                            x2={toNode.x - minX + 50}
                            y2={toNode.y - minY + 50}
                            stroke={edge.isVisited ? '#2ecc71' : lineColor}
                            strokeWidth={edge.isVisited ? 8 : 5}
                            strokeLinecap="round"
                            style={{ opacity: edge.isVisited ? 1 : 0.4 }}
                        />
                    );
                })}

                {/* 2. Draw Nodes */}
                {nodes.map((node) => {
                    const isSelected = selectedNode === node.id;
                    if (node.isJoint) {
                        return (
                            <circle
                                key={node.id}
                                cx={node.x - minX + 50}
                                cy={node.y - minY + 50}
                                r={3}
                                fill={lineColor}
                                style={{ opacity: 0.5 }}
                            />
                        );
                    }

                    return (
                        <g
                            key={node.id}
                            onClick={() => handleNodeClick(node)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle
                                cx={node.x - minX + 50}
                                cy={node.y - minY + 50}
                                r={isSelected ? 10 : 7}
                                fill="#ffffff"
                                stroke={node.isVisited ? '#2ecc71' : lineColor}
                                strokeWidth={3}
                            />
                            {isSelected && (
                                <circle
                                    cx={node.x - minX + 50}
                                    cy={node.y - minY + 50}
                                    r={14}
                                    fill="none"
                                    stroke="#FF5733"
                                    strokeWidth={2}
                                    strokeDasharray="4,2"
                                />
                            )}
                            <text
                                x={node.x - minX + 50}
                                y={node.y - minY + 75}
                                textAnchor="middle"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    fill: '#333',
                                    userSelect: 'none'
                                }}
                            >
                                {translateName(node.name, language, 'station')}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TubeMap;

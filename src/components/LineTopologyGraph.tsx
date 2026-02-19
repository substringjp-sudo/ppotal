"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Network, Options, Node, Edge } from 'vis-network';
import { DataSet } from 'vis-data';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';
import { getOfficialColor } from '../lib/lineColors';

interface LineTopologyGraphProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedStations: Set<string>;
    visitedEdges: Set<string>;
    onStationClick?: (stationName: string) => void;
    language: Language;
    onPathCreate?: (startId: string, endId: string) => void;
}

const LineTopologyGraph: React.FC<LineTopologyGraphProps> = ({
    lineId,
    segments,
    nodes,
    visitedStations,
    visitedEdges,
    onStationClick,
    language,
    onPathCreate
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);

    const lineColor = useMemo(() => {
        const official = getOfficialColor(lineId);
        return official || '#3498db';
    }, [lineId]);

    useEffect(() => {
        if (!containerRef.current || !segments) return;

        // 1. Prepare Data
        const seenNodes = new Set<string>();
        const seenEdges = new Set<string>();

        const visNodes: Node[] = [];
        const visEdges: Edge[] = [];

        segments.forEach(seg => {
            seg.edges.forEach(edge => {
                // Add Nodes
                [edge.from, edge.to].forEach(id => {
                    if (!seenNodes.has(id)) {
                        seenNodes.add(id);
                        const nodeData = nodes.get(id);
                        const isJoint = id.startsWith('J_');

                        if (!isJoint) {
                            const name = nodeData ? translateName(nodeData.name, language, 'station') : id;
                            const isVisited = nodeData ? visitedStations.has(nodeData.name) : false;

                            visNodes.push({
                                id,
                                label: name,
                                color: {
                                    background: '#ffffff',
                                    border: isVisited ? '#2ecc71' : lineColor,
                                    highlight: {
                                        background: '#ffffff',
                                        border: '#FF5733'
                                    }
                                },
                                borderWidth: isVisited ? 4 : 2,
                                shape: 'dot',
                                size: 12,
                                font: {
                                    size: 14,
                                    face: 'Inter, system-ui, sans-serif',
                                    strokeWidth: 4,
                                    strokeColor: '#ffffff'
                                }
                            });
                        } else {
                            // Invisible/Small joint nodes
                            visNodes.push({
                                id,
                                shape: 'dot',
                                size: 2,
                                color: lineColor,
                                label: undefined
                            });
                        }
                    }
                });

                // Add Edge
                const edgeKey = [edge.from, edge.to].sort().join('<->');
                if (!seenEdges.has(edgeKey)) {
                    seenEdges.add(edgeKey);
                    const isVisited = visitedEdges.has(edgeKey);

                    visEdges.push({
                        id: edgeKey,
                        from: edge.from,
                        to: edge.to,
                        color: {
                            color: isVisited ? '#2ecc71' : lineColor,
                            highlight: '#FF5733',
                            opacity: isVisited ? 1.0 : 0.4
                        },
                        width: isVisited ? 6 : 4,
                        smooth: false
                    });
                }
            });
        });

        // 2. Network Options
        // 2. Network Options
        const options: Options = {
            nodes: {
                font: {
                    multi: true
                }
            },
            edges: {
                arrows: {
                    to: { enabled: false }
                },
                smooth: {
                    enabled: true,
                    type: 'continuous',
                    roundness: 0.5
                }
            },
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 80,
                    springConstant: 0.08,
                    damping: 0.4,
                    avoidOverlap: 1
                },
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 25
                }
            },
            interaction: {
                hover: true,
                dragNodes: true,
                zoomView: true,
                dragView: true
            }
        };

        // 3. Initialize Network
        const data = {
            nodes: new DataSet(visNodes),
            edges: new DataSet(visEdges)
        };

        const network = new Network(containerRef.current, data, options);
        networkRef.current = network;

        // 4. Events
        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const nodeData = nodes.get(nodeId);
                if (nodeData && !nodeId.startsWith('J_')) {
                    onStationClick?.(nodeData.name);
                }
            }
        });

        // Path creation via double selection or similar?
        // Let's keep it simple for now: select two nodes to create path.
        let selectedNodes: string[] = [];
        network.on('selectNode', (params) => {
            selectedNodes = params.nodes;
            if (selectedNodes.length === 2) {
                onPathCreate?.(selectedNodes[0], selectedNodes[1]);
                // network.unselectAll();
            }
        });

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [segments, visitedStations, visitedEdges, language, lineColor, nodes]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '450px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #eee',
                overflow: 'hidden'
            }}
        />
    );
};

export default React.memo(LineTopologyGraph);

import { useMemo } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';

export interface TopologyNode {
    id: string;
    name: string;
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

export interface TopologySegment {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
}

export function useLineTopology(
    lineId: string,
    segments: LineSegment[],
    nodes: Map<string, StationNode>,
    visitedStations: Set<string>,
    visitedEdges: Set<string>
) {
    return useMemo(() => {
        if (!segments || segments.length === 0) return { nodes: [], edges: [] };

        const topoNodes = new Map<string, TopologyNode>();
        const topoEdges: TopologyEdge[] = [];

        // Basic layout logic: try to align segments linearly
        // This is a simplified version of the original TubeMap logic
        let currentX = 50;
        const spacing = 100;
        const processedNodes = new Set<string>();

        segments.forEach((seg, segIdx) => {
            let segY = 50 + (segIdx * 80);
            let segX = currentX;

            seg.edges.forEach((edge, edgeIdx) => {
                const nodeIds = [edge.from, edge.to];

                nodeIds.forEach((id, idx) => {
                    if (!topoNodes.has(id)) {
                        const nodeData = nodes.get(id);
                        const isJoint = id.startsWith('J_');
                        const isVisited = !isJoint && nodeData ? visitedStations.has(nodeData.name) : false;

                        // Heuristic: move X for each node in a segment
                        const xPos = segX + (idx + edgeIdx) * spacing;

                        topoNodes.set(id, {
                            id,
                            name: nodeData?.name || id,
                            x: xPos,
                            y: segY,
                            isJoint,
                            isVisited
                        });
                        processedNodes.add(id);
                    }
                });

                const edgeKey = [edge.from, edge.to].sort().join('<->');
                topoEdges.push({
                    from: edge.from,
                    to: edge.to,
                    isVisited: visitedEdges.has(edgeKey)
                });
            });
        });

        return {
            nodes: Array.from(topoNodes.values()),
            edges: topoEdges
        };
    }, [segments, nodes, visitedStations, visitedEdges]);
}

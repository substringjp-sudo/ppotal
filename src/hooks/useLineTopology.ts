import { useMemo } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';

export interface TopologyNode {
    id: string;
    name: string;
    name_en?: string;
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

export function useLineTopology(
    lineId: string,
    segments: LineSegment[],
    nodes: Map<string, StationNode>,
    visitedStations: Set<string>,
    visitedEdges: Set<string>
) {
    return useMemo(() => {
        if (!segments || segments.length === 0) return { nodes: [], edges: [] };

        const adj = new Map<string, Set<string>>();
        const edgeInfos = new Map<string, { from: string, to: string, isVisited: boolean }>();

        // 1. Build Adjacency List
        segments.forEach(seg => {
            seg.edges.forEach(edge => {
                if (!adj.has(edge.from)) adj.set(edge.from, new Set());
                if (!adj.has(edge.to)) adj.set(edge.to, new Set());
                adj.get(edge.from)!.add(edge.to);
                adj.get(edge.to)!.add(edge.from);

                const edgeKey = [edge.from, edge.to].sort().join('<->');
                edgeInfos.set(edgeKey, {
                    from: edge.from,
                    to: edge.to,
                    isVisited: visitedEdges.has(edgeKey)
                });
            });
        });

        const topoNodes = new Map<string, TopologyNode>();
        const processedNodes = new Set<string>();

        // 2. Find starting points (nodes with degree 1 or the first node encountered)
        const roots = Array.from(adj.keys()).filter(id => adj.get(id)!.size === 1);
        const startNode = roots.length > 0 ? roots[0] : Array.from(adj.keys())[0];

        // 3. BFS/DFS to layout nodes linearly
        // We use a queue-based approach but with Y-level tracking for branches
        const queue: { id: string, x: number, y: number }[] = [{ id: startNode, x: 50, y: 150 }];

        const spacingY = 80;

        while (queue.length > 0) {
            const { id, x, y } = queue.shift()!;
            if (processedNodes.has(id)) continue;
            processedNodes.add(id);

            const nodeData = nodes.get(id);
            const isJoint = id.startsWith('J_');

            topoNodes.set(id, {
                id,
                name: nodeData?.name || id,
                name_en: nodeData?.name_en,
                x,
                y,
                isJoint,
                isVisited: !isJoint && nodeData ? visitedStations.has(id) : false
            });

            const neighbors = Array.from(adj.get(id) || []).filter(n => !processedNodes.has(n));

            // To keep it as straight as possible, the FIRST neighbor continues the same Y level
            // Subsequent neighbors (branches) get different Y offsets.
            neighbors.forEach((neighborId, idx) => {
                const nextIsJoint = neighborId.startsWith('J_');
                const currentIsJoint = id.startsWith('J_');
                const effectiveSpacingX = (currentIsJoint || nextIsJoint) ? 60 : 120;

                const nextY = idx === 0 ? y : y + (idx % 2 === 0 ? -(idx / 2) : Math.ceil(idx / 2)) * spacingY;
                queue.push({ id: neighborId, x: x + effectiveSpacingX, y: nextY });
            });
        }

        // 4. Fill in any disconnected components (unlikely for a single line but good for robustness)
        Array.from(adj.keys()).forEach(id => {
            if (!processedNodes.has(id)) {
                // Find local root for this component
                const q = [{ id, x: 50, y: 300 + (topoNodes.size * 20) }];
                while (q.length > 0) {
                    const curr = q.shift()!;
                    if (processedNodes.has(curr.id)) continue;
                    processedNodes.add(curr.id);

                    const nodeData = nodes.get(curr.id);
                    const isJoint = curr.id.startsWith('J_');
                    topoNodes.set(curr.id, {
                        id: curr.id,
                        name: nodeData?.name || curr.id,
                        name_en: nodeData?.name_en,
                        x: curr.x,
                        y: curr.y,
                        isJoint,
                        isVisited: !isJoint && nodeData ? visitedStations.has(curr.id) : false
                    });

                    const neighbors = Array.from(adj.get(curr.id) || []).filter(n => !processedNodes.has(n));
                    neighbors.forEach((nId, idx) => {
                        const nextIsJoint = nId.startsWith('J_');
                        const currentIsJoint = curr.id.startsWith('J_');
                        const effectiveSpacingX = (currentIsJoint || nextIsJoint) ? 60 : 120;

                        const nextY = idx === 0 ? curr.y : curr.y + spacingY;
                        q.push({ id: nId, x: curr.x + effectiveSpacingX, y: nextY });
                    });
                }
            }
        });

        return {
            nodes: Array.from(topoNodes.values()),
            edges: Array.from(edgeInfos.values()),
            adj,
            nodesById: topoNodes,
            edgeInfos
        };
    }, [segments, nodes, visitedStations, visitedEdges]);
}

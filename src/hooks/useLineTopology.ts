import { useMemo } from 'react';

export interface TopologySegment {
    stations: string[];
    edges: { from: string, to: string, distance: number }[];
}

export interface GeneratedTopology {
    type: string;
    main_line: string[];
    branches: Array<{ junction: string, path: string[] }>;
}

export const useLineTopology = (segments: TopologySegment[] | undefined) => {
    return useMemo(() => {
        if (!segments || segments.length === 0) return [];

        let unprocessedSegments = [...segments];
        const topologies: GeneratedTopology[] = [];

        while (unprocessedSegments.length > 0) {
            // 1. Sort remaining segments by length logic
            unprocessedSegments.sort((a, b) => b.stations.length - a.stations.length);
            const mainSegment = unprocessedSegments[0];

            // Remove main segment from pool
            unprocessedSegments.shift();

            const mainLine = mainSegment.stations;
            const processedStations = new Set<string>(mainLine);
            const branches: Array<{ junction: string, path: string[] }> = [];

            // 2. Iteratively attach remaining segments as branches
            let changed = true;
            while (changed) {
                changed = false;
                const nextUnprocessed: TopologySegment[] = [];

                for (const seg of unprocessedSegments) {
                    const stations = seg.stations;
                    if (stations.length === 0) continue;

                    const startNode = stations[0];
                    const endNode = stations[stations.length - 1];

                    const startConnected = processedStations.has(startNode);
                    const endConnected = processedStations.has(endNode);

                    if (startConnected) {
                        const path = stations.slice(1);
                        if (path.length > 0) {
                            branches.push({ junction: startNode, path });
                            path.forEach(s => processedStations.add(s));
                            changed = true;
                        }
                    } else if (endConnected) {
                        const path = stations.slice(0, stations.length - 1).reverse();
                        if (path.length > 0) {
                            branches.push({ junction: endNode, path });
                            path.forEach(s => processedStations.add(s));
                            changed = true;
                        }
                    } else {
                        nextUnprocessed.push(seg);
                    }
                }
                unprocessedSegments = nextUnprocessed;
            }

            topologies.push({
                type: 'generated',
                main_line: mainLine,
                branches
            });
        }

        return topologies;
    }, [segments]);
};

import { useState, useMemo, useEffect } from 'react';
import { RailroadGraph } from '../lib/graphUtils';
import { normalizeKey } from '../lib/lineUtils';

export const useRailroadGraph = (railroadNetwork: any, recordedTrips: any[]) => {
    const [graph, setGraph] = useState<RailroadGraph | null>(null);
    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!railroadNetwork) return;
        setGraph(new RailroadGraph(railroadNetwork));
    }, [railroadNetwork]);

    const lineIdMap = useMemo(() => {
        if (!railroadNetwork) return new Map<string, string>();
        const map = new Map<string, string>();
        railroadNetwork.routes.forEach((route: any) => {
            map.set(route.id, `${route.company}::${route.line}`);
        });
        return map;
    }, [railroadNetwork]);

    // Calculate Lengths
    useEffect(() => {
        if (!railroadNetwork) return;
        const rounded: Record<string, number> = {};
        railroadNetwork.routes.forEach((route: any) => {
            let total = 0;
            route.edges.forEach((edge: any) => total += edge.distance);
            const fullId = `${route.company}::${route.line}`;
            rounded[normalizeKey(fullId)] = Math.round(total * 10) / 10;
        });
        setLineLengths(rounded);
    }, [railroadNetwork]);

    // Calculate Visited Lengths
    const visitedLineLengths = useMemo(() => {
        if (!railroadNetwork || !recordedTrips) return {};

        const visitedPerLine: Record<string, Set<string>> = {};
        const visitedDistances: Record<string, number> = {};

        recordedTrips.forEach(trip => {
            if (!trip.path || !trip.geometries) return;

            for (let i = 0; i < trip.path.length - 1; i++) {
                const uId = trip.path[i];
                const vId = trip.path[i + 1];

                const partsU = uId.split('::');
                const partsV = vId.split('::');

                if (partsU.length < 3 || partsV.length < 3) continue;

                const companyU = partsU[0];
                const lineU = partsU[1];
                const stationU = partsU[2];
                const companyV = partsV[0];
                const lineV = partsV[1];
                const stationV = partsV[2];

                if (companyU === companyV && lineU === lineV) {
                    const simplifiedKey = `${companyU}::${lineU}`;
                    const lineKey = lineIdMap.get(simplifiedKey) || simplifiedKey;

                    if (!visitedPerLine[lineKey]) visitedPerLine[lineKey] = new Set();

                    const edgeId = [stationU, stationV].sort().join('<->');

                    if (!visitedPerLine[lineKey].has(edgeId)) {
                        visitedPerLine[lineKey].add(edgeId);

                        const route = railroadNetwork.routes.find((r: any) => r.id === simplifiedKey);
                        if (route) {
                            const edge = route.edges.find((e: any) =>
                                (e.from === uId && e.to === vId) || (e.from === vId && e.to === uId)
                            );
                            if (edge) {
                                visitedDistances[lineKey] = (visitedDistances[lineKey] || 0) + edge.distance;
                            }
                        }
                    }
                }
            }
        });

        const roundedVisited: Record<string, number> = {};
        Object.entries(visitedDistances).forEach(([key, dist]) => {
            const normalizedKey = normalizeKey(key);
            roundedVisited[normalizedKey] = Math.round(dist * 10) / 10;
        });
        return roundedVisited;
    }, [recordedTrips, railroadNetwork, lineIdMap]);

    return {
        graph,
        lineIdMap,
        lineLengths,
        visitedLineLengths
    };
};

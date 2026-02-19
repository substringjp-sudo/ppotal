import { useState, useMemo, useEffect } from 'react';
import { RailroadGraph } from '../lib/graphUtils';
import { RailData } from '../types/railData';
import { normalizeKey } from '../lib/lineUtils';

export const useRailroadGraph = (railData: RailData | any, recordedTrips: any[]) => {

    // 1. Initialize Graph
    const graph = useMemo(() => {
        if (!railData) return null;
        const g = new RailroadGraph();
        // Check for granular data signature
        if (railData.stations && railData.railroadGraph) {
            g.loadFromGranularData(railData as RailData);
        } else if (railData.routes) {
            g.loadFromSystematicJson(railData);
        }
        return g;
    }, [railData]);

    // 2. Line ID Map
    // We can derive this from graph if available, or compute it.
    // graph.lineIdMap is populated during load.
    const lineIdMap = useMemo(() => {
        if (graph) return graph.lineIdMap;
        return new Map<string, string>();
    }, [graph]);

    // 3. Calculate Line Lengths
    const lineLengths = useMemo(() => {
        if (!railData) return {};
        const lengths: Record<string, number> = {};

        if (railData.stations && railData.railroadGraph) {
            // Granular Data
            const data = railData as RailData;
            // Iterate sections to sum lengths per line
            // We need mapping from line_id (number) to "Company::Line" (string)
            // graph.lineNameMap is private/internal

            // Re-create mapping or access from graph if we expose it?
            // Let's re-create mapping to be safe/stand-alone
            const companyNameMap = new Map<number, string>();
            Object.values(data.companies).forEach(c => companyNameMap.set(c.id, c.name));

            const lineNameMap = new Map<number, { name: string, companyId: number }>();
            Object.values(data.lines).forEach(l => lineNameMap.set(l.id, { name: l.name, companyId: l.corp_id }));

            const lineDistances: Record<string, number> = {};

            data.sections.sections.forEach(section => {
                const lInfo = lineNameMap.get(section.line_id);
                if (lInfo) {
                    const cName = companyNameMap.get(lInfo.companyId) || String(lInfo.companyId);
                    const fullId = `${cName}::${lInfo.name}`;
                    lineDistances[fullId] = (lineDistances[fullId] || 0) + (section.length / 1000);
                }
            });

            Object.entries(lineDistances).forEach(([id, dist]) => {
                lengths[normalizeKey(id)] = Math.round(dist * 10) / 10;
            });

        } else if (railData.routes) {
            // Systematic Data
            railData.routes.forEach((route: any) => {
                const fullId = `${route.company}::${route.line}`;
                let total = 0;
                route.edges.forEach((e: any) => total += e.distance);
                lengths[normalizeKey(fullId)] = Math.round(total * 10) / 10;
            });
        }
        return lengths;
    }, [railData]);

    // 4. Calculate Visited Lengths
    const visitedLineLengths = useMemo(() => {
        if (!graph || !recordedTrips) return {};

        const visitedPerLine: Record<string, Set<string>> = {}; // Set of edge IDs (u-v)
        const visitedDistances: Record<string, number> = {};

        recordedTrips.forEach(trip => {
            if (!trip.path) return;

            for (let i = 0; i < trip.path.length - 1; i++) {
                const uId = trip.path[i];
                const vId = trip.path[i + 1];

                // Get edge from graph to identify line
                // graph.adj is Map<string, Edge[]>
                const neighbors = graph.adj.get(uId);
                const edge = neighbors?.find(e => e.to === vId);

                if (edge && edge.lineId) {
                    const lineKey = edge.lineId;

                    if (!visitedPerLine[lineKey]) visitedPerLine[lineKey] = new Set();

                    // Unique edge identifier
                    const edgeId = [uId, vId].sort().join('<->');

                    if (!visitedPerLine[lineKey].has(edgeId)) {
                        visitedPerLine[lineKey].add(edgeId);
                        visitedDistances[lineKey] = (visitedDistances[lineKey] || 0) + edge.distance;
                    }
                }
            }
        });

        const roundedVisited: Record<string, number> = {};
        Object.entries(visitedDistances).forEach(([key, dist]) => {
            roundedVisited[normalizeKey(key)] = Math.round(dist * 10) / 10;
        });
        return roundedVisited;

    }, [graph, recordedTrips]);

    return {
        graph,
        lineIdMap,
        lineLengths,
        visitedLineLengths
    };
};

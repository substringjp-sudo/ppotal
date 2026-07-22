import { RailData, Station, Section } from '../types/railData';

export interface RouteLineInfo {
    id: number;
    name: string;
    name_en?: string;
    name_kr?: string;
    color?: string;
}

export interface CandidateRoute {
    id: string;
    distance: number; // in km
    stationIds: string[];
    stationNames: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    lines: RouteLineInfo[];
    transfers: string[]; // Names of transfer stations
    isShortest?: boolean;
}

export interface RouteSearchResult {
    candidates: CandidateRoute[];
    totalCandidatesCount: number;
    hasTooManyCandidates: boolean;
}

interface PathState {
    currentNode: string;
    visitedNodes: Set<string>;
    distance: number;
    stationIds: string[];
    sectionIds: number[];
    lineIds: number[];
}

/**
 * Searches candidate routes connecting a series of waypoints (Start -> Via 1 -> ... -> End)
 */
export function findCandidateRoutes(
    waypoints: Station[],
    railData: RailData | null
): RouteSearchResult {
    if (!railData || !waypoints || waypoints.length < 2) {
        return { candidates: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
    }

    const network = railData.railroadNetwork;
    const stationGraph = network?.station_graph;
    const lineDataMap = network?.line_data;
    const stationsMap = railData.stations;

    // Create quick lookup for sections by id
    const sectionsMap = new Map<number, Section>();
    if (railData.sections && railData.sections.sections) {
        railData.sections.sections.forEach(s => sectionsMap.set(s.id, s));
    }

    // Quick lookup for lines by id
    const linesMetaMap = railData.lines || {};

    // 1. For each leg between waypoints[i] and waypoints[i+1], find candidate paths
    const legCandidates: PathState[][] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
        const startSt = waypoints[i];
        const endSt = waypoints[i + 1];

        const paths = findLegPaths(startSt.id, endSt.id, stationGraph, stationsMap);
        if (paths.length === 0) {
            // Cannot connect this leg
            return { candidates: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }
        legCandidates.push(paths);
    }

    // 2. Combine leg candidates into full route candidates
    const combinedStates: PathState[] = combineLegs(legCandidates);

    // 3. Deduplicate combined states by section sequence / line combination
    const uniqueCandidatesMap = new Map<string, PathState>();

    for (const state of combinedStates) {
        const key = state.sectionIds.join('-');
        if (!uniqueCandidatesMap.has(key)) {
            uniqueCandidatesMap.set(key, state);
        } else {
            const existing = uniqueCandidatesMap.get(key)!;
            if (state.distance < existing.distance) {
                uniqueCandidatesMap.set(key, state);
            }
        }
    }

    let allUniqueStates = Array.from(uniqueCandidatesMap.values());

    // Sort by distance
    allUniqueStates.sort((a, b) => a.distance - b.distance);

    const totalCandidatesCount = allUniqueStates.length;
    const hasTooManyCandidates = totalCandidatesCount >= 5;

    // Display max 5 candidates
    const topStates = allUniqueStates.slice(0, 5);

    // Build CandidateRoute objects
    const candidates: CandidateRoute[] = topStates.map((state, index) => {
        // Collect station names
        const stationNames = state.stationIds.map(sid => {
            const st = stationsMap[sid];
            return st ? st.name : sid;
        });

        // Collect distinct lines used in order
        const linesUsed: RouteLineInfo[] = [];
        const seenLineIds = new Set<number>();
        state.lineIds.forEach(lid => {
            if (lid > 0 && !seenLineIds.has(lid)) {
                seenLineIds.add(lid);
                const meta = linesMetaMap[String(lid)];
                const netLine = lineDataMap ? lineDataMap[String(lid)] : undefined;
                linesUsed.push({
                    id: lid,
                    name: meta?.name || netLine?.name || `Line ${lid}`,
                    name_en: meta?.name_en || netLine?.name_en,
                    name_kr: meta?.name_kr,
                    color: meta?.color || netLine?.color || '#3b82f6'
                });
            }
        });

        // Collect section geometries
        const geometries: [number, number][][] = [];
        state.sectionIds.forEach(secId => {
            const sec = sectionsMap.get(secId);
            if (sec && sec.geometry && sec.geometry.length > 0) {
                geometries.push(sec.geometry);
            }
        });

        // Collect transfer station names
        const transfers: string[] = [];
        for (let j = 1; j < state.stationIds.length - 1; j++) {
            const st = stationsMap[state.stationIds[j]];
            if (st && !transfers.includes(st.name)) {
                transfers.push(st.name);
            }
        }

        return {
            id: `candidate_${index}_${Date.now()}`,
            distance: Math.round(state.distance * 10) / 10,
            stationIds: state.stationIds,
            stationNames,
            sectionIds: state.sectionIds,
            geometries,
            lines: linesUsed,
            transfers,
            isShortest: index === 0
        };
    });

    return {
        candidates,
        totalCandidatesCount,
        hasTooManyCandidates
    };
}

/**
 * Finds candidate paths between startId and endId using BFS/Dijkstra on stationGraph
 */
function findLegPaths(
    startId: string,
    endId: string,
    stationGraph: Record<string, any> | undefined,
    stationsMap: Record<string, Station>
): PathState[] {
    if (startId === endId) {
        return [{
            currentNode: startId,
            visitedNodes: new Set([startId]),
            distance: 0,
            stationIds: [startId],
            sectionIds: [],
            lineIds: []
        }];
    }

    if (!stationGraph) {
        return [];
    }

    // Normalize start and end IDs: check if start/end station names match other IDs
    const startStationName = stationsMap[startId]?.name;
    const endStationName = stationsMap[endId]?.name;

    const targetStationIds = new Set<string>();
    targetStationIds.add(endId);
    if (endStationName) {
        Object.values(stationsMap).forEach(st => {
            if (st.name === endStationName) targetStationIds.add(st.id);
        });
    }

    const startStationIds: string[] = [startId];
    if (startStationName) {
        Object.values(stationsMap).forEach(st => {
            if (st.name === startStationName && st.id !== startId) startStationIds.push(st.id);
        });
    }

    const candidates: PathState[] = [];
    const queue: PathState[] = [];

    startStationIds.forEach(sid => {
        queue.push({
            currentNode: sid,
            visitedNodes: new Set([sid]),
            distance: 0,
            stationIds: [sid],
            sectionIds: [],
            lineIds: []
        });
    });

    const maxQueue = 1000;
    let processed = 0;

    while (queue.length > 0 && processed < maxQueue) {
        // Sort queue by distance
        queue.sort((a, b) => a.distance - b.distance);
        const curr = queue.shift()!;
        processed++;

        if (targetStationIds.has(curr.currentNode)) {
            // Found a path
            candidates.push(curr);
            if (candidates.length >= 6) break; // Collect top candidate paths
            continue;
        }

        const neighbors = stationGraph[curr.currentNode];
        if (!neighbors) continue;

        for (const neighborId in neighbors) {
            if (curr.visitedNodes.has(neighborId)) continue;

            const connData = neighbors[neighborId];
            if (!connData || !connData.connections) continue;

            for (const conn of connData.connections) {
                const lineId = Number(conn.line_id || 0);
                const sectionIds = (conn.section_ids || []).map(Number);
                const dist = (conn.distance || 0) / 1000;

                const nextVisited = new Set(curr.visitedNodes);
                nextVisited.add(neighborId);

                const nextState: PathState = {
                    currentNode: neighborId,
                    visitedNodes: nextVisited,
                    distance: curr.distance + dist,
                    stationIds: [...curr.stationIds, neighborId],
                    sectionIds: [...curr.sectionIds, ...sectionIds],
                    lineIds: lineId > 0 ? [...curr.lineIds, lineId] : curr.lineIds
                };

                // Limit search depth to prevent infinite loops (max 100 stations per leg)
                if (nextState.stationIds.length < 100) {
                    queue.push(nextState);
                }
            }
        }
    }

    // Filter distinct paths by line sequence
    const distinctPathsMap = new Map<string, PathState>();
    candidates.forEach(path => {
        const lineKey = path.lineIds.join('-') || path.stationIds.join('-');
        if (!distinctPathsMap.has(lineKey) || path.distance < distinctPathsMap.get(lineKey)!.distance) {
            distinctPathsMap.set(lineKey, path);
        }
    });

    return Array.from(distinctPathsMap.values()).sort((a, b) => a.distance - b.distance);
}

/**
 * Combines candidates across legs
 */
function combineLegs(legCandidates: PathState[][]): PathState[] {
    if (legCandidates.length === 0) return [];
    if (legCandidates.length === 1) return legCandidates[0];

    let currentCombinations: PathState[] = legCandidates[0];

    for (let i = 1; i < legCandidates.length; i++) {
        const nextLeg = legCandidates[i];
        const nextCombinations: PathState[] = [];

        for (const leg1 of currentCombinations) {
            for (const leg2 of nextLeg) {
                // Combine leg1 and leg2
                const combinedVisited = new Set([...Array.from(leg1.visitedNodes), ...Array.from(leg2.visitedNodes)]);
                const combinedStationIds = [...leg1.stationIds];
                // Avoid duplicating the transition station
                if (leg2.stationIds.length > 0) {
                    if (combinedStationIds[combinedStationIds.length - 1] === leg2.stationIds[0]) {
                        combinedStationIds.push(...leg2.stationIds.slice(1));
                    } else {
                        combinedStationIds.push(...leg2.stationIds);
                    }
                }

                nextCombinations.push({
                    currentNode: leg2.currentNode,
                    visitedNodes: combinedVisited,
                    distance: leg1.distance + leg2.distance,
                    stationIds: combinedStationIds,
                    sectionIds: [...leg1.sectionIds, ...leg2.sectionIds],
                    lineIds: [...leg1.lineIds, ...leg2.lineIds]
                });
            }
        }

        currentCombinations = nextCombinations;
    }

    return currentCombinations;
}

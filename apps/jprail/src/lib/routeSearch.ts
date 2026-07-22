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
    cost: number;
    lastLineId: number;
    stationIds: string[];
    sectionIds: number[];
    lineIds: number[];
}

interface GraphEdge {
    neighborId: string;
    sectionId: number;
    dist: number;
    lineId: number;
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

    const stationsMap = railData.stations || {};
    const linesMetaMap = railData.lines || {};

    // 1. Quick lookup for sections
    const sectionsMap = new Map<number, Section>();
    if (railData.sections && railData.sections.sections) {
        railData.sections.sections.forEach(s => sectionsMap.set(s.id, s));
    }

    // 2. Build unified adjacency graph
    const adj = new Map<string, GraphEdge[]>();

    const addEdge = (u: string, v: string, secId: number, distKm: number, lineId: number) => {
        if (!u || !v || u === v) return;
        if (!adj.has(u)) adj.set(u, []);
        if (!adj.has(v)) adj.set(v, []);
        adj.get(u)!.push({ neighborId: v, sectionId: secId, dist: distKm, lineId });
        adj.get(v)!.push({ neighborId: u, sectionId: secId, dist: distKm, lineId });
    };

    // Add edges from sections metadata
    if (railData.sections && railData.sections.sections) {
        railData.sections.sections.forEach(s => {
            const dist = (s.length || 500) / 1000;
            addEdge(s.start, s.end, s.id, dist, s.line_id);
        });
    }

    // Add edges from station_graph if available
    if (railData.railroadNetwork && railData.railroadNetwork.station_graph) {
        const sg = railData.railroadNetwork.station_graph;
        Object.entries(sg).forEach(([u, neighbors]) => {
            Object.entries(neighbors).forEach(([v, connData]: [string, any]) => {
                const secIds = (connData.section_ids || []).map(Number);
                const lines = (connData.available_lines || []).map(Number);
                const lineId = lines.length > 0 ? lines[0] : 0;
                const secId = secIds.length > 0 ? secIds[0] : 0;
                let dist = 0;
                secIds.forEach((sid: number) => {
                    const sec = sectionsMap.get(sid);
                    if (sec && sec.length) dist += sec.length / 1000;
                });
                if (dist === 0) dist = 0.5;
                addEdge(u, v, secId, dist, lineId);
            });
        });
    }

    // Leg route finder
    const findLegPaths = (startSt: Station, endSt: Station): PathState[] => {
        // Collect all matching start IDs
        const startIds = new Set<string>();
        startIds.add(startSt.id);
        if (startSt.platform_ids) startSt.platform_ids.forEach(pid => startIds.add(pid));
        if (startSt.name) {
            Object.values(stationsMap).forEach(s => {
                if (s.name === startSt.name) {
                    startIds.add(s.id);
                    if (s.platform_ids) s.platform_ids.forEach(pid => startIds.add(pid));
                }
            });
        }

        // Collect all matching target IDs
        const targetIds = new Set<string>();
        targetIds.add(endSt.id);
        if (endSt.platform_ids) endSt.platform_ids.forEach(pid => targetIds.add(pid));
        if (endSt.name) {
            Object.values(stationsMap).forEach(s => {
                if (s.name === endSt.name) {
                    targetIds.add(s.id);
                    if (s.platform_ids) s.platform_ids.forEach(pid => targetIds.add(pid));
                }
            });
        }

        const candidates: PathState[] = [];
        const bannedEdges = new Set<string>();

        // Up to 5 search iterations with penalization for previously used edges to find alternate routes
        for (let attempt = 0; attempt < 5; attempt++) {
            const visitCount = new Map<string, number>();
            const queue: PathState[] = [];

            startIds.forEach(sid => {
                visitCount.set(sid, 1);
                queue.push({
                    currentNode: sid,
                    visitedNodes: new Set([sid]),
                    distance: 0,
                    cost: 0,
                    lastLineId: 0,
                    stationIds: [sid],
                    sectionIds: [],
                    lineIds: []
                });
            });

            let foundPath: PathState | null = null;
            let processed = 0;
            const maxProcessed = 15000;

            while (queue.length > 0 && processed < maxProcessed) {
                queue.sort((a, b) => a.cost - b.cost);
                const curr = queue.shift()!;
                processed++;

                const stObj = stationsMap[curr.currentNode];
                const isGoal = targetIds.has(curr.currentNode) || (stObj && endSt.name && stObj.name === endSt.name);

                if (isGoal && curr.stationIds.length > 1) {
                    foundPath = curr;
                    break;
                }

                const neighbors = adj.get(curr.currentNode) || [];
                for (const edge of neighbors) {
                    const edgeKey = `${curr.currentNode}-${edge.neighborId}`;
                    const banPenalty = bannedEdges.has(edgeKey) ? 100 : 0;

                    // Line transfer penalty: discourage unnecessary transfers off a continuous line
                    const isTransfer = curr.lastLineId > 0 && edge.lineId > 0 && curr.lastLineId !== edge.lineId;
                    const transferPenalty = isTransfer ? 15 : 0;

                    const count = visitCount.get(edge.neighborId) || 0;
                    if (count >= 2) continue; // max 2 visits per node

                    visitCount.set(edge.neighborId, count + 1);
                    const nextVisited = new Set(curr.visitedNodes);
                    nextVisited.add(edge.neighborId);

                    queue.push({
                        currentNode: edge.neighborId,
                        visitedNodes: nextVisited,
                        distance: curr.distance + edge.dist,
                        cost: curr.cost + edge.dist + transferPenalty + banPenalty,
                        lastLineId: edge.lineId || curr.lastLineId,
                        stationIds: [...curr.stationIds, edge.neighborId],
                        sectionIds: edge.sectionId ? [...curr.sectionIds, edge.sectionId] : curr.sectionIds,
                        lineIds: edge.lineId ? [...curr.lineIds, edge.lineId] : curr.lineIds
                    });
                }
            }

            if (foundPath) {
                // Calculate true distance without penalties
                let trueDist = 0;
                foundPath.sectionIds.forEach(sid => {
                    const sec = sectionsMap.get(sid);
                    if (sec && sec.length) trueDist += sec.length / 1000;
                });
                if (trueDist === 0) trueDist = foundPath.distance;
                foundPath.distance = trueDist;

                candidates.push(foundPath);

                // Ban middle section edge to encourage discovering alternate paths
                if (foundPath.sectionIds.length > 0) {
                    const midSecId = foundPath.sectionIds[Math.floor(foundPath.sectionIds.length / 2)];
                    const sec = sectionsMap.get(midSecId);
                    if (sec) {
                        bannedEdges.add(`${sec.start}-${sec.end}`);
                        bannedEdges.add(`${sec.end}-${sec.start}`);
                    }
                } else if (foundPath.stationIds.length > 2) {
                    const midIdx = Math.floor(foundPath.stationIds.length / 2);
                    const u = foundPath.stationIds[midIdx];
                    const v = foundPath.stationIds[midIdx + 1];
                    bannedEdges.add(`${u}-${v}`);
                    bannedEdges.add(`${v}-${u}`);
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        // Filter unique paths by line sequence or station sequence
        const uniquePathsMap = new Map<string, PathState>();
        candidates.forEach(path => {
            const key = path.lineIds.join('-') || path.stationIds.join('-');
            if (!uniquePathsMap.has(key) || path.distance < uniquePathsMap.get(key)!.distance) {
                uniquePathsMap.set(key, path);
            }
        });

        return Array.from(uniquePathsMap.values()).sort((a, b) => a.distance - b.distance);
    };

    // 3. For each leg between waypoints[i] and waypoints[i+1], find candidate paths
    const legCandidates: PathState[][] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
        const startSt = waypoints[i];
        const endSt = waypoints[i + 1];

        const paths = findLegPaths(startSt, endSt);
        if (paths.length === 0) {
            return { candidates: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }
        legCandidates.push(paths);
    }

    // 4. Combine leg candidates into full route candidates
    const combinedStates: PathState[] = combineLegs(legCandidates);

    // 5. Deduplicate combined states by section sequence / line combination
    const uniqueCandidatesMap = new Map<string, PathState>();

    for (const state of combinedStates) {
        const key = state.sectionIds.length > 0 ? state.sectionIds.join('-') : state.stationIds.join('-');
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

        // Collect distinct lines in chronological order
        const linesUsed: RouteLineInfo[] = [];
        const sequentialLineIds: number[] = [];
        state.lineIds.forEach(lid => {
            if (lid > 0 && (sequentialLineIds.length === 0 || sequentialLineIds[sequentialLineIds.length - 1] !== lid)) {
                sequentialLineIds.push(lid);
            }
        });

        sequentialLineIds.forEach(lid => {
            const meta = linesMetaMap[String(lid)];
            linesUsed.push({
                id: lid,
                name: meta?.name || `Line ${lid}`,
                name_en: meta?.name_en,
                name_kr: meta?.name_kr,
                color: meta?.color || '#3b82f6'
            });
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
                const combinedVisited = new Set([...Array.from(leg1.visitedNodes), ...Array.from(leg2.visitedNodes)]);
                const combinedStationIds = [...leg1.stationIds];
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
                    cost: leg1.cost + leg2.cost,
                    lastLineId: leg2.lastLineId || leg1.lastLineId,
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

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
    transferCount: number; // number of line transfers
    category: 'distance' | 'transfer';
    rank: number; // 1 or 2
    stationIds: string[];
    stationNames: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    lines: RouteLineInfo[];
    transfers: string[]; // Names of transfer stations
    isShortest?: boolean;
}

export interface LegSearchResult {
    legIndex: number;
    startStation: Station;
    endStation: Station;
    candidates: CandidateRoute[];
}

export interface RouteSearchResult {
    legs: LegSearchResult[];
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
 * Filter out negligible line segments (e.g. platform joints < 0.8 km)
 * to compute true line sequence and accurate transfer count.
 */
function getSignificantLines(
    sectionIds: number[],
    lineIds: number[],
    sectionsMap: Map<number, Section>
): { lineId: number; dist: number }[] {
    const rawSegments: { lineId: number; dist: number }[] = [];

    sectionIds.forEach((sid, i) => {
        const sec = sectionsMap.get(sid);
        const lenKm = sec && sec.length ? sec.length / 1000 : 0.5;
        const lid = (sec && sec.line_id) ? sec.line_id : (lineIds[i] || 0);

        if (lid > 0) {
            if (rawSegments.length === 0 || rawSegments[rawSegments.length - 1].lineId !== lid) {
                rawSegments.push({ lineId: lid, dist: lenKm });
            } else {
                rawSegments[rawSegments.length - 1].dist += lenKm;
            }
        }
    });

    const totalDist = rawSegments.reduce((sum, s) => sum + s.dist, 0);

    // Keep line segments if length >= 0.8 km or >= 2% of total distance
    const significant = rawSegments.filter(s => {
        if (rawSegments.length === 1) return true;
        if (s.dist >= 0.8 || (totalDist > 0 && (s.dist / totalDist) >= 0.02)) {
            return true;
        }
        return false;
    });

    return significant.length > 0 ? significant : rawSegments.slice(0, 1);
}

/**
 * Searches candidate routes connecting a series of waypoints (Start -> Via 1 -> ... -> End)
 * Groups candidates by leg and ranks top 2 by Distance + top 2 by Least Transfers.
 */
export function findCandidateRoutes(
    waypoints: Station[],
    railData: RailData | null
): RouteSearchResult {
    if (!railData || !waypoints || waypoints.length < 2) {
        return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
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

    // Single leg route finder with 2 Distance + 2 Transfer candidates
    const searchLegCandidates = (startSt: Station, endSt: Station, legIndex: number): CandidateRoute[] => {
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

        const rawCandidates: PathState[] = [];
        const bannedEdges = new Set<string>();

        for (let attempt = 0; attempt < 8; attempt++) {
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

                    // Only penalize transfer if the edge is longer than 0.2 km (ignores tiny station platform joint edges)
                    const isTransfer = curr.lastLineId > 0 && edge.lineId > 0 && curr.lastLineId !== edge.lineId && edge.dist >= 0.2;
                    const transferPenalty = isTransfer ? 15 : 0;

                    const count = visitCount.get(edge.neighborId) || 0;
                    if (count >= 2) continue;

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
                let trueDist = 0;
                foundPath.sectionIds.forEach(sid => {
                    const sec = sectionsMap.get(sid);
                    if (sec && sec.length) trueDist += sec.length / 1000;
                });
                if (trueDist === 0) trueDist = foundPath.distance;
                foundPath.distance = trueDist;

                rawCandidates.push(foundPath);

                if (foundPath.sectionIds.length > 0) {
                    const midSecId = foundPath.sectionIds[Math.floor(foundPath.sectionIds.length / 2)];
                    const sec = sectionsMap.get(midSecId);
                    if (sec) {
                        bannedEdges.add(`${sec.start}-${sec.end}`);
                        bannedEdges.add(`${sec.end}-${sec.start}`);
                    }
                } else break;
            } else break;
        }

        // Deduplicate raw candidates by line sequence
        const uniqueMap = new Map<string, PathState>();
        rawCandidates.forEach(c => {
            const key = c.lineIds.join('-') || c.stationIds.join('-');
            if (!uniqueMap.has(key) || c.distance < uniqueMap.get(key)!.distance) {
                uniqueMap.set(key, c);
            }
        });

        const allPaths = Array.from(uniqueMap.values());

        // Convert PathState to CandidateRoute object with significant lines filtering
        const mapToCandidateRoute = (state: PathState, category: 'distance' | 'transfer', rank: number): CandidateRoute => {
            const stationNames = state.stationIds.map(sid => {
                const st = stationsMap[sid];
                return st ? st.name : sid;
            });

            // Get significant lines list (filters out station platform connections < 0.8 km)
            const sigLines = getSignificantLines(state.sectionIds, state.lineIds, sectionsMap);
            const transferCount = Math.max(0, sigLines.length - 1);

            const linesUsed: RouteLineInfo[] = sigLines.map(sl => {
                const meta = linesMetaMap[String(sl.lineId)];
                return {
                    id: sl.lineId,
                    name: meta?.name || `Line ${sl.lineId}`,
                    name_en: meta?.name_en,
                    name_kr: meta?.name_kr,
                    color: meta?.color || '#3b82f6'
                };
            });

            const geometries: [number, number][][] = [];
            state.sectionIds.forEach(secId => {
                const sec = sectionsMap.get(secId);
                if (sec && sec.geometry && sec.geometry.length > 0) {
                    geometries.push(sec.geometry);
                }
            });

            const transfers: string[] = [];
            for (let j = 1; j < state.stationIds.length - 1; j++) {
                const st = stationsMap[state.stationIds[j]];
                if (st && !transfers.includes(st.name)) {
                    transfers.push(st.name);
                }
            }

            return {
                id: `leg_${legIndex}_cand_${category}_${rank}_${Date.now()}_${Math.random()}`,
                distance: Math.round(state.distance * 10) / 10,
                transferCount,
                category,
                rank,
                stationIds: state.stationIds,
                stationNames,
                sectionIds: state.sectionIds,
                geometries,
                lines: linesUsed,
                transfers,
                isShortest: category === 'distance' && rank === 1
            };
        };

        // 1. Top 2 by Distance (거리순 2개)
        const byDistance = [...allPaths].sort((a, b) => a.distance - b.distance);
        const distCandidates = byDistance.slice(0, 2).map((c, i) => mapToCandidateRoute(c, 'distance', i + 1));

        const chosenLineKeys = new Set(distCandidates.map(c => c.lines.map(l => l.id).join('-')));

        // 2. Top 2 by Transfer Count (최소환승순 2개)
        const byTransfer = [...allPaths].sort((a, b) => {
            const sigA = getSignificantLines(a.sectionIds, a.lineIds, sectionsMap);
            const sigB = getSignificantLines(b.sectionIds, b.lineIds, sectionsMap);
            const tA = Math.max(0, sigA.length - 1);
            const tB = Math.max(0, sigB.length - 1);
            if (tA !== tB) return tA - tB;
            return a.distance - b.distance;
        });

        const transferCandidates: CandidateRoute[] = [];
        for (const c of byTransfer) {
            const sig = getSignificantLines(c.sectionIds, c.lineIds, sectionsMap);
            const key = sig.map(s => s.lineId).join('-');
            if (!chosenLineKeys.has(key)) {
                chosenLineKeys.add(key);
                transferCandidates.push(mapToCandidateRoute(c, 'transfer', transferCandidates.length + 1));
                if (transferCandidates.length >= 2) break;
            }
        }

        // Fill remaining transfer candidates if duplicates exist
        if (transferCandidates.length < 2) {
            for (const c of byTransfer) {
                if (transferCandidates.length >= 2) break;
                transferCandidates.push(mapToCandidateRoute(c, 'transfer', transferCandidates.length + 1));
            }
        }

        return [...distCandidates, ...transferCandidates];
    };

    // 3. Process leg-by-leg candidates
    const legs: LegSearchResult[] = [];
    let totalCandidatesCount = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const startSt = waypoints[i];
        const endSt = waypoints[i + 1];

        const cands = searchLegCandidates(startSt, endSt, i);
        if (cands.length === 0) {
            return { legs: [], totalCandidatesCount: 0, hasTooManyCandidates: false };
        }

        totalCandidatesCount += cands.length;
        legs.push({
            legIndex: i,
            startStation: startSt,
            endStation: endSt,
            candidates: cands
        });
    }

    return {
        legs,
        totalCandidatesCount,
        hasTooManyCandidates: totalCandidatesCount >= 5
    };
}

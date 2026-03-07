import { useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';
import { RailData, Station, Joint } from '../types/railData';
import { PassengerGridData, getGridRepresentativeStations } from './usePassengerGrid';

interface VisibleStationsProps {
    railroadNetwork: RailData | null;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    usedStationIds: Set<string>;
    passengerGrid?: PassengerGridData | null;
}

// Spatial Grid Constants
const GRID_SIZE = 0.5; // 0.5 degree grid

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    usedStationIds,
    passengerGrid = null,
}: VisibleStationsProps) => {

    // 1. Build Spatial Index Once
    const spatialIndex = useMemo(() => {
        if (!railroadNetwork || !railroadNetwork.stations) return null;

        const grid = new Map<string, { stations: Station[], joints: Joint[] }>();
        const railData = railroadNetwork as RailData;

        const getGridKey = (lat: number, lon: number) =>
            `${Math.floor(lat / GRID_SIZE)}_${Math.floor(lon / GRID_SIZE)}`;

        // Index Stations
        Object.values(railData.stations).forEach((s: Station) => {
            const key = getGridKey(s.lat, s.lon);
            if (!grid.has(key)) grid.set(key, { stations: [], joints: [] });
            grid.get(key)!.stations.push(s);
        });

        // Index Joints
        if (railData.joints && railData.joints.joints) {
            railData.joints.joints.forEach((j: Joint) => {
                const [lon, lat] = j.coordinates;
                const key = getGridKey(lat, lon);
                if (!grid.has(key)) grid.set(key, { stations: [], joints: [] });
                grid.get(key)!.joints.push(j);
            });
        }

        return grid;
    }, [railroadNetwork]);

    // 2. Perform Visible Filtering using Spatial Index or stationsLod
    // Standardized breakpoints: Low (<=8), Mid (9-13), High (14+)
    const effectiveZoom = useMemo(() => {
        if (zoomLevel >= 14) return 14;
        if (zoomLevel >= 9) return 10;
        return 8;
    }, [zoomLevel]);

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !spatialIndex) return null;

        const data: Record<string, ProcessedStation> = {};
        const railData = railroadNetwork as RailData;

        // --- Path A: Use stationsLod with Smart Density Filtering ---
        if (railData.stationsLod) {
            // 1. Initial filter by padded bounds for performance
            let candidates = railData.stationsLod;
            if (mapBounds) {
                const padded = mapBounds.pad(0.5);
                candidates = candidates.filter(s => padded.contains(s.c as [number, number]));
            }

            // 2. 격자 기반 대표역 필터링
            // zoom 8 이상에서 격자 대표역 우선 표시, 단 방문/환승역은 항상 표시
            const gridReps = zoomLevel >= 5 && zoomLevel < 12
                ? getGridRepresentativeStations(zoomLevel, passengerGrid)
                : null;

            // 3. Sort by importance (Priority for grid reps and transfers, with slight boost for used)
            const sortedCandidates = [...candidates].sort((a, b) => {
                const getPriority = (item: typeof a) => {
                    const isUsed = item.nodes.some(n => usedStationIds.has(n.id));
                    const isTransfer = item.lines.length > 1;
                    const isGridRep = gridReps ? gridReps.has(item.id) : true;
                    let p = 0;
                    if (isTransfer) p += 2000;
                    if (isGridRep) p += 1000;
                    if (isUsed) p += 500; // Slight boost for visited stations, but not enough to override transfers
                    p += item.lines.length * 50;
                    p -= item.z * 10;
                    return p;
                };
                return getPriority(b) - getPriority(a);
            });

            // 4. Smart Filtering Logic
            const accepted: typeof sortedCandidates = [];
            // Zoom-dependent collision thresholds (in degrees)
            const threshold = Math.pow(2, 9 - zoomLevel) * 0.025;
            const isVeryFarZoom = zoomLevel < 8;

            sortedCandidates.forEach(c => {
                const isExplicitlyUsed = c.nodes.some(n => usedStationIds.has(n.id));
                const isTransfer = c.lines.length > 1;

                const hasCollision = accepted.some(acc => {
                    const dLat = Math.abs(acc.c[0] - c.c[0]);
                    const dLon = Math.abs(acc.c[1] - c.c[1]);
                    return dLat < threshold && dLon < threshold * 1.2;
                });

                let isVisible = false;
                if (zoomLevel >= 12) {
                    isVisible = true;
                } else if (gridReps !== null) {
                    // 격자 모드: 대표역(이용객 최다) 또는 환승역만 표시
                    // 이동한 내역이 있는 역도 동일한 기준으로 표시 (사용자 요청 #5)
                    const isGridRep = gridReps.has(c.id);
                    isVisible = (isGridRep || isTransfer) && !hasCollision;
                } else {
                    const baseVisible = zoomLevel >= c.z;
                    if (baseVisible) {
                        isVisible = !hasCollision;
                    } else if (isExplicitlyUsed) {
                        // Even if visited, we apply collision guard at low zoom
                        isVisible = !hasCollision && zoomLevel >= 8;
                    } else if (!isTransfer && !hasCollision && zoomLevel >= c.z - 2 && !isVeryFarZoom && zoomLevel >= 8) {
                        isVisible = true;
                    }
                }

                if (isVisible) {
                    accepted.push(c);
                    data[c.id] = {
                        id: c.id,
                        name: c.name,
                        name_en: c.name_en || railData.stations[c.nodes[0]?.id]?.name_en,
                        name_kr: c.name_kr || railData.stations[c.nodes[0]?.id]?.name_kr,
                        centroid: c.c as [number, number],
                        lines: c.lines,
                        nodes: c.nodes.map(n => {
                            const rawStation = railData.stations[n.id];
                            const platformGeoms: number[][][] = [];
                            if (rawStation && rawStation.platform_ids) {
                                rawStation.platform_ids.forEach((pid: string) => {
                                    const p = railData.platforms[pid];
                                    if (p && p.geometries) platformGeoms.push(...p.geometries);
                                });
                            }
                            return {
                                id: n.id,
                                coord: n.c as [number, number],
                                lineKey: c.lines[0] || "",
                                platforms: platformGeoms.length > 0 ? platformGeoms : undefined,
                                isUsed: usedStationIds.has(n.id)
                            };
                        }),
                        isUsed: isExplicitlyUsed
                    };
                }
            });

            // Add Joints (junctions) at high zoom
            if (zoomLevel >= 12 && railData.joints?.joints) {
                railData.joints.joints.forEach((j: Joint) => {
                    const [jLon, jLat] = j.coordinates;
                    if (mapBounds && !mapBounds.contains([jLat, jLon])) return;
                    data[j.id] = {
                        id: j.id,
                        name: "",
                        nodes: [{ id: j.id, coord: [jLat, jLon], lineKey: "" }],
                        centroid: [jLat, jLon],
                        lines: [],
                        isJoint: true
                    };
                });
            }
            return data;
        }

        // --- Path B: Fallback Dynamic Grouping (if stationsLod not present) ---
        const keysToProcess: string[] = [];
        if (mapBounds) {
            const padded = mapBounds.pad(2.0);
            const minLat = padded.getSouth();
            const maxLat = padded.getNorth();
            const minLon = padded.getWest();
            const maxLon = padded.getEast();

            for (let lat = Math.floor(minLat / GRID_SIZE) * GRID_SIZE; lat <= maxLat; lat += GRID_SIZE) {
                for (let lon = Math.floor(minLon / GRID_SIZE) * GRID_SIZE; lon <= maxLon; lon += GRID_SIZE) {
                    keysToProcess.push(`${Math.floor(lat / GRID_SIZE)}_${Math.floor(lon / GRID_SIZE)}`);
                }
            }
        } else {
            keysToProcess.push(...Array.from(spatialIndex.keys()));
        }

        const nameToId = new Map<string, string>();
        keysToProcess.forEach(key => {
            const cell = spatialIndex.get(key);
            if (!cell) return;
            cell.stations.forEach((s: Station) => {
                const stationLines = new Set<string>();
                if (s.platform_ids) {
                    s.platform_ids.forEach((pid: string) => {
                        const p = railData.platforms[pid];
                        if (p) stationLines.add(`${p.company}::${p.line}`);
                    });
                }
                const platforms: number[][][] = []; // Assuming number[][][] per previous refactor
                if (s.platform_ids) {
                    s.platform_ids.forEach((pid: string) => {
                        const p = railData.platforms[pid];
                        if (p && p.geometries) platforms.push(...p.geometries);
                    });
                }
                const node: StaticNode = {
                    id: s.id,
                    coord: [s.lat, s.lon],
                    lineKey: Array.from(stationLines)[0] || "",
                    platforms: platforms.length > 0 ? platforms : undefined,
                    isUsed: usedStationIds.has(s.id)
                };
                const hubKey = `${s.name}_${s.name_en}`;
                let targetId = s.id;
                if (nameToId.has(hubKey)) {
                    const existingId = nameToId.get(hubKey)!;
                    const existing = data[existingId];
                    if (existing && Math.abs(existing.centroid[0] - s.lat) < 0.005 && Math.abs(existing.centroid[1] - s.lon) < 0.005) {
                        targetId = existingId;
                    }
                } else {
                    nameToId.set(hubKey, s.id);
                }
                if (!data[targetId]) {
                    data[targetId] = {
                        id: targetId,
                        nodes: [node],
                        centroid: [s.lat, s.lon],
                        lines: Array.from(stationLines),
                        name: s.name,
                        name_en: s.name_en,
                        name_kr: s.name_kr,
                        isUsed: usedStationIds.has(s.id)
                    };
                } else {
                    data[targetId].nodes.push(node);
                    stationLines.forEach(l => {
                        if (!data[targetId].lines.includes(l)) data[targetId].lines.push(l);
                    });
                    if (usedStationIds.has(s.id)) data[targetId].isUsed = true;
                    data[targetId].centroid = [
                        data[targetId].nodes.reduce((acc, n) => acc + n.coord[0], 0) / data[targetId].nodes.length,
                        data[targetId].nodes.reduce((acc, n) => acc + n.coord[1], 0) / data[targetId].nodes.length
                    ];
                }
            });
            if (effectiveZoom >= 12) {
                cell.joints.forEach((j: Joint) => {
                    const [jLon, jLat] = j.coordinates;
                    data[j.id] = {
                        id: j.id,
                        name: "",
                        nodes: [{ id: j.id, coord: [jLat, jLon], lineKey: "" }],
                        centroid: [jLat, jLon],
                        lines: [],
                        isJoint: true
                    };
                });
            }
        });
        return data;
    }, [railroadNetwork, spatialIndex, usedStationIds, mapBounds, zoomLevel, effectiveZoom, passengerGrid]);

    return { visibleStations, effectiveZoom };
};

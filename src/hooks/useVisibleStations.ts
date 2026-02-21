import { useMemo, useRef } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';
import { RailData } from '../types/railData';

interface VisibleStationsProps {
    railroadNetwork: RailData | null;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    lineIdMap: Map<string, string>;
    isMoving?: boolean;
    usedStationIds: Set<string>;
}

// Spatial Grid Constants
const GRID_SIZE = 0.5; // 0.5 degree grid

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    lineIdMap,
    isMoving = false,
    usedStationIds
}: VisibleStationsProps) => {
    const lastResultRef = useRef<Record<string, ProcessedStation> | null>(null);

    // 1. Build Spatial Index Once
    const spatialIndex = useMemo(() => {
        if (!railroadNetwork || !railroadNetwork.stations) return null;

        const grid = new Map<string, { stations: any[], joints: any[] }>();
        const railData = railroadNetwork as RailData;

        const getGridKey = (lat: number, lon: number) =>
            `${Math.floor(lat / GRID_SIZE)}_${Math.floor(lon / GRID_SIZE)}`;

        // Index Stations
        Object.values(railData.stations).forEach((s: any) => {
            const key = getGridKey(s.lat, s.lon);
            if (!grid.has(key)) grid.set(key, { stations: [], joints: [] });
            grid.get(key)!.stations.push(s);
        });

        // Index Joints
        if (railData.joints && railData.joints.joints) {
            railData.joints.joints.forEach((j: any) => {
                const [lon, lat] = j.coordinates;
                const key = getGridKey(lat, lon);
                if (!grid.has(key)) grid.set(key, { stations: [], joints: [] });
                grid.get(key)!.joints.push(j);
            });
        }

        return grid;
    }, [railroadNetwork]);

    // 2. Perform Visible Filtering using Spatial Index
    const effectiveZoom = useMemo(() => {
        if (zoomLevel >= 14) return 14;
        if (zoomLevel >= 12) return 12;
        if (zoomLevel >= 8) return 8;
        return 1; // Always process data for platforms
    }, [zoomLevel]);

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !spatialIndex) return null;

        const data: Record<string, ProcessedStation> = {};
        const railData = railroadNetwork as RailData;

        // Global Pre-bake: Process ALL stations in the network
        // Use a logical grouping by Name + Proximity to merge separate company entries into one hub
        const nameToId = new Map<string, string>(); // name -> firstId for grouping

        for (const cell of spatialIndex.values()) {
            cell.stations.forEach((s: any) => {
                const stationLines = new Set<string>();
                if (s.platform_ids) {
                    s.platform_ids.forEach((pid: string) => {
                        const p = railData.platforms[pid];
                        if (p) stationLines.add(`${p.company}::${p.line}`);
                    });
                }

                const platforms: any[] = [];
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

                // Logical Hub Check: If a station with same name exists nearby, merge it
                const hubKey = `${s.name}_${s.name_en}`;
                let targetId = s.id;

                // Simple heuristic: if same name exists in this cell, we group them
                // This handles major hubs like Shinjuku where different companies have distinct IDs
                if (nameToId.has(hubKey)) {
                    const existingId = nameToId.get(hubKey)!;
                    const existing = data[existingId];
                    // Verify distance (must be within ~500m to be a hub, roughly 0.005 degrees)
                    const dLat = Math.abs(existing.centroid[0] - s.lat);
                    const dLon = Math.abs(existing.centroid[1] - s.lon);
                    if (dLat < 0.005 && dLon < 0.005) {
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
                        isUsed: usedStationIds.has(s.id)
                    };
                } else {
                    data[targetId].nodes.push(node);
                    stationLines.forEach(l => {
                        if (!data[targetId].lines.includes(l)) data[targetId].lines.push(l);
                    });
                    if (usedStationIds.has(s.id)) data[targetId].isUsed = true;
                    // Update centroid to be the average of all nodes for a balanced hub label
                    const totalNodes = data[targetId].nodes.length;
                    const avgLat = data[targetId].nodes.reduce((acc, n) => acc + n.coord[0], 0) / totalNodes;
                    const avgLon = data[targetId].nodes.reduce((acc, n) => acc + n.coord[1], 0) / totalNodes;
                    data[targetId].centroid = [avgLat, avgLon];
                }
            });

            if (effectiveZoom >= 12) {
                cell.joints.forEach((j: any) => {
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
        }

        lastResultRef.current = data;
        return data;
    }, [railroadNetwork, effectiveZoom, spatialIndex, usedStationIds]);

    return { visibleStations, effectiveZoom };
};

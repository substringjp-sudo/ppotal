import { useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';
import { RailData, Station, Joint } from '../types/railData';

interface VisibleStationsProps {
    railroadNetwork: RailData | null;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    usedStationIds: Set<string>;
}

// Spatial Grid Constants
const GRID_SIZE = 0.5; // 0.5 degree grid

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    usedStationIds
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

    // 2. Perform Visible Filtering using Spatial Index
    const effectiveZoom = useMemo(() => {
        if (zoomLevel >= 14) return 14;
        if (zoomLevel >= 10) return 10;
        if (zoomLevel >= 8) return 8;
        return 1; // Always process data for platforms
    }, [zoomLevel]);

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !spatialIndex) return null;

        const data: Record<string, ProcessedStation> = {};
        const railData = railroadNetwork as RailData;

        // name to ID for grouping
        const nameToId = new Map<string, string>();

        // Calculate visible grid keys with a generous buffer (0.3 degrees)
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
            // Fallback to all if no bounds
            keysToProcess.push(...Array.from(spatialIndex.keys()));
        }

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

                const platforms: [number, number][][] = [];
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
                    if (existing) {
                        const dLat = Math.abs(existing.centroid[0] - s.lat);
                        const dLon = Math.abs(existing.centroid[1] - s.lon);
                        if (dLat < 0.005 && dLon < 0.005) {
                            targetId = existingId;
                        }
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
                    const totalNodes = data[targetId].nodes.length;
                    const avgLat = data[targetId].nodes.reduce((acc, n) => acc + n.coord[0], 0) / totalNodes;
                    const avgLon = data[targetId].nodes.reduce((acc, n) => acc + n.coord[1], 0) / totalNodes;
                    data[targetId].centroid = [avgLat, avgLon];
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
    }, [railroadNetwork, effectiveZoom, spatialIndex, usedStationIds, mapBounds]);

    return { visibleStations, effectiveZoom };
};

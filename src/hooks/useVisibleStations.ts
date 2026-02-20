import { useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';
import { RailData } from '../types/railData';

interface VisibleStationsProps {
    railroadNetwork: RailData | null;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    lineIdMap: Map<string, string>;
    isMoving?: boolean;
}

// Spatial Grid Constants
const GRID_SIZE = 0.5; // 0.5 degree grid

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    lineIdMap,
    isMoving = false
}: VisibleStationsProps) => {

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
    const visibleStations = useMemo(() => {
        // CRITICAL OPTIMIZATION: Skip calculation while moving
        if (!railroadNetwork || !mapBounds || zoomLevel <= 8 || isMoving || !spatialIndex) return null;

        const data: Record<string, ProcessedStation> = {};
        const bounds = {
            s: mapBounds.getSouth(),
            n: mapBounds.getNorth(),
            w: mapBounds.getWest(),
            e: mapBounds.getEast()
        };

        const railData = railroadNetwork as RailData;
        const companyNameMap = new Map<number, string>();
        Object.values(railData.companies).forEach((c: any) => companyNameMap.set(c.id, c.name));

        const lineInfoMap = new Map<number, { name: string, companyId: number }>();
        Object.values(railData.lines).forEach((l: any) => lineInfoMap.set(l.id, { name: l.name, companyId: l.corp_id }));

        // Identify relevant grid cells
        const minLat = Math.floor(bounds.s / GRID_SIZE);
        const maxLat = Math.floor(bounds.n / GRID_SIZE);
        const minLon = Math.floor(bounds.w / GRID_SIZE);
        const maxLon = Math.floor(bounds.e / GRID_SIZE);

        for (let lat = minLat; lat <= maxLat; lat++) {
            for (let lon = minLon; lon <= maxLon; lon++) {
                const key = `${lat}_${lon}`;
                const cell = spatialIndex.get(key);
                if (!cell) continue;

                // Process Stations in Cell
                cell.stations.forEach((s: any) => {
                    if (s.lat < bounds.s || s.lat > bounds.n || s.lon < bounds.w || s.lon > bounds.e) return;

                    const stationLines = new Set<string>();
                    if (s.platform_ids) {
                        s.platform_ids.forEach((pid: string) => {
                            const p = railData.platforms[pid];
                            if (p) {
                                const cId = p.company;
                                const lId = p.line;
                                const companyName = companyNameMap.get(cId) || String(cId);
                                const lInfo = lineInfoMap.get(lId);
                                const lineName = lInfo ? lInfo.name : String(lId);
                                stationLines.add(`${cId}::${lId}`);
                            }
                        });
                    }

                    const firstLine = Array.from(stationLines)[0] || "Unknown::Unknown";
                    const platforms: any[] = [];
                    if (s.platform_ids) {
                        s.platform_ids.forEach((pid: string) => {
                            const p = railData.platforms[pid];
                            if (p && p.geometries && Array.isArray(p.geometries)) platforms.push(...p.geometries);
                        });
                    }

                    const name = s.name;
                    const node: StaticNode = {
                        id: s.id,
                        coord: [s.lat, s.lon],
                        lineKey: firstLine,
                        platforms: platforms.length > 0 ? platforms : undefined
                    };

                    if (!data[name]) {
                        data[name] = {
                            nodes: [node],
                            centroid: [s.lat, s.lon],
                            lines: Array.from(stationLines),
                            name_en: s.name_en
                        };
                    } else {
                        data[name].nodes.push(node);
                        stationLines.forEach(l => { if (!data[name].lines.includes(l)) data[name].lines.push(l); });
                        const n = data[name].nodes.length;
                        data[name].centroid[0] = (data[name].centroid[0] * (n - 1) + s.lat) / n;
                        data[name].centroid[1] = (data[name].centroid[1] * (n - 1) + s.lon) / n;
                        if (!data[name].name_en && s.name_en) data[name].name_en = s.name_en;
                    }
                });

                // Process Joints in Cell
                cell.joints.forEach((j: any) => {
                    const [jLon, jLat] = j.coordinates;
                    if (jLat < bounds.s || jLat > bounds.n || jLon < bounds.w || jLon > bounds.e) return;

                    const id = j.id;
                    const jointLines: string[] = [];
                    if (j.line_ids) {
                        j.line_ids.forEach((lid: number) => {
                            const lInfo = lineInfoMap.get(lid);
                            if (lInfo) {
                                const cName = companyNameMap.get(lInfo.companyId) || String(lInfo.companyId);
                                jointLines.push(`${lInfo.companyId}::${lid}`);
                            }
                        });
                    }

                    data[id] = {
                        nodes: [{ id: id, coord: [jLat, jLon], lineKey: jointLines[0] || "" }],
                        centroid: [jLat, jLon],
                        lines: jointLines,
                        isJoint: true
                    };
                });
            }
        }

        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, isMoving, spatialIndex]);

    return { visibleStations };
};

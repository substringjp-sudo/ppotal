import { useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';
import { RailData } from '../types/railData';

interface VisibleStationsProps {
    railroadNetwork: RailData | null;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    lineIdMap: Map<string, string>;
}

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    lineIdMap
}: VisibleStationsProps) => {

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !mapBounds || zoomLevel <= 8) return null;
        const data: Record<string, ProcessedStation> = {};

        const bounds = {
            s: mapBounds.getSouth(),
            n: mapBounds.getNorth(),
            w: mapBounds.getWest(),
            e: mapBounds.getEast()
        };

        if (railroadNetwork.stations && railroadNetwork.platforms) {
            // Granular Data (RailData)
            const railData = railroadNetwork as RailData;
            const companyNameMap = new Map<number, string>();
            Object.values(railData.companies).forEach((c: any) => companyNameMap.set(c.id, c.name));

            const lineInfoMap = new Map<number, { name: string, companyId: number }>();
            Object.values(railData.lines).forEach((l: any) => lineInfoMap.set(l.id, { name: l.name, companyId: l.corp_id }));

            Object.values(railData.stations).forEach((s: any) => {
                if (s.lat < bounds.s || s.lat > bounds.n || s.lon < bounds.w || s.lon > bounds.e) return;

                let companyName = "Unknown";
                let lineName = "Unknown";
                let fullLineName = "Unknown::Unknown";

                if (s.platform_ids && s.platform_ids.length > 0) {
                    const pid = s.platform_ids[0];
                    const p = railData.platforms[pid];
                    if (p) {
                        const cId = p.company;
                        const lId = p.line;
                        companyName = companyNameMap.get(cId) || String(cId);
                        const lInfo = lineInfoMap.get(lId);
                        lineName = lInfo ? lInfo.name : String(lId);
                        fullLineName = `${companyName}::${lineName}`;
                    }
                }

                // Collect Platforms (Geometries)
                const platforms: any[] = [];
                if (s.platform_ids) {
                    s.platform_ids.forEach((pid: string) => {
                        const p = railData.platforms[pid];
                        if (p && p.geometries) {
                            if (Array.isArray(p.geometries)) {
                                platforms.push(...p.geometries);
                            }
                        }
                    });
                }

                const name = s.name;
                const key = fullLineName; // Simplify key lookup for now

                const node: StaticNode = {
                    id: s.id,
                    coord: [s.lat, s.lon],
                    lineKey: key,
                    platforms: platforms.length > 0 ? platforms : undefined,
                    group: undefined
                };

                if (!data[name]) {
                    data[name] = {
                        nodes: [node],
                        centroid: [s.lat, s.lon],
                        lines: [key]
                    };
                } else {
                    data[name].nodes.push(node);
                    if (!data[name].lines.includes(key)) data[name].lines.push(key);

                    const n = data[name].nodes.length;
                    data[name].centroid[0] = (data[name].centroid[0] * (n - 1) + s.lat) / n;
                    data[name].centroid[1] = (data[name].centroid[1] * (n - 1) + s.lon) / n;
                }
            });

        }

        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, lineIdMap]);

    return { visibleStations };
};

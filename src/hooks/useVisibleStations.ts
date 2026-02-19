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
                            stationLines.add(`${companyName}::${lineName}`);
                        }
                    });
                }

                const firstLine = Array.from(stationLines)[0] || "Unknown::Unknown";

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
                const node: StaticNode = {
                    id: s.id,
                    coord: [s.lat, s.lon],
                    lineKey: firstLine,
                    platforms: platforms.length > 0 ? platforms : undefined,
                    group: undefined
                };

                if (!data[name]) {
                    data[name] = {
                        nodes: [node],
                        centroid: [s.lat, s.lon],
                        lines: Array.from(stationLines)
                    };
                } else {
                    data[name].nodes.push(node);
                    stationLines.forEach(l => {
                        if (!data[name].lines.includes(l)) data[name].lines.push(l);
                    });

                    const n = data[name].nodes.length;
                    data[name].centroid[0] = (data[name].centroid[0] * (n - 1) + s.lat) / n;
                    data[name].centroid[1] = (data[name].centroid[1] * (n - 1) + s.lon) / n;
                }
            });

            // 2b. Load Joints
            if (railData.joints && railData.joints.joints) {
                railData.joints.joints.forEach((j: any) => {
                    const [lon, lat] = j.coordinates;
                    if (lat < bounds.s || lat > bounds.n || lon < bounds.w || lon > bounds.e) return;

                    const id = j.id;
                    const jointLines: string[] = [];
                    if (j.line_ids) {
                        j.line_ids.forEach((lid: number) => {
                            const lInfo = lineInfoMap.get(lid);
                            if (lInfo) {
                                const cName = companyNameMap.get(lInfo.companyId) || String(lInfo.companyId);
                                jointLines.push(`${cName}::${lInfo.name}`);
                            }
                        });
                    }

                    // For joints, we don't have a name, so we use ID as key
                    data[id] = {
                        nodes: [{
                            id: id,
                            coord: [lat, lon],
                            lineKey: jointLines[0] || ""
                        }],
                        centroid: [lat, lon],
                        lines: jointLines,
                        isJoint: true
                    };
                });
            }
        }

        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, lineIdMap]);

    return { visibleStations };
};

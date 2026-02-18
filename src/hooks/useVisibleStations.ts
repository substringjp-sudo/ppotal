import { useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { ProcessedStation, StaticNode } from '../types/mapTypes';

interface VisibleStationsProps {
    railroadNetwork: any;
    mapBounds: LatLngBounds | null;
    zoomLevel: number;
    lineIdMap: Map<string, string>;
    hierarchy: any;
    stationMasterList: any;
}

export const useVisibleStations = ({
    railroadNetwork,
    mapBounds,
    zoomLevel,
    lineIdMap,
    hierarchy,
    stationMasterList
}: VisibleStationsProps) => {

    const nameToLogicalLines = useMemo(() => {
        const mapping = new Map<string, Set<string>>();
        if (!hierarchy) return mapping;

        Object.entries(hierarchy).forEach(([company, lines]: [string, any]) => {
            Object.entries(lines).forEach(([lineName, stations]: [string, any]) => {
                const fullLineKey = `${company}::${lineName}`;
                stations.forEach((sName: string) => {
                    if (!mapping.has(sName)) mapping.set(sName, new Set());
                    mapping.get(sName)!.add(fullLineKey);
                });
            });
        });
        return mapping;
    }, [hierarchy]);

    const platformLookup = useMemo(() => {
        const lookup = new Map<string, { platforms: any, group: string }>();
        if (!stationMasterList || !hierarchy) return lookup;

        Object.entries(hierarchy).forEach(([company, lines]: [string, any]) => {
            Object.entries(lines).forEach(([lineName, stations]: [string, any]) => {
                stations.forEach((hs: any) => {
                    if (hs.group && stationMasterList[hs.group]) {
                        const platforms = stationMasterList[hs.group].stations;
                        const myEntry = platforms.find((st: any) => st.line === lineName && st.name === hs.name && st.company === company);
                        if (myEntry && (myEntry.geometries || myEntry.platforms)) {
                            const key = `${company}::${lineName}::${hs.name}`;
                            lookup.set(key, {
                                platforms: myEntry.geometries || myEntry.platforms,
                                group: hs.group
                            });
                        }
                    }
                });
            });
        });
        return lookup;
    }, [stationMasterList, hierarchy]);

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !mapBounds || zoomLevel <= 8) return null;
        const data: Record<string, ProcessedStation> = {};

        const bounds = {
            s: mapBounds.getSouth(),
            n: mapBounds.getNorth(),
            w: mapBounds.getWest(),
            e: mapBounds.getEast()
        };

        const stationEntries = Object.entries(railroadNetwork.stations);

        for (let i = 0; i < stationEntries.length; i++) {
            const [id, s] = stationEntries[i] as [string, any];
            if (!s || !s.coords || s.coords.length < 2) continue;
            const [lng, lat] = s.coords;

            // Spatial Culling
            if (lat < bounds.s || lat > bounds.n || lng < bounds.w || lng > bounds.e) continue;

            const parts = id.split('::');
            const company = parts[0];
            const lineSimplified = parts[1];
            const name = s.name;
            const simplifiedKey = `${company}::${lineSimplified}`;
            const key = lineIdMap.get(simplifiedKey) || simplifiedKey;

            const enriched = platformLookup.get(`${company}::${lineSimplified}::${name}`);
            const platforms = enriched?.platforms || s.platforms;
            const group = enriched?.group;

            const node: StaticNode = {
                id,
                coord: [lat, lng],
                lineKey: key,
                platforms,
                group
            };

            if (!data[name]) {
                const logicalLines = Array.from(nameToLogicalLines.get(name) || []);
                const allLines = new Set([key, ...logicalLines]);
                data[name] = {
                    nodes: [node],
                    centroid: [lat, lng],
                    lines: Array.from(allLines)
                };
            } else {
                data[name].nodes.push(node);
                if (!data[name].lines.includes(key)) data[name].lines.push(key);

                const logicalLines = nameToLogicalLines.get(name);
                if (logicalLines) {
                    logicalLines.forEach(l => {
                        if (!data[name].lines.includes(l)) data[name].lines.push(l);
                    });
                }

                const n = data[name].nodes.length;
                data[name].centroid[0] = (data[name].centroid[0] * (n - 1) + lat) / n;
                data[name].centroid[1] = (data[name].centroid[1] * (n - 1) + lng) / n;
            }
        }
        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, lineIdMap, nameToLogicalLines, platformLookup]);

    return { visibleStations, platformLookup };
};

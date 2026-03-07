import { useState, useEffect } from 'react';
import { RailData, NetworkLineData, HierarchyCompany, Platform } from '../types/railData';
import { decodePolyline } from '../utils/polyline';

function buildHierarchyFromLineData(
    lineData: NetworkLineData
): { companies: Record<string, HierarchyCompany> } {
    const result: Record<string, HierarchyCompany> = {};

    Object.entries(lineData).forEach(([lineId, ld]) => {
        const compId = String(ld.company_id);
        if (!result[compId]) {
            result[compId] = { id: ld.company_id, lines: {} };
        }
        result[compId].lines[lineId] = {
            id: ld.line_id,
            corp_id: ld.company_id,
            platforms: ld.stations.map(sid => ({ station_id: sid, platform_id: sid })),
            sections: ld.sections.map(Number)
        };
    });

    return { companies: result };
}

let cachedRailDataPromise: Promise<RailData> | null = null;

export const useRailData = () => {
    const [railData, setRailData] = useState<RailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                if (!cachedRailDataPromise) {
                    cachedRailDataPromise = (async () => {
                        const responses = await Promise.all([
                            fetch('/rail/companies.json'),
                            fetch('/rail/lines.json'),
                            fetch('/rail/platforms_meta.json'),
                            fetch('/rail/platforms_geom.json'),
                            fetch('/rail/stations_master.json'),
                            fetch('/rail/sections_meta.json'),
                            fetch('/rail/sections_geom_high.json'),
                            fetch('/rail/sections_geom_mid.json'),
                            fetch('/rail/sections_geom_low.json'),
                            fetch('/rail/railroad_network.json'),
                            fetch('/rail/joints.json'),
                            fetch('/rail/stations_lod.json')
                        ]);

                        for (const res of responses) {
                            if (!res.ok) {
                                console.error('Failed to fetch:', res.url);
                                throw new Error(`Failed to fetch ${res.url}: ${res.statusText}`);
                            }
                        }

                        const jsonData = await Promise.all(responses.map(res => res.json()));

                        const [
                            companies,
                            lines,
                            platformsMeta,
                            platformsGeom,
                            stationsMaster,
                            sectionsMeta,
                            sectionsGeomHigh,
                            sectionsGeomMid,
                            sectionsGeomLow,
                            railroadNetwork,
                            joints,
                            stationsLod
                        ] = jsonData;

                        // Reconstruct Platforms
                        const platforms: Record<string, Platform> = {};
                        for (const id in platformsMeta) {
                            platforms[id] = {
                                ...platformsMeta[id],
                                geometries: (platformsGeom[id] || []).map((poly: string) => decodePolyline(poly))
                            } as unknown as Platform;
                        }

                        // Reconstruct Sections
                        const reconstructSections = (geomData: Record<string, string>) => {
                            if (!geomData) return [];
                            return Object.keys(geomData).map(id => ({
                                id: parseInt(id),
                                ...sectionsMeta[id],
                                geometry: decodePolyline(geomData[id])
                            }));
                        };

                        const sectionsHigh = reconstructSections(sectionsGeomHigh);
                        const sectionsMid = reconstructSections(sectionsGeomMid);
                        const sectionsLow = reconstructSections(sectionsGeomLow);

                        return {
                            companies,
                            lines,
                            platforms,
                            stations: stationsMaster,
                            sections: {
                                sections: sectionsHigh,
                                lod: {
                                    high: sectionsHigh,
                                    mid: sectionsMid,
                                    low: sectionsLow
                                }
                            },
                            railroadGraph: {
                                stationGraph: railroadNetwork.station_graph
                            },
                            railroadNetwork,
                            hierarchy: buildHierarchyFromLineData(railroadNetwork.line_data),
                            joints,
                            stationsLod
                        } as RailData;
                    })();
                }

                const data = await cachedRailDataPromise;
                setRailData(data);
            } catch (err) {
                console.error("Error loading rail data:", err);
                setError(err instanceof Error ? err : new Error('Unknown error loading rail data'));
                cachedRailDataPromise = null; // Clear cache on error
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    return { railData, isLoading, error };
};

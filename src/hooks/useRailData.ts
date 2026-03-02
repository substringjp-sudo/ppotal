import { useState, useEffect } from 'react';
import { RailData } from '../types/railData';
import { decodePolyline } from '../utils/polyline';

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
                            fetch('/rail/station_graph.json'),
                            fetch('/rail/platform_graph.json'),
                            fetch('/rail/railroad_hierarchy.json'),
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
                            stationGraph,
                            platformGraph,
                            hierarchy,
                            joints,
                            stationsLod
                        ] = jsonData;

                        // Reconstruct Platforms
                        const platforms: Record<string, any> = {};
                        for (const id in platformsMeta) {
                            platforms[id] = {
                                ...platformsMeta[id],
                                geometries: (platformsGeom[id] || []).map((poly: string) => decodePolyline(poly))
                            };
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
                                stationGraph,
                                platformGraph
                            },
                            hierarchy,
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

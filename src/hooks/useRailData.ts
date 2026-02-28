import { useState, useEffect } from 'react';
import { RailData } from '../types/railData';

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
                            fetch('/rail/platforms.json'),
                            fetch('/rail/stations.json'),
                            fetch('/rail/sections.json'),
                            fetch('/rail/sections_mid.json'),
                            fetch('/rail/sections_low.json'),
                            fetch('/rail/railroad_graph.json'),
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
                            platforms,
                            stations,
                            sectionsHigh,
                            sectionsMid,
                            sectionsLow,
                            railroadGraph,
                            hierarchy,
                            joints,
                            stationsLod
                        ] = jsonData;

                        return {
                            companies,
                            lines,
                            platforms,
                            stations,
                            sections: {
                                sections: sectionsHigh.sections,
                                lod: {
                                    high: sectionsHigh.sections,
                                    mid: sectionsMid.sections,
                                    low: sectionsLow.sections
                                }
                            },
                            railroadGraph,
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

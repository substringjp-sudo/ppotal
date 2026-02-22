import { useState, useEffect } from 'react';
import { RailData, Section } from '../types/railData';

export const useRailData = () => {
    const [railData, setRailData] = useState<RailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [
                    companiesRes,
                    linesRes,
                    platformsRes,
                    stationsRes,
                    sectionsHighRes,
                    sectionsMidRes,
                    sectionsLowRes,
                    graphRes,
                    hierarchyRes,
                    jointsRes
                ] = await Promise.all([
                    fetch('/rail/companies.json'),
                    fetch('/rail/lines.json'),
                    fetch('/rail/platforms.json'),
                    fetch('/rail/stations.json'),
                    fetch('/rail/sections.json'),
                    fetch('/rail/sections_mid.json'),
                    fetch('/rail/sections_low.json'),
                    fetch('/rail/railroad_graph.json'),
                    fetch('/rail/railroad_hierarchy.json'),
                    fetch('/rail/joints.json')
                ]);

                if (!companiesRes.ok || !linesRes.ok || !platformsRes.ok || !stationsRes.ok ||
                    !sectionsHighRes.ok || !sectionsMidRes.ok || !sectionsLowRes.ok ||
                    !hierarchyRes.ok || !jointsRes.ok) {
                    throw new Error('Failed to fetch one or more rail data files');
                }

                const [companies, lines, platforms, stations, sectionsHigh, sectionsMid, sectionsLow, hierarchy, joints] = await Promise.all([
                    companiesRes.json(),
                    linesRes.json(),
                    platformsRes.json(),
                    stationsRes.json(),
                    sectionsHighRes.json(),
                    sectionsMidRes.json(),
                    sectionsLowRes.json(),
                    hierarchyRes.json(),
                    jointsRes.json()
                ]);

                const railroadGraph = graphRes.ok ? await graphRes.json() : undefined;

                setRailData({
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
                    joints
                });
            } catch (err) {
                console.error("Error loading rail data:", err);
                setError(err instanceof Error ? err : new Error('Unknown error loading rail data'));
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    return { railData, isLoading, error };
};

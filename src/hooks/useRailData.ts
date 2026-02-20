import { useState, useEffect } from 'react';
import { RailData } from '../types/railData';

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
                    sectionsRes,
                    hierarchyRes,
                    jointsRes
                ] = await Promise.all([
                    fetch('/rail/companies.json'),
                    fetch('/rail/lines.json'),
                    fetch('/rail/platforms.json'),
                    fetch('/rail/stations.json'),
                    fetch('/rail/sections.json'),
                    fetch('/rail/railroad_hierarchy.json'),
                    fetch('/rail/joints.json')
                ]);

                if (!companiesRes.ok || !linesRes.ok || !platformsRes.ok || !stationsRes.ok || !sectionsRes.ok || !hierarchyRes.ok || !jointsRes.ok) {
                    throw new Error('Failed to fetch one or more rail data files');
                }

                const companies = await companiesRes.json();
                const lines = await linesRes.json();
                const platforms = await platformsRes.json();
                const stations = await stationsRes.json();
                const sections = await sectionsRes.json();
                const hierarchy = await hierarchyRes.json();
                const joints = await jointsRes.json();

                setRailData({
                    companies,
                    lines,
                    platforms,
                    stations,
                    sections,
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

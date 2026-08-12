"use client";

import { useState, useEffect } from 'react';
import { RegionNames } from '../lib/i18n-utils';

let cachedRegionNames: RegionNames | null = null;
let fetchPromise: Promise<RegionNames> | null = null;

/**
 * Shared hook that fetches and caches region_names.json once across
 * all components. Eliminates the previous pattern of 8 separate
 * fetches of the same file.
 */
export const useRegionNames = (): RegionNames | null => {
    const [regionNames, setRegionNames] = useState<RegionNames | null>(cachedRegionNames);

    useEffect(() => {
        if (cachedRegionNames) {
            setRegionNames(cachedRegionNames);
            return;
        }

        if (!fetchPromise) {
            fetchPromise = fetch('/data/region_names.json')
                .then(res => res.json())
                .then((data: RegionNames) => {
                    cachedRegionNames = data;
                    return data;
                })
                .catch(err => {
                    console.error("Failed to load region names:", err);
                    fetchPromise = null;
                    return null as any;
                });
        }

        fetchPromise.then(data => {
            if (data) setRegionNames(data);
        });
    }, []);

    return regionNames;
};

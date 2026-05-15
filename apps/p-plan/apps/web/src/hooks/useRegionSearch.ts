'use client';

import { useState, useCallback } from 'react';
import { searchRegions } from '@pplaner/shared';

export interface RegionMetadata {
    id: string; // Changed to string for standardized IDs
    name: string;
    code?: string;
    country?: string;
    prefecture?: string;
    type: 'country' | 'prefecture' | 'city';
    parentName?: string;
}

export function useRegionSearch() {
    const [isSearching, setIsSearching] = useState(false);

    const search = useCallback(async (query: string): Promise<RegionMetadata[]> => {
        if (!query || query.length < 1) return [];
        
        setIsSearching(true);
        try {
            // 서버 사이드 검색 호출
            const results = await searchRegions(query);
            return results as RegionMetadata[];
        } catch (error) {
            console.error('[useRegionSearch] Search failed:', error);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, []);

    return { search, isSearching, isLoaded: true }; // isLoaded is always true now since we don't pre-load
}

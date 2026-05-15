import { useState, useCallback } from 'react';
import { AIRPORTS, Airport, CORE_AIRLINES, Airline, functions } from '@pplaner/shared';
import { httpsCallable } from 'firebase/functions';

export function useAviation() {
    const [loading, setLoading] = useState(false);

    const searchAirports = useCallback(async (query: string, options?: { departureCode?: string, location?: { lat: number, lng: number }, limit?: number }) => {
        setLoading(true);
        try {
            const searchAviationData = httpsCallable(functions, 'searchAviationData');
            const result = await searchAviationData({
                type: 'airport',
                query,
                departureCode: options?.departureCode,
                location: options?.location,
                limit: options?.limit
            });

            const results = result.data as Airport[];
            
            // Local search for broader matching (Korean names, cities, countries)
            const term = query.toLowerCase();
            const localMatches = AIRPORTS.filter(a => 
                a.code.toLowerCase().includes(term) || 
                a.nameKo.toLowerCase().includes(term) || 
                a.nameEn.toLowerCase().includes(term) ||
                (a.regionIds.cityName && a.regionIds.cityName.toLowerCase().includes(term)) ||
                (a.regionIds.countryName && a.regionIds.countryName.toLowerCase().includes(term))
            );

            // Merge server results with local matches, prioritizing core airport data
            const combined = [...results];
            localMatches.forEach(local => {
                if (!combined.some(c => c.code === local.code)) {
                    combined.push(local);
                }
            });

            return combined.map(r => {
                const core = AIRPORTS.find(c => c.code === r.code);
                if (core) return { ...r, nameKo: core.nameKo, timezone: core.timezone, regionIds: core.regionIds };
                
                // Fallback for non-core airports from server
                return {
                    ...r,
                    nameKo: r.nameKo || r.nameEn,
                    regionIds: r.regionIds || {}
                };
            }).slice(0, 15);
        } catch (error) {
            console.error('Failed to search airports via server:', error);
            const term = query.toLowerCase();
            return AIRPORTS.filter(a => 
                a.code.toLowerCase().includes(term) || 
                a.nameKo.toLowerCase().includes(term) || 
                a.nameEn.toLowerCase().includes(term) ||
                (a.regionIds.cityName && a.regionIds.cityName.toLowerCase().includes(term)) ||
                (a.regionIds.countryName && a.regionIds.countryName.toLowerCase().includes(term))
            ).slice(0, 10);
        } finally {
            setLoading(false);
        }
    }, []);

    const searchAirlines = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const searchAviationData = httpsCallable(functions, 'searchAviationData');
            const result = await searchAviationData({
                type: 'airline',
                query
            });

            const results = result.data as Airline[];
            const term = query.toLowerCase();

            // Local search for broader matching (Korean names, English names, Codes)
            const localMatches = CORE_AIRLINES.filter(a => 
                a.code.toLowerCase().includes(term) || 
                a.nameKo.toLowerCase().includes(term) || 
                a.nameEn.toLowerCase().includes(term)
            );

            // Merge server results with local matches, prioritizing core airline data
            const combined = [...results];
            localMatches.forEach(local => {
                if (!combined.some(c => c.code === local.code)) {
                    combined.push(local);
                }
            });

            return combined.map(r => {
                const core = CORE_AIRLINES.find(c => c.code === r.code);
                if (core) return { ...r, nameKo: core.nameKo, nameEn: core.nameEn, countryKo: core.countryKo };
                return r;
            }).slice(0, 15);
        } catch (error) {
            console.error('Failed to search airlines via server:', error);
            const term = query.toLowerCase();
            return CORE_AIRLINES.filter(a => 
                a.code.toLowerCase().includes(term) || 
                a.nameKo.toLowerCase().includes(term) ||
                a.nameEn.toLowerCase().includes(term)
            ).slice(0, 15);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        searchAirports,
        searchAirlines
    };
}

"use client";

import React, { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { backgroundCanvas } from './Map';
import { getRegionevelShapeId, padId } from '@ppotal/firebase';

interface MunicipalMapProps {
    municipalities: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
    zoom: number;
    pane?: string;
    regionevelVisits?: any[];
}

// Regionevel Scoring Constants (Local Backup to avoid dependency overhead)
const VISIT_CONFIG: Record<string, { maxCount: number; pointsPerCount: number }> = {
    pass: { maxCount: 5, pointsPerCount: 1 },
    transit: { maxCount: 5, pointsPerCount: 2 },
    visit: { maxCount: 3, pointsPerCount: 5 },
    stay: { maxCount: 3, pointsPerCount: 10 },
    residence: { maxCount: 1, pointsPerCount: 40 },
};

const MunicipalMap: React.FC<MunicipalMapProps> = ({ municipalities, zoom, pane, regionevelVisits }) => {
    const style = useCallback((feature?: any) => {
        let weight = 1;
        if (zoom <= 9) weight = 0.5;

        let fillColor = '#ffffff';
        let fillOpacity = 1.0;

        // Extract city ID (c1, c2, etc.) from feature properties
        const jprailCityId = feature?.properties?.id || feature?.id;
        const shapeId = feature?.properties?.shapeID || (jprailCityId ? getRegionevelShapeId(jprailCityId) : undefined);

        if (shapeId && regionevelVisits && regionevelVisits.length > 0) {
            // Find visits matching this region ID
            const normalizedShapeId = padId(shapeId);
            const cityVisits = regionevelVisits.filter(v => padId(v.regionId) === normalizedShapeId);

                if (cityVisits.length > 0) {
                    let directScore = 0;
                    cityVisits.forEach(v => {
                        const cfg = VISIT_CONFIG[v.category];
                        if (cfg) {
                            const clamped = Math.min(v.count || 0, cfg.maxCount);
                            directScore += clamped * cfg.pointsPerCount;
                        }
                    });

                    const score = Math.round(Math.min(100, directScore));
                    if (score > 0) {
                        // Blue palette matching Regionevel scoring.ts
                        if (score < 8) fillColor = '#93c5fd';       // Blue 300
                        else if (score < 18) fillColor = '#60a5fa';  // Blue 400
                        else if (score < 31) fillColor = '#3b82f6';  // Blue 500
                        else if (score < 51) fillColor = '#2563eb';  // Blue 600
                        else fillColor = '#1e3a8a';                  // Blue 900
                        
                        fillOpacity = 0.75; // Render more visibly (75% opacity) against white background
                    }
                }
            }

        return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            weight: weight,
            opacity: 0.6,
            color: '#f5f5f5',
            smoothFactor: 1.0,
        };
    }, [zoom, regionevelVisits]);

    const pathOptions = useMemo(() => ({
        renderer: backgroundCanvas || undefined
    }), []);

    const geoJsonKey = useMemo(() => {
        const visitsHash = regionevelVisits ? JSON.stringify(regionevelVisits).slice(-50) : "empty";
        return `geojson-muni-${visitsHash}`;
    }, [regionevelVisits]);

    if (!municipalities) {
        return null;
    }

    return (
        <GeoJSON
            key={geoJsonKey}
            data={municipalities}
            style={style}
            interactive={false}
            pathOptions={pathOptions}
            pane={pane}
        />
    );
};

const MemoizedMunicipalMap = React.memo(MunicipalMap);
MemoizedMunicipalMap.displayName = 'MunicipalMap';
export default MemoizedMunicipalMap;

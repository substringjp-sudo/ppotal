"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

interface MunicipalMapProps {
    municipalities: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
    zoom: number;
}

const MunicipalMap: React.FC<MunicipalMapProps> = ({ municipalities, zoom }) => {
    const style = useCallback(() => {
        let weight = 1;
        if (zoom <= 9) weight = 0.5;

        // Removed simplification (smoothFactor) to avoid gaps between neighboring city/town boundaries.
        // Keeping the geometry as is to maintain visual integrity.
        return {
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: weight,
            opacity: 0.6,
            color: '#f5f5f5',
            smoothFactor: 1.0,
        };
    }, [zoom]);

    if (!municipalities) {
        return null;
    }

    return (
        <GeoJSON
            data={municipalities}
            style={style}
            interactive={false}
        />
    );
};

const MemoizedMunicipalMap = React.memo(MunicipalMap);
MemoizedMunicipalMap.displayName = 'MunicipalMap';
export default MemoizedMunicipalMap;

"use client";

import React, { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { sharedCanvasRenderer } from './Map';

interface MunicipalMapProps {
    municipalities: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
    zoom: number;
    pane?: string;
}

const MunicipalMap: React.FC<MunicipalMapProps> = ({ municipalities, zoom, pane }) => {
    const style = useCallback(() => {
        let weight = 1;
        if (zoom <= 9) weight = 0.5;

        return {
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: weight,
            opacity: 0.6,
            color: '#f5f5f5',
            smoothFactor: 1.0,
        };
    }, [zoom]);

    const pathOptions = useMemo(() => ({
        renderer: sharedCanvasRenderer || undefined
    }), []);

    if (!municipalities) {
        return null;
    }

    return (
        <GeoJSON
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

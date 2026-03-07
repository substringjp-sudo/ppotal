"use client";

import React, { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { FeatureCollection, Feature } from 'geojson';
import { backgroundCanvas } from './Map';

interface AirportLayerProps {
    data: FeatureCollection;
    zoom: number;
    pane?: string;
}

const AirportLayer: React.FC<AirportLayerProps> = ({ data, zoom, pane }) => {
    const style = useCallback(() => {
        return {
            fillColor: '#3a86ff',
            fillOpacity: 0.6,
            weight: zoom > 10 ? 2 : 1,
            opacity: 0.8,
            color: '#023e8a',
            smoothFactor: 1.0,
        };
    }, [zoom]);

    const pathOptions = useMemo(() => ({
        renderer: backgroundCanvas || undefined
    }), []);

    if (!data) return null;

    return (
        <GeoJSON
            data={data}
            style={style}
            pathOptions={pathOptions}
            pane={pane}
            onEachFeature={(feature: Feature, layer: L.Layer) => {
                if (feature.properties && feature.properties.C28_005) {
                    layer.bindTooltip(feature.properties.C28_005, {
                        permanent: zoom > 12,
                        direction: 'center',
                        className: 'airport-label'
                    });
                }
            }}
        />
    );
};

export default React.memo(AirportLayer);

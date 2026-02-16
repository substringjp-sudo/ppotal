"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

interface MunicipalMapProps {
    municipalities: any;
    className?: string; // Kept in interface
    getColor?: (name: string) => string; // Optional if not used
    zoom: number;
}

const MunicipalMap: React.FC<MunicipalMapProps> = ({ municipalities, className, zoom }) => {
    const style = useCallback(() => {
        let weight = 1;
        if (zoom <= 9) weight = 0.5;

        return {
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: weight,
            opacity: 0.6,
            color: '#f5f5f5',
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

export default React.memo(MunicipalMap);

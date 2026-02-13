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
            fillColor: '#F5F5F5',
            fillOpacity: 0.4,
            weight: weight,
            opacity: 1,
            color: '#CCCCCC',
        };
    }, [zoom]);

    if (!municipalities) {
        return null;
    }

    return (
        <GeoJSON
            data={municipalities}
            style={style}
        />
    );
};

export default React.memo(MunicipalMap);

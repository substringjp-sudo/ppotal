"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const MunicipalMap = ({ municipalities, className, zoom }) => {
    const style = useCallback(() => {
        let weight = 1;
        if (zoom <= 9) weight = 0.5;

        return {
            fillColor: '#FFFFFF', // This color won't be visible
            fillOpacity: 0,      // Make the fill transparent
            weight: weight,           // Border weight
            opacity: 1,
            color: '#444444',    // Dark gray border
        };
    }, [zoom]);

    if (!municipalities) {
        return null;
    }

    return (
        <GeoJSON
            className={className}
            data={municipalities}
            style={style}
        />
    );
};

export default React.memo(MunicipalMap);

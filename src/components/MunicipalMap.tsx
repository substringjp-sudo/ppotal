"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const MunicipalMap = ({ municipalities, getColor }) => {
    if (!municipalities) {
        return null;
    }

    const style = useCallback((feature) => {
        return {
            fillColor: '#FFFFFF', // This color won't be visible
            fillOpacity: 0,      // Make the fill transparent
            weight: 1,           // Border weight
            opacity: 1,
            color: '#444444',    // Dark gray border
        };
    }, [getColor]);

    return (
        <GeoJSON 
            data={municipalities} 
            style={style} 
        />
    );
};

export default React.memo(MunicipalMap);

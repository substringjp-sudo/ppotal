"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const Railroads = ({ railroads, selectedLines, onRailroadClick, getColor }) => {
    if (!railroads) {
        return null;
    }

    const style = useCallback((feature) => {
        const lineName = feature.properties.N02_003; // N02_003 is the line name
        const isSelected = selectedLines.includes(feature.properties.N02_002);
        
        return {
            color: isSelected ? '#FFFF00' : getColor(lineName),
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.5,
        };
    }, [selectedLines, getColor]);

    const onEachFeature = (feature, layer) => {
        layer.on({
            click: () => {
                if (onRailroadClick) {
                    onRailroadClick(feature.properties.N02_002);
                }
            },
        });
    };

    return (
        <GeoJSON 
            data={railroads} 
            style={style} 
            onEachFeature={onEachFeature}
        />
    );
};

export default React.memo(Railroads);

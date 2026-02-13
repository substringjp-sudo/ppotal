"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const Railroads = ({ railroads, selectedLines, onRailroadClick, getColor, className, zoom }) => {
    const [hoveredLineKey, setHoveredLineKey] = React.useState(null);

    const style = useCallback((feature) => {
        const lineName = feature.properties.N02_003;
        const key = `${feature.properties.N02_004}::${lineName}`;
        const isSelected = selectedLines.includes(key);
        const isHovered = hoveredLineKey === key;

        return {
            color: getColor(key),
            weight: isHovered ? 6 : (isSelected ? 4 : 2),
            opacity: isSelected ? 1 : 0,
        };
    }, [selectedLines, getColor, hoveredLineKey]);

    const filter = useCallback((feature) => {
        if (selectedLines.length === 0) return true;
        const key = `${feature.properties.N02_004}::${feature.properties.N02_003}`;
        return selectedLines.includes(key);
    }, [selectedLines]);

    if (!railroads) {
        return null;
    }

    const onEachFeature = (feature, layer) => {
        const lineName = feature.properties.N02_003;
        const key = `${feature.properties.N02_004}::${lineName}`;

        layer.bindTooltip(lineName, { sticky: true });

        layer.on({
            mouseover: () => setHoveredLineKey(key),
            mouseout: () => setHoveredLineKey(null),
        });
    };

    return (
        <GeoJSON
            className={className || "railroads-layer"}
            data={railroads}
            style={style}
            filter={filter}
            onEachFeature={onEachFeature}
            smoothFactor={1.5}
        />
    );
};

export default React.memo(Railroads);

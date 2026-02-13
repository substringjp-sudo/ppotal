"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const JapanMap = ({ prefectures, onPrefectureClick, getColor, outlineOnly = false, interactive = true }) => {
    if (!prefectures) {
        return null;
    }

    const handleClick = useCallback((feature) => {
        if (onPrefectureClick) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback((feature) => {
        if (outlineOnly) {
            return {
                weight: 3,
                color: '#444444',
                fillOpacity: 0,
            };
        }
        return {
            fillColor: getColor(feature.properties.shapeName),
            weight: 1.5,
            opacity: 1,
            color: '#444444',
            fillOpacity: 0.7,
        };
    }, [getColor, outlineOnly]);

    const onEachFeature = (feature, layer) => {
        if (interactive && onPrefectureClick) {
            layer.on({
                click: () => handleClick(feature),
            });
        }
    };

    return (
        <GeoJSON 
            data={prefectures} 
            style={style} 
            onEachFeature={onEachFeature} 
        />
    );
};

export default React.memo(JapanMap);

"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

const JapanMap = ({ prefectures, onPrefectureClick, getColor, outlineOnly = false, interactive = true, className, zoom }) => {
    const handleClick = useCallback((feature) => {
        if (onPrefectureClick) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback((feature) => {
        if (outlineOnly) {
            let weight = 3;
            if (zoom <= 7) weight = 1;
            else if (zoom <= 9) weight = 2;

            return {
                weight: weight,
                color: '#444444',
                fillOpacity: 0,
            };
        }

        let weight = 1.5;
        if (zoom <= 7) weight = 1;

        return {
            fillColor: getColor(feature.properties.shapeName),
            weight: weight,
            opacity: 1,
            color: '#444444',
            fillOpacity: 0.7,
        };
    }, [getColor, outlineOnly, zoom]);

    if (!prefectures) {
        return null;
    }

    const onEachFeature = (feature, layer) => {
        if (interactive && onPrefectureClick) {
            layer.on({
                click: () => handleClick(feature),
            });
        }
    };

    return (
        <GeoJSON
            className={className}
            data={prefectures}
            style={style}
            onEachFeature={onEachFeature}
        />
    );
};

export default React.memo(JapanMap);

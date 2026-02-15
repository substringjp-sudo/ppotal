"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

interface JapanMapProps {
    prefectures: any;
    onPrefectureClick?: (prefName: string) => void;
    getColor: (name: string) => string;
    outlineOnly?: boolean;
    interactive?: boolean;
    className?: string; // Kept in interface but might not be used in GeoJSON
    zoom: number;
}

const JapanMap: React.FC<JapanMapProps> = ({ prefectures, onPrefectureClick, getColor, outlineOnly = false, interactive = true, className, zoom }) => {
    const handleClick = useCallback((feature: any) => {
        if (onPrefectureClick) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback((feature: any) => {
        if (outlineOnly) {
            let weight = 1.5;
            if (zoom <= 7) weight = 0.5;
            else if (zoom <= 9) weight = 1.0;

            return {
                weight: weight,
                color: '#888888',
                opacity: 0.5,
                fillOpacity: 0,
            };
        }

        let weight = 1.5;
        if (zoom <= 7) weight = 1;

        return {
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: weight,
            opacity: 1,
            color: '#CCCCCC',
        };
    }, [getColor, outlineOnly, zoom]);

    if (!prefectures) {
        return null;
    }

    const onEachFeature = (feature: any, layer: any) => {
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
            interactive={interactive}
        />
    );
};

export default React.memo(JapanMap);

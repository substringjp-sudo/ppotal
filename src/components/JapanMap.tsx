"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';

interface JapanMapProps {
    prefectures: any;
    onPrefectureClick?: (prefName: string) => void;
    getColor: (name: string) => string;
    outlineOnly?: boolean;
    interactive?: boolean;
    className?: string;
    zoom: number;
}

const JapanMap: React.FC<JapanMapProps> = ({ prefectures, onPrefectureClick, getColor, outlineOnly = false, interactive = true, className, zoom }) => {
    const handleClick = useCallback((feature: any) => {
        if (onPrefectureClick) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback((feature: any) => {
        // Removed simplification (smoothFactor) to avoid gaps between neighboring boundaries.
        if (outlineOnly) {
            let weight = 1.5;
            const z = Math.round(zoom); // Round zoom for stable styles
            if (z <= 7) weight = 0.5;
            else if (z <= 9) weight = 1.0;

            return {
                weight: weight,
                color: '#dddddd',
                opacity: 0.4,
                fillOpacity: 0,
            };
        }

        let weight = 1.5;
        if (Math.round(zoom) <= 7) weight = 1;

        return {
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: weight,
            opacity: 0.8,
            color: '#eeeeee',
        };
    }, [outlineOnly, zoom]);

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
            {...({ smoothFactor: zoom <= 8 ? 2.5 : 1.0 } as any)}
        />
    );
};

export default React.memo(JapanMap);

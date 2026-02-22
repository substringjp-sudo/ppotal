"use client";

import React, { useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';

interface JapanMapProps {
    prefectures: GeoJSON.FeatureCollection | GeoJSON.Feature;
    onPrefectureClick?: (prefName: string) => void;
    outlineOnly?: boolean;
    interactive?: boolean;
    zoom: number;
}

const JapanMap: React.FC<JapanMapProps> = ({ prefectures, onPrefectureClick, outlineOnly = false, interactive = true, zoom }) => {
    const handleClick = useCallback((feature: GeoJSON.Feature) => {
        if (onPrefectureClick && feature.properties) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback(() => {
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

    const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
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

const MemoizedJapanMap = React.memo(JapanMap);
MemoizedJapanMap.displayName = 'JapanMap';
export default MemoizedJapanMap;

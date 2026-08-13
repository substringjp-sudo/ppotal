"use client";

import React, { useCallback, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { backgroundCanvas } from './Map';
import { shapeGeometry, MapShapeMode } from '../lib/lineShapes';
import { MapTheme } from '../lib/mapThemes';

interface JapanMapProps {
    prefectures: GeoJSON.FeatureCollection | GeoJSON.Feature;
    onPrefectureClick?: (prefName: string) => void;
    outlineOnly?: boolean;
    interactive?: boolean;
    zoom: number;
    pane?: string;
    theme: MapTheme;
    /** The coastline follows whatever shape the network is drawn in. */
    shapeMode: MapShapeMode;
    /** Hidden when the land is being drawn as a lattice of tiles instead. */
    hidden?: boolean;
}

const JapanMap: React.FC<JapanMapProps> = ({ prefectures, onPrefectureClick, outlineOnly = false, interactive = true, zoom, pane, theme, shapeMode, hidden = false }) => {
    const handleClick = useCallback((feature: GeoJSON.Feature) => {
        if (onPrefectureClick && feature.properties) {
            onPrefectureClick(feature.properties.shapeName);
        }
    }, [onPrefectureClick]);

    const style = useCallback(() => {
        if (outlineOnly) {
            let weight = 1.5;
            const z = Math.round(zoom);
            if (z <= 7) weight = 0.5;
            else if (z <= 9) weight = 1.0;

            return {
                weight: weight,
                color: theme.landEdge,
                opacity: 0.55,
                fillOpacity: 0,
                smoothFactor: 1.0,
            };
        }

        let weight = 1.5;
        if (Math.round(zoom) <= 7) weight = 1;

        return {
            fillColor: theme.land,
            fillOpacity: 1.0,
            weight: weight,
            opacity: 0.8,
            color: theme.landEdge,
            smoothFactor: 1.0,
        };
    }, [outlineOnly, zoom, theme]);

    const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
        if (interactive && onPrefectureClick) {
            layer.on({
                click: () => handleClick(feature),
            });
        }
    };

    const pathOptions = useMemo(() => ({
        renderer: backgroundCanvas || undefined
    }), []);

    // The coastline is put through the same transform as the rails, so a
    // schematic network sits on a schematic country rather than a photo of one.
    const shaped = useMemo(() => {
        if (shapeMode === 'geographic' || !prefectures) return prefectures;
        const reshapeRings = (rings: number[][][]) =>
            rings.map(ring => shapeGeometry(ring as [number, number][], shapeMode));
        const reshape = (feature: GeoJSON.Feature): GeoJSON.Feature => {
            const geometry = feature.geometry;
            if (!geometry) return feature;
            if (geometry.type === 'Polygon') {
                return { ...feature, geometry: { ...geometry, coordinates: reshapeRings(geometry.coordinates as number[][][]) } } as GeoJSON.Feature;
            }
            if (geometry.type === 'MultiPolygon') {
                return {
                    ...feature,
                    geometry: {
                        ...geometry,
                        coordinates: (geometry.coordinates as number[][][][]).map(reshapeRings)
                    }
                } as GeoJSON.Feature;
            }
            return feature;
        };
        if ('features' in prefectures) {
            return { ...prefectures, features: prefectures.features.map(reshape) } as GeoJSON.FeatureCollection;
        }
        return reshape(prefectures as GeoJSON.Feature);
    }, [prefectures, shapeMode]);

    if (!prefectures || hidden) {
        return null;
    }

    return (
        <GeoJSON
            data={shaped as GeoJSON.FeatureCollection}
            style={style}
            onEachFeature={onEachFeature}
            interactive={interactive}
            pathOptions={pathOptions}
            pane={pane}
        />
    );
};

const MemoizedJapanMap = React.memo(JapanMap);
MemoizedJapanMap.displayName = 'JapanMap';
export default MemoizedJapanMap;

"use client";

import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { getOfficialColor } from '../lib/lineColors';

interface RailroadLayerProps {
    railroadNetwork: any;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
}

const RailroadLayer: React.FC<RailroadLayerProps> = ({
    railroadNetwork,
    selectedLines,
    activeLine,
    hoveredLine,
    onRailroadClick,
    onRailroadHover,
    zoomLevel
}) => {
    // Optimization: Use a Set for fast visibility lookups
    const selectionSet = useMemo(() => new Set(selectedLines), [selectedLines]);
    const isNoneExplicitlySelected = useMemo(() => selectionSet.has("__NONE__"), [selectionSet]);
    const isFilterActive = useMemo(() => {
        if (isNoneExplicitlySelected) return true;
        if (selectionSet.size === 0) return false;
        // If only the active line is in the selection, we don't treat it as a background-hiding filter.
        if (selectionSet.size === 1 && activeLine && selectionSet.has(activeLine)) return false;
        return true;
    }, [selectionSet, isNoneExplicitlySelected, activeLine]);

    // 1. Convert ALL routes to GeoJSON (Memoized)
    const geoJsonData = useMemo(() => {
        if (!railroadNetwork || !railroadNetwork.routes) return null;

        const features: any[] = [];
        const routes = railroadNetwork.routes;

        routes.forEach((route: any) => {
            if (!route) return;
            const lineId = route.id;

            let coordinates: number[][][] = [];
            if (route.routeGeometry) {
                coordinates = route.routeGeometry;
            } else if (route.edges) {
                coordinates = route.edges.map((edge: any) => edge.geometry);
            }

            if (coordinates.length === 0) return;

            features.push({
                type: 'Feature',
                properties: {
                    id: lineId,
                    name: route.line || route.name || '',
                    company: route.company,
                    color: getOfficialColor(lineId) || route.color || '#999',
                    endpoints: route.stations ? `${route.stations[0]} \u2192 ${route.stations[route.stations.length - 1]}` : ''
                },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: coordinates
                }
            });
        });

        return {
            type: 'FeatureCollection',
            features: features
        };
    }, [railroadNetwork]);

    // 2. Style Function
    const style = (feature: any) => {
        if (!feature) return {};

        const id = feature.properties.id;
        const isClicked = activeLine === id;
        const isHovered = hoveredLine === id;

        // Visibility Logic
        let isVisible = false;
        if (isNoneExplicitlySelected) {
            isVisible = isClicked; // Only show what is specifically clicked
        } else if (!isFilterActive) {
            isVisible = true; // Show all by default (context mode)
        } else {
            isVisible = selectionSet.has(id) || isClicked;
        }

        // Base Style (Invisible / Faded Gray)
        let color = '#999999';
        let weight = zoomLevel >= 12 ? 4 : 2;
        let opacity = 0.4;
        let dashArray: string | undefined = '4, 8';

        // 1. Visible Road (Solid / Original Color)
        if (isVisible) {
            color = feature.properties.color;
            opacity = 0.8;
            dashArray = undefined;
            weight = zoomLevel >= 12 ? 6 : (zoomLevel >= 10 ? 4 : 2);
        }

        // 2. Clicked Road (Active) -> Blue, Thick, Solid
        if (isClicked) {
            color = '#007AFF';
            weight = 8;
            opacity = 1.0;
            dashArray = undefined;
        }

        // 3. Hovered Road -> Yellow Solid 
        if (isHovered) {
            color = '#FFD700';
            weight = 8;
            opacity = 1.0;
            dashArray = undefined;
        }

        return {
            color,
            weight,
            opacity,
            dashArray,
            lineCap: 'round',
            lineJoin: 'round'
        } as L.PathOptions;
    };

    // 3. Event Handlers
    const onEachFeature = (feature: any, layer: L.Layer) => {
        const { name, company, endpoints } = feature.properties;
        const tooltipContent = `
            <div style="text-align: center;">
                <div style="font-weight: bold;">${name}</div>
                <div style="font-size: 0.8em; color: #666;">${company}</div>
                ${endpoints ? `<div style="font-size: 0.7em; color: #888;">(${endpoints})</div>` : ''}
            </div>
        `;
        layer.bindTooltip(tooltipContent, {
            sticky: true,
            direction: 'top',
            offset: [0, -10],
            opacity: 0.9,
            className: 'railroad-tooltip'
        });

        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                onRailroadClick(feature.properties.id);
            },
            mouseover: (e) => {
                const target = e.target as L.Path;
                target.openTooltip();
                onRailroadHover(feature.properties.id);
            },
            mouseout: (e) => {
                const target = e.target as L.Path;
                target.closeTooltip();
                onRailroadHover(null);
            }
        });
    };

    if (!geoJsonData) return null;

    return (
        <GeoJSON
            data={geoJsonData as any}
            style={style}
            onEachFeature={onEachFeature}
            pane="railroad-interact"
        />
    );
};

export default React.memo(RailroadLayer);

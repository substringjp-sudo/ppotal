"use client";

import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { getOfficialColor } from '../lib/lineColors';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../lib/railwayData';

interface RailroadLayerProps {
    railroadNetwork: any;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
    isMobile: boolean;
}

const RailroadLayer: React.FC<RailroadLayerProps> = ({
    railroadNetwork,
    selectedLines,
    activeLine,
    hoveredLine,
    onRailroadClick,
    onRailroadHover,
    zoomLevel,
    isMobile
}) => {
    const selectionSet = useMemo(() => new Set(selectedLines), [selectedLines]);
    const isNoneExplicitlySelected = useMemo(() => selectionSet.has("__NONE__"), [selectionSet]);
    const isFilterActive = useMemo(() => {
        if (isNoneExplicitlySelected) return true;
        if (selectionSet.size === 0) return false;
        if (selectionSet.size === 1 && activeLine && selectionSet.has(activeLine)) return false;
        return true;
    }, [selectionSet, isNoneExplicitlySelected, activeLine]);

    const dynamicSmoothFactor = useMemo(() => {
        if (zoomLevel <= 8) return 2.0;
        return 1.0;
    }, [zoomLevel]);

    const geoJsonData = useMemo(() => {
        if (!railroadNetwork || !railroadNetwork.routes) return null;
        const features: any[] = [];
        railroadNetwork.routes.forEach((route: any) => {
            if (!route) return;
            let coordinates = route.routeGeometry || route.edges?.map((e: any) => e.geometry) || [];
            if (coordinates.length === 0) return;
            features.push({
                type: 'Feature',
                properties: {
                    id: route.id,
                    name: route.line || route.name || '',
                    company: route.company,
                    color: getOfficialColor(route.id) || route.color || '#999',
                    endpoints: route.stations ? `${route.stations[0]} \u2192 ${route.stations[route.stations.length - 1]}` : ''
                },
                geometry: { type: 'MultiLineString', coordinates }
            });
        });
        return { type: 'FeatureCollection', features };
    }, [railroadNetwork]);

    const highlightData = useMemo(() => {
        if (!geoJsonData) return null;
        const highlighted = geoJsonData.features.filter(f => f.properties.id === activeLine || f.properties.id === hoveredLine);
        return highlighted.length > 0 ? { type: 'FeatureCollection', features: highlighted } : null;
    }, [geoJsonData, activeLine, hoveredLine]);

    // Visually-only Styles (Non-interactive)
    const baseStyle = (feature: any) => {
        const id = feature.properties.id;
        const isVisible = isNoneExplicitlySelected ? activeLine === id : (!isFilterActive || selectionSet.has(id) || activeLine === id);
        const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;

        let color = isVisible ? feature.properties.color : '#999999';
        let weight = (isVisible ? (zoomLevel >= 12 ? 5 : (zoomLevel >= 10 ? 3 : 1)) : (zoomLevel >= 12 ? 3 : 1)) * weightFactor;
        let opacity = isVisible ? 0.8 : 0.4;
        let dashArray = isVisible ? undefined : '4, 8';

        return { color, weight, opacity, dashArray, lineCap: 'round', lineJoin: 'round', smoothFactor: dynamicSmoothFactor, interactive: false } as L.PathOptions;
    };

    const casingStyle = (feature: any) => {
        const id = feature.properties.id;
        const isVisible = isNoneExplicitlySelected ? activeLine === id : (!isFilterActive || selectionSet.has(id) || activeLine === id);
        if (!isVisible && zoomLevel < 10) return { opacity: 0, interactive: false }; // Hide casing for invisible lines at low zoom

        const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;
        let baseWeight = (isVisible ? (zoomLevel >= 12 ? 5 : (zoomLevel >= 10 ? 3 : 1)) : (zoomLevel >= 12 ? 3 : 1)) * weightFactor;

        return {
            color: '#000000',
            weight: baseWeight + (zoomLevel >= 12 ? 1.5 : 1), // Slightly thicker
            opacity: isVisible ? 0.6 : 0.2,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: dynamicSmoothFactor,
            interactive: false
        } as L.PathOptions;
    };

    const highlightStyle = (feature: any) => {
        const id = feature.properties.id;
        const isHovered = hoveredLine === id;
        const isClicked = activeLine === id;
        const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;

        return {
            color: isHovered ? '#FFD700' : (isClicked ? '#007AFF' : 'transparent'),
            weight: 12 * weightFactor,
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: dynamicSmoothFactor,
            interactive: false
        } as L.PathOptions;
    };

    // Invisible Hit Area Style (Topmost, handles mouse events)
    const hitAreaStyle = () => {
        return {
            color: 'transparent', // Invisible
            weight: 20,           // Very generous hit box
            opacity: 0,
            interactive: true,
            pane: 'station-interact' // Topmost shared interaction pane
        } as L.PathOptions;
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        const { name, company, endpoints } = feature.properties;
        const tooltipContent = `
            <div style="text-align: center; font-family: sans-serif;">
                <div style="display: flex; flex-direction: column; gap: 1px;">
                    <div style="font-weight: bold; font-size: 1.1em;">${name}</div>
                    <div style="font-size: 0.8em; font-weight: 400; color: #555; margin-top: -2px;">${LINE_EN_NAMES[name] || name}</div>
                </div>
                <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 0px;">
                    <div style="font-size: 0.85em; color: #444; font-weight: 500;">${company}</div>
                    <div style="font-size: 0.7em; font-weight: 400; color: #666; margin-top: -1px;">${COMPANY_EN_NAMES[company] || company}</div>
                </div>
                ${endpoints ? `<div style="font-size: 0.7em; color: #aaa; margin-top: 4px; border-top: 1px solid #eee; padding-top: 2px;">(${endpoints})</div>` : ''}
            </div>
        `;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true,
                direction: 'top',
                offset: [0, -10],
                opacity: 0.9,
                className: 'railroad-tooltip',
                pane: 'top-tooltips'
            });
        }

        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                onRailroadClick(feature.properties.id);
            },
            mouseover: () => {
                if (!isMobile) onRailroadHover(feature.properties.id);
            },
            mouseout: () => {
                if (!isMobile) onRailroadHover(null);
            }
        });
    };

    if (!geoJsonData) return null;

    return (
        <>
            {/* 1. Visual Highlight (Bottom) */}
            {highlightData && (
                <GeoJSON
                    key={`vis-highlight-${activeLine}-${hoveredLine}`}
                    data={highlightData as any}
                    style={highlightStyle}
                    interactive={false}
                    pane="railroad-glow"
                />
            )}

            {/* 2. Line Casing (Outlines) - Only show at zoom 10+ */}
            {zoomLevel >= 10 && (
                <GeoJSON
                    key="vis-casing"
                    data={geoJsonData as any}
                    style={casingStyle}
                    interactive={false}
                    pane="railroad-casing"
                />
            )}

            {/* 3. Visual Main Line */}
            <GeoJSON
                key="vis-base"
                data={geoJsonData as any}
                style={baseStyle}
                interactive={false}
                pane="railroad-lines"
            />

            {/* 3. Invisible Interaction Hit Area (TOPMOST SHARED) */}
            <GeoJSON
                key="hit-area"
                data={geoJsonData as any}
                style={hitAreaStyle}
                onEachFeature={onEachFeature}
                pane="station-interact"
            />
        </>
    );
};

export default React.memo(RailroadLayer);

"use client";

import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { getLineColor } from '../lib/lineColors';
import { RailData, Section } from '../types/railData';

interface RailroadLayerProps {
    railroadNetwork: RailData | any;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
    isMobile: boolean;
    isMoving?: boolean;
    language: any;
}

const RailroadLayer: React.FC<RailroadLayerProps> = ({
    railroadNetwork,
    selectedLines,
    activeLine,
    hoveredLine,
    onRailroadClick,
    onRailroadHover,
    zoomLevel,
    isMobile,
    isMoving = false,
    language
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
        if (!railroadNetwork) return null;

        const features: any[] = [];

        // Check for Granular Data (RailData)
        if (railroadNetwork.stations && railroadNetwork.sections && railroadNetwork.lines) {
            const data = railroadNetwork as RailData;
            const companyMap = new Map<number, { name: string, name_en: string }>();
            Object.values(data.companies).forEach((c) => companyMap.set(c.id, { name: c.name, name_en: c.name_en }));

            const lineInfoMap = new Map<number, { name: string, name_en: string, companyId: number, color?: string }>();
            Object.values(data.lines).forEach((l) => lineInfoMap.set(l.id, {
                name: l.name,
                name_en: l.name_en,
                companyId: l.corp_id,
                color: l.color
            }));

            // Group sections by line_id (MultiLineString per line)
            const lineSections = new Map<number, any[]>();
            // sections is { sections: Section[] }
            if (data.sections && Array.isArray(data.sections.sections)) {
                data.sections.sections.forEach((s: Section) => {
                    if (!lineSections.has(s.line_id)) lineSections.set(s.line_id, []);
                    lineSections.get(s.line_id)!.push(s.geometry);
                });
            }

            lineSections.forEach((geoms, lineId) => {
                const info = lineInfoMap.get(lineId);
                if (!info) return;
                const companyInfo = companyMap.get(info.companyId);
                const companyName = companyInfo?.name || String(info.companyId);
                const fullId = `${info.companyId}::${lineId}`;

                features.push({
                    type: 'Feature',
                    properties: {
                        id: fullId,
                        name: info.name,
                        name_en: info.name_en,
                        company: companyName,
                        company_en: companyInfo?.name_en || '',
                        color: getLineColor(fullId, data) || '#999',
                        endpoints: '' // Granular data doesn't provide pre-calculated endpoints
                    },
                    geometry: { type: 'MultiLineString', coordinates: geoms }
                });
            });

        } else if (railroadNetwork.routes) {
            // Systematic Data (Original Logic)
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
                        color: getLineColor(route.id, railroadNetwork) || route.color || '#999',
                        endpoints: route.stations ? `${route.stations[0]} \u2192 ${route.stations[route.stations.length - 1]}` : ''
                    },
                    geometry: { type: 'MultiLineString', coordinates }
                });
            });
        }

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
        const { name, name_en, company, company_en, endpoints } = feature.properties;

        const primaryLine = language === 'en' ? (name_en || name) : name;
        const secondaryLine = language === 'en' ? (name !== name_en ? name : '') : (name_en && name_en !== name ? name_en : '');

        const primaryCorp = language === 'en' ? (company_en || company) : company;
        const secondaryCorp = language === 'en' ? (company !== company_en ? company : '') : (company_en && company_en !== company ? company_en : '');

        const tooltipContent = `
            <div style="text-align: center; font-family: sans-serif; padding: 4px;">
                <div style="display: flex; flex-direction: column; gap: 1px;">
                    <div style="font-weight: bold; font-size: 1.1em; color: #000;">${primaryLine}</div>
                    ${secondaryLine ? `<div style="font-size: 0.85em; font-weight: 400; color: #666; margin-top: -2px;">${secondaryLine}</div>` : ''}
                </div>
                <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 0px; border-top: 1px solid #eee; padding-top: 4px;">
                    <div style="font-size: 0.9em; color: #444; font-weight: 600;">${primaryCorp}</div>
                    ${secondaryCorp ? `<div style="font-size: 0.75em; font-weight: 400; color: #888; margin-top: -1px;">${secondaryCorp}</div>` : ''}
                </div>
                ${endpoints ? `<div style="font-size: 0.7em; color: #aaa; margin-top: 4px; border-top: 1px dotted #eee; padding-top: 2px;">(${endpoints})</div>` : ''}
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

        let tooltipTimeout: NodeJS.Timeout | null = null;

        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                onRailroadClick(feature.properties.id);
            },
            mouseover: (e) => {
                if (!isMobile) {
                    if (tooltipTimeout) clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => {
                        onRailroadHover(feature.properties.id);
                        layer.openTooltip();
                        tooltipTimeout = null;
                    }, 1000);
                }
            },
            mouseout: () => {
                if (!isMobile) {
                    if (tooltipTimeout) {
                        clearTimeout(tooltipTimeout);
                        tooltipTimeout = null;
                    }
                    onRailroadHover(null);
                    layer.closeTooltip();
                }
            }
        });
    };

    if (!geoJsonData) return null;

    return (
        <>
            {/* 1. Visual Highlight (Bottom) - Hide during move for performance */}
            {highlightData && !isMoving && (
                <GeoJSON
                    key={`vis-highlight-${activeLine}-${hoveredLine}`}
                    data={highlightData as any}
                    style={highlightStyle}
                    interactive={false}
                    pane="railroad-glow"
                />
            )}

            {/* 2. Line Casing (Outlines) - Only show at zoom 10+ and NOT moving */}
            {zoomLevel >= 10 && !isMoving && (
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
                {...({ smoothFactor: dynamicSmoothFactor } as any)}
            />

            {/* 4. Invisible Interaction Hit Area - ONLY active when not moving */}
            {!isMoving && (
                <GeoJSON
                    key="hit-area"
                    data={geoJsonData as any}
                    style={hitAreaStyle}
                    onEachFeature={onEachFeature}
                    pane="station-interact"
                    {...({ smoothFactor: dynamicSmoothFactor } as any)}
                />
            )}
        </>
    );
};

export default React.memo(RailroadLayer);

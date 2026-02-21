"use client";

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { GeoJSON, Tooltip } from 'react-leaflet';
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
    usedSectionIds?: Set<number>;
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
    language,
    usedSectionIds = new Set()
}) => {
    const selectionSet = useMemo(() => new Set(selectedLines), [selectedLines]);
    const isNoneExplicitlySelected = useMemo(() => selectionSet.has("__NONE__"), [selectionSet]);
    const isFilterActive = useMemo(() => {
        if (isNoneExplicitlySelected) return true;
        if (selectionSet.size === 0) return false;
        if (selectionSet.size === 1 && activeLine && selectionSet.has(activeLine)) return false;
        return true;
    }, [selectionSet, isNoneExplicitlySelected, activeLine]);

    // Unified discrete zoom level for stable styles
    const zoomGroup = useMemo(() => {
        if (zoomLevel <= 7) return 1;
        if (zoomLevel <= 11) return 2;
        if (zoomLevel <= 13) return 3;
        return 4;
    }, [zoomLevel]);

    const dynamicSmoothFactor = useMemo(() => {
        if (zoomGroup <= 2) return 2.0;
        return 1.0;
    }, [zoomGroup]);

    const styleConfig = useMemo(() => {
        // Stages: 1 (5-7), 2 (8-11), 3 (12-13), 4 (14+)
        let weightFactor = 1.0;
        if (zoomGroup === 1) weightFactor = 0.5;
        else if (zoomGroup === 2) weightFactor = 0.8;

        // Discrete weights per stage
        const baseVisibilityWeight = (zoomGroup >= 3 ? 5 : (zoomGroup === 2 ? 2.5 : 1)) * weightFactor;
        const baseInvisibilityWeight = (zoomGroup >= 3 ? 3 : 1) * weightFactor;
        const usedWeight = (zoomGroup >= 3 ? 8 : (zoomGroup === 2 ? 4 : 2)) * weightFactor;
        const usedGlowWeight = (zoomGroup >= 3 ? 12 : (zoomGroup === 2 ? 7 : 4)) * weightFactor;
        const casingWeight = baseVisibilityWeight + (zoomGroup >= 3 ? 1.5 : 1);
        const highlightWeight = 12 * weightFactor;

        return {
            weightFactor,
            baseVisibilityWeight,
            baseInvisibilityWeight,
            usedWeight,
            usedGlowWeight,
            casingWeight,
            highlightWeight,
            smoothFactor: dynamicSmoothFactor
        };
    }, [zoomGroup, dynamicSmoothFactor]);

    const mergedGeoJsonData = useMemo(() => {
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

            // Group sections by (line_id, isUsed) (MultiLineString per line/usage state)
            const groupedSections = new Map<string, any[]>();
            if (data.sections && Array.isArray(data.sections.sections)) {
                data.sections.sections.forEach((s: Section) => {
                    const isUsed = usedSectionIds.has(s.id);
                    const key = `${s.line_id}_${isUsed}`;
                    if (!groupedSections.has(key)) groupedSections.set(key, []);
                    groupedSections.get(key)!.push(s.geometry);
                });
            }

            groupedSections.forEach((geoms, key) => {
                const [lineIdStr, isUsedStr] = key.split('_');
                const lineId = parseInt(lineIdStr);
                const isUsed = isUsedStr === 'true';

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
                        isUsed: isUsed
                    },
                    geometry: { type: 'MultiLineString', coordinates: geoms }
                });
            });

        } else if (railroadNetwork.routes) {
            // Systematic Data
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
                        endpoints: route.stations ? `${route.stations[0]} \u2192 ${route.stations[route.stations.length - 1]}` : '',
                        isUsed: false // Fallback logic for trips if needed
                    },
                    geometry: { type: 'MultiLineString', coordinates }
                });
            });
        }

        return { type: 'FeatureCollection', features };
    }, [railroadNetwork, usedSectionIds, activeLine, hoveredLine, isFilterActive, selectionSet]);

    // Unified Style Function: Decides all visuals in one pass
    const unifiedStyle = (feature: any) => {
        const id = feature.properties.id;
        const isUsed = feature.properties.isUsed;
        const isHovered = hoveredLine === id;
        const isClicked = activeLine === id;
        const isVisible = isNoneExplicitlySelected ? activeLine === id : (!isFilterActive || selectionSet.has(id) || activeLine === id);

        // 1. Determine Color
        let color = feature.properties.color;
        if (isHovered) color = '#FFD700';
        else if (isClicked) color = '#007AFF';
        else if (isUsed) color = '#FFD700';
        else if (!isVisible) color = '#999999';

        // 2. Determine Weight
        let weight = isVisible ? styleConfig.baseVisibilityWeight : styleConfig.baseInvisibilityWeight;
        if (isUsed) weight = styleConfig.usedWeight;
        if (isHovered || isClicked) weight = styleConfig.highlightWeight;

        // 3. Determine Opacity
        let opacity = isVisible ? 0.8 : 0.4;
        if (isUsed) opacity = 0.9;
        if (isHovered || isClicked) opacity = 1.0;

        return {
            color,
            weight,
            opacity,
            dashArray: isVisible ? undefined : '4, 8',
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: styleConfig.smoothFactor,
            interactive: true, // This is now the interaction layer
        } as L.PathOptions;
    };

    const casingStyle = (feature: any) => {
        const id = feature.properties.id;
        const isVisible = isNoneExplicitlySelected ? activeLine === id : (!isFilterActive || selectionSet.has(id) || activeLine === id);

        // Casing is only for visibility and aesthetics, hide if moving or too far out
        if (!isVisible) return { opacity: 0, interactive: false };

        return {
            color: '#000000',
            weight: styleConfig.casingWeight,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: styleConfig.smoothFactor,
            interactive: false
        } as L.PathOptions;
    };

    const glowStyle = (feature: any) => {
        const isUsed = feature.properties.isUsed;
        const id = feature.properties.id;
        const isHovered = hoveredLine === id;

        if (!isUsed && !isHovered) return { opacity: 0, interactive: false };

        return {
            color: '#FFD700',
            weight: isHovered ? styleConfig.highlightWeight + 4 : styleConfig.usedGlowWeight,
            opacity: isHovered ? 0.4 : 0.3,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: styleConfig.smoothFactor,
            interactive: false
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
                    }, 50);
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

    const mainLayerRef = useRef<L.GeoJSON>(null);
    const casingLayerRef = useRef<L.GeoJSON>(null);
    const glowLayerRef = useRef<L.GeoJSON>(null);

    // Dynamic Style Update without unmounting the layer
    useEffect(() => {
        if (mainLayerRef.current) mainLayerRef.current.setStyle(unifiedStyle);
        if (casingLayerRef.current) casingLayerRef.current.setStyle(casingStyle);
        if (glowLayerRef.current) glowLayerRef.current.setStyle(glowStyle);
    }, [activeLine, hoveredLine, isMoving, unifiedStyle, casingStyle, glowStyle]);

    if (!mergedGeoJsonData) return null;

    // Stable key: only re-render on data or major zoom changes
    const layerKey = useMemo(() => {
        return `${zoomGroup}_${usedSectionIds.size}_${selectionSet.size}`;
    }, [zoomGroup, usedSectionIds.size, selectionSet.size]);

    return (
        <>
            {/* 1. Under-layers: Glows and Outlines (Non-interactive) */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={glowLayerRef}
                    key={`rail-under-${layerKey}`}
                    data={mergedGeoJsonData as any}
                    style={glowStyle}
                    interactive={false}
                    pane="railroad-glow"
                />
            )}

            {zoomGroup >= 3 && mergedGeoJsonData && (
                <GeoJSON
                    ref={casingLayerRef}
                    key={`rail-casing-${layerKey}`}
                    data={mergedGeoJsonData as any}
                    style={casingStyle}
                    interactive={false}
                    pane="railroad-casing"
                />
            )}

            {/* 2. Main Interactive Line Layer (Unified visuals and interaction) */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={mainLayerRef}
                    key={`rail-main-${layerKey}`}
                    data={mergedGeoJsonData as any}
                    style={unifiedStyle}
                    onEachFeature={onEachFeature}
                    pane="railroad-lines"
                />
            )}
        </>
    );
};

export default React.memo(RailroadLayer);

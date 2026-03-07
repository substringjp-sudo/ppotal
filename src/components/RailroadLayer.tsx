"use client";

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getLineColor } from '../lib/lineColors';
import { getSmartTooltipOptions } from '../lib/uiUtils';
import { trackEvent } from '../lib/gtag';
import { RailData, Section } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { glowCanvas, casingCanvas, railroadCanvas, sharedSvgRenderer } from './Map';

interface RailroadLayerProps {
    railroadNetwork: RailData | null;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
    isMobile: boolean;
    isMoving?: boolean;
    usedSectionIds?: Set<number>;
    isDragging?: boolean;
    draftSectionIds?: Set<number>;
    settings: import('./MainPageClient').MapStyleSettings;
    onTooltipUpdate?: (content: string | null, x: number, y: number, priority?: 'low' | 'high') => void;
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
    usedSectionIds = new Set(),
    isDragging = false,
    draftSectionIds = new Set(),
    settings,
    onTooltipUpdate
}) => {

    const { language } = useI18n();
    const map = useMap();
    const [panesReady, setPanesReady] = useState(false);

    const mainPathOptions = useMemo(() => ({
        renderer: railroadCanvas || undefined
    }), []);
    const glowPathOptions = useMemo(() => ({
        renderer: glowCanvas || undefined
    }), []);

    useEffect(() => {
        let isMounted = true;
        const checkPanes = () => {
            if (!isMounted) return;
            const required = ['railroad-glow', 'railroad-lines', 'master-interactions'];
            const allReady = required.every(p => !!map.getPane(p));
            if (allReady) {
                setPanesReady(true);
            } else {
                requestAnimationFrame(checkPanes);
            }
        };
        checkPanes();
        return () => { isMounted = false; };
    }, [map]);

    const isMovingRef = useRef(isMoving);
    useEffect(() => {
        isMovingRef.current = isMoving;
    }, [isMoving]);

    const isDraggingRef = useRef(isDragging);
    useEffect(() => {
        isDraggingRef.current = isDragging;
    }, [isDragging]);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Force close tooltips when the map is moving or zooming
    useEffect(() => {
        if (isMoving) {
            try {
                map?.closeTooltip?.();
            } catch (err) { /* ignore */ }
            onRailroadHover(null);
        }
    }, [isMoving, map, onRailroadHover]);

    const lastMouseDownPos = useRef<L.LatLng | null>(null);
    const selectionSet = useMemo(() => new Set(selectedLines), [selectedLines]);
    const isNoneExplicitlySelected = useMemo(() => selectionSet.has("__NONE__"), [selectionSet]);
    const isFilterActive = useMemo(() => {
        if (isNoneExplicitlySelected) return true;
        if (selectionSet.size === 0) return false;
        // The filter is active if there is any selection beyond just the activeLine's automatic display
        return true;
    }, [isNoneExplicitlySelected, selectionSet.size]);

    // 1 (<=8, Low), 2 (9-13, Mid), 3 (14+, High)
    const zoomGroup = useMemo(() => {
        if (zoomLevel <= 8) return 1;
        if (zoomLevel <= 13) return 2;
        return 3;
    }, [zoomLevel]);


    const styleConfig = useMemo(() => {
        // Stages: 1 (<=8), 2 (9-13), 3 (14+)
        let weightFactor = 1.0;
        if (zoomGroup === 1) weightFactor = Math.max(0.15, zoomLevel / 14);
        else if (zoomGroup === 2) weightFactor = 0.85;

        // Smooth transition for weight factor
        const zoomWeight = isMoving ? 0.7 : 1.0; // Slightly thin when moving

        // Discrete weights per stage
        const baseVisibilityWeight = 1.7 * weightFactor * zoomWeight;
        const baseInvisibilityWeight = 1.0 * weightFactor * zoomWeight;
        const usedWeight = 2.7 * weightFactor * zoomWeight;
        const usedGlowWeight = 4.7 * weightFactor * zoomWeight;
        const casingWeight = baseVisibilityWeight + (0.8 * weightFactor);
        const highlightWeight = 6.7 * weightFactor * zoomWeight;

        return {
            weightFactor,
            baseVisibilityWeight,
            baseInvisibilityWeight,
            usedWeight,
            usedGlowWeight,
            casingWeight,
            highlightWeight,
            zoomWeight,
            smoothFactor: 1.0
        };
    }, [zoomGroup, zoomLevel, isMoving]);

    const mergedGeoJsonData = useMemo<GeoJSON.FeatureCollection | null>(() => {
        if (!railroadNetwork) return null;

        const features: GeoJSON.Feature[] = [];

        // Check for Granular Data (RailData)
        if (railroadNetwork.stations && railroadNetwork.sections && railroadNetwork.lines) {
            const data = railroadNetwork as RailData;
            const companyMap = new Map<number, { name: string, name_en: string, name_kr?: string }>();
            Object.values(data.companies).forEach((c) => companyMap.set(c.id, { name: c.name, name_en: c.name_en, name_kr: c.name_kr }));

            const lineInfoMap = new Map<number, { name: string, name_en: string, name_kr?: string, companyId: number, color?: string }>();
            Object.values(data.lines).forEach((l) => lineInfoMap.set(l.id, {
                name: l.name,
                name_en: l.name_en,
                name_kr: l.name_kr,
                companyId: l.corp_id,
                color: l.color
            }));

            // Group sections by (line_id, isUsed, isDraft)
            const groupedSections = new Map<string, [number, number][][]>();
            if (data.sections && Array.isArray(data.sections.sections)) {
                data.sections.sections.forEach((s: Section) => {
                    const isUsed = usedSectionIds.has(s.id);
                    const isDraft = draftSectionIds?.has(s.id) || false;
                    const key = `${s.line_id}_${isUsed}_${isDraft}`;
                    if (!groupedSections.has(key)) groupedSections.set(key, []);
                    groupedSections.get(key)!.push(s.geometry);
                });
            }

            groupedSections.forEach((geoms, key) => {
                const [lineIdStr, isUsedStr, isDraftStr] = key.split('_');
                const lineId = parseInt(lineIdStr);
                const isUsed = isUsedStr === 'true';
                const isDraft = isDraftStr === 'true';

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
                        name_kr: info.name_kr,
                        company: companyName,
                        company_en: companyInfo?.name_en || '',
                        company_kr: companyInfo?.name_kr || '',
                        color: getLineColor(fullId, data) || '#999',
                        isUsed: isUsed,
                        isDraft: isDraft
                    },
                    geometry: { type: 'MultiLineString', coordinates: geoms }
                });
            });

        } else if (railroadNetwork && 'routes' in (railroadNetwork as unknown as { routes: unknown })) {
            // Systematic Data
            const legacyData = railroadNetwork as unknown as {
                routes: {
                    id: string;
                    line?: string;
                    name?: string;
                    company?: string;
                    color?: string;
                    stations?: string[];
                    routeGeometry?: number[][][];
                    edges?: { geometry: number[][][] }[];
                }[]
            };
            legacyData.routes.forEach((route) => {
                if (!route) return;
                const coordinates = route.routeGeometry || route.edges?.map((e) => e.geometry) || [];
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
                    geometry: { type: 'MultiLineString', coordinates: coordinates as number[][][] }
                });
            });
        }

        return { type: 'FeatureCollection', features };
    }, [railroadNetwork, usedSectionIds, draftSectionIds]);


    // Unified Style Function: Decides all visuals in one pass
    const unifiedStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const id = feature.properties.id;
        const isUsed = feature.properties.isUsed;
        const isHovered = !isDragging && hoveredLine === id;
        const isClicked = activeLine === id;
        const isVisible = selectionSet.has(id) || activeLine === id || !isFilterActive;

        // 1. Determine Color
        let color = feature.properties.color || '#999';
        if (!isVisible) color = '#999999';

        // 2. Determine Weight (Standardized to match Stations) - 2/3 Scale Applied
        let baseWeight = isVisible ? settings.unvisited.weight : (settings.unselected.weight || 1.0);
        if (isUsed) baseWeight = settings.visited.weight;

        // Apply zoom adjustments to the user-defined base weight
        let weight = baseWeight;
        const z = Math.round(zoomLevel);
        if (z <= 11) weight = baseWeight * 0.6;
        else if (z <= 13) weight = baseWeight * 0.8;

        // 3. Determine Opacity
        let opacity = isVisible ? 0.8 : settings.unselected.opacity;
        if (isUsed) opacity = 0.95;
        if (isHovered || isClicked) opacity = 1.0;

        return {
            color,
            weight,
            opacity,
            dashArray: isVisible ? undefined : '2, 4',
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            smoothFactor: styleConfig.smoothFactor,
            interactive: false,
        } as L.PathOptions;
    }, [isFilterActive, selectionSet, activeLine, styleConfig, hoveredLine, zoomLevel, isDragging, settings]);


    const glowStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const isUsed = feature.properties.isUsed;
        const isDraft = feature.properties.isDraft;
        const id = feature.properties.id;
        const isHovered = !isDragging && hoveredLine === id;
        const isClicked = activeLine === id;
        const isVisible = selectionSet.has(id) || activeLine === id || !isFilterActive;

        // Determine if we should show the outline/glow
        const showOutline = (isUsed && settings.visited.showOutline) ||
            (isVisible && !isUsed && settings.unvisited.showOutline);
        const showEmphasis = isDraft || (isHovered || isClicked);

        if (!showOutline && !showEmphasis) return { opacity: 0, interactive: false };

        // Determine Color
        let color = '#000000'; // Default casing is black
        let opacity = 0.4;

        if (showEmphasis) {
            opacity = 1.0;
            if (isDraft || isClicked) color = '#007AFF';
            else if (isHovered) color = '#FFD60A';
            else if (isUsed) color = '#2ecc71';
        } else if (isUsed) {
            color = '#2ecc71';
            opacity = 0.8;
        }

        // Standardized border thickness - based on settings weight
        let targetWeight = isUsed ? settings.visited.weight : settings.unvisited.weight;
        if (!isVisible && !isUsed) targetWeight = settings.unselected.weight;

        let baseWeight = targetWeight + (isUsed ? 3.5 : 2.2);
        const z = Math.round(zoomLevel);
        if (z <= 11) baseWeight = targetWeight + (isUsed ? 2.5 : 1.5);
        else if (z <= 13) baseWeight = targetWeight + (isUsed ? 3.0 : 1.8);

        const factor = isMobile ? 1.4 : 1.0;
        const emphasisOffset = showEmphasis ? (z >= 14 ? 4.0 : 2.5) : 0;
        const finalWeight = (baseWeight * factor) + emphasisOffset;

        return {
            color,
            weight: finalWeight,
            opacity: opacity,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            smoothFactor: styleConfig.smoothFactor,
            interactive: false,
        } as L.PathOptions;
    }, [isFilterActive, selectionSet, activeLine, styleConfig, hoveredLine, zoomLevel, isDragging, isMobile, settings, isMoving]);

    // 상호작용 전용 스타일 (투명하지만 클릭 영역 확보)
    const interactionStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };


        return {
            color: '#000',
            weight: isMobile ? 22 : 14,
            opacity: 0.0001,
            pane: 'master-interactions',
            interactive: true,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            renderer: sharedSvgRenderer || undefined
        } as L.PathOptions;
    }, [isMobile]);

    const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
        if (!feature.properties) return;
        const props = feature.properties as any;
        const { id, endpoints } = props;

        const lineData = railroadNetwork?.lines[id.split('::')[1]];
        const companyData = railroadNetwork?.companies[id.split('::')[0]];

        const primaryLine = getLocalizedName(lineData, language) || props.name;
        const secondaryLine = language !== 'ja' ? props.name : '';

        const primaryCorp = getLocalizedName(companyData, language) || props.company;
        const secondaryCorp = language !== 'ja' ? props.company : '';

        const tooltipContent = `
            <div style="padding: 12px 16px; min-width: 180px; font-family: Pretendard, sans-serif; display: flex; flex-direction: column;">
                <div style="display: flex; flex-direction: row; align-items: baseline; gap: 10px; border-bottom: 2px solid ${feature.properties?.color || '#999'}; margin-bottom: 12px; padding-bottom: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: ${feature.properties?.color || '#999'}; align-self: center;">directions_railway</span>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 900; font-size: 16px; color: #1a202c; line-height: 1.2;">${primaryLine}</span>
                        ${secondaryLine ? `<span style="font-weight: 600; font-size: 11px; color: #718096; margin-top: 2px;">${secondaryLine}</span>` : ''}
                    </div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 700; color: #4a5568; line-height: 1.4;">
                        ${primaryCorp}
                    </div>
                    ${secondaryCorp ? `<div style="font-size: 10px; font-weight: 600; color: #a0aec0; margin-bottom: 6px;">${secondaryCorp}</div>` : ''}
                    ${endpoints ? `
                        <div style="font-size: 10px; color: #a0aec0; margin-top: 8px; border-top: 1px solid #edf2f7; padding-top: 8px; font-style: italic;">
                            <span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle; margin-right: 4px;">alt_route</span>
                            ${endpoints}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;


        // FloatingTooltip handles the display now, so we don't bind a Leaflet tooltip


        const tooltipTimeout: NodeJS.Timeout | null = null;

        layer.on({
            mousedown: (em: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(em);
                lastMouseDownPos.current = em.latlng;
                onTooltipUpdate?.(null, 0, 0);
            },
            click: (ec: L.LeafletMouseEvent) => {
                if (isDragging) return;
                if (lastMouseDownPos.current) {
                    const distance = ec.latlng.distanceTo(lastMouseDownPos.current);
                    if (distance > 5) {
                        lastMouseDownPos.current = null;
                        return;
                    }
                }
                L.DomEvent.stopPropagation(ec);
                onRailroadClick(props.id);
                lastMouseDownPos.current = null;
            },
            mouseover: (eo: any) => {
                const isMov = isMovingRef.current;
                const isDrag = isDraggingRef.current;
                if (!isMobile && !isMov && !isDrag) {
                    const { clientX, clientY } = eo.originalEvent;
                    onTooltipUpdate?.(tooltipContent, clientX, clientY);
                    onRailroadHover(props.id);
                }
            },
            mousemove: (em: any) => {
                const isMov = isMovingRef.current;
                const isDrag = isDraggingRef.current;
                if (!isMobile && !isMov && !isDrag) {
                    const { clientX, clientY } = em.originalEvent;
                    onTooltipUpdate?.(tooltipContent, clientX, clientY);
                }
            },
            mouseout: () => {
                onTooltipUpdate?.(null, 0, 0);
                onRailroadHover(null);
            }
        });

    };

    const mainLayerRef = useRef<L.GeoJSON>(null);
    const glowLayerRef = useRef<L.GeoJSON>(null);
    const interactionLayerRef = useRef<L.GeoJSON>(null);

    // Dynamic Style Update without unmounting the layer
    useEffect(() => {
        if (mainLayerRef.current) mainLayerRef.current.setStyle(unifiedStyle);
        if (glowLayerRef.current) glowLayerRef.current.setStyle(glowStyle);
        if (interactionLayerRef.current) interactionLayerRef.current.setStyle(interactionStyle);

    }, [activeLine, hoveredLine, isMoving, isDragging, unifiedStyle, glowStyle, interactionStyle]);

    // Safety cleanup: Ensure no tooltips linger when component remounts (due to key change)
    useEffect(() => {
        return () => {
            if (interactionLayerRef.current) {
                interactionLayerRef.current.eachLayer((l: any) => {
                    try {
                        l?.closeTooltip?.();
                    } catch (err) { /* ignore */ }
                });
            }
        };
    }, []);

    // Stable key: only re-render on data or major zoom changes
    const layerKey = useMemo(() => {
        const draftIdsArray = Array.from(draftSectionIds || []);
        const draftKey = draftIdsArray.length > 0 ? `${draftIdsArray.length}_${draftIdsArray[draftIdsArray.length - 1]}` : 'none';
        return `${zoomGroup}_${usedSectionIds.size}_${selectionSet.size}_${draftKey}_${language}`;
    }, [zoomGroup, usedSectionIds.size, selectionSet.size, draftSectionIds, language]);

    if (!mergedGeoJsonData || !panesReady) return null;

    return (
        <>
            {/* 1. Under-layers: Glows and Outlines (Always rendered for stability) */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={glowLayerRef}
                    key={`rail-under-${layerKey}`}
                    data={mergedGeoJsonData}
                    style={glowStyle}
                    interactive={false}
                    pane="railroad-glow"
                    pathOptions={glowPathOptions}
                />
            )}

            {/* 2. Main Visual Line Layer */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={mainLayerRef}
                    key={`rail-main-${layerKey}`}
                    data={mergedGeoJsonData}
                    style={unifiedStyle}
                    interactive={false}
                    pane="railroad-lines"
                    pathOptions={mainPathOptions}
                />
            )}

            {/* 3. Interaction Overlay: Invisible but captures all events */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={interactionLayerRef}
                    key={`rail-interact-${layerKey}`}
                    data={mergedGeoJsonData}
                    style={interactionStyle}
                    onEachFeature={onEachFeature}
                    interactive={!isDragging}
                    pane="master-interactions"
                />
            )}
        </>
    );
};

const MemoizedRailroadLayer = React.memo(RailroadLayer);
MemoizedRailroadLayer.displayName = 'RailroadLayer';
export default MemoizedRailroadLayer;

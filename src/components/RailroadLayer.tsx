"use client";

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { getLineColor } from '../lib/lineColors';
import { RailData, Section } from '../types/railData';

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
    isDragging = false
}) => {
    const lastMouseDownPos = useRef<L.LatLng | null>(null);
    const selectionSet = useMemo(() => new Set(selectedLines), [selectedLines]);
    const isNoneExplicitlySelected = useMemo(() => selectionSet.has("__NONE__"), [selectionSet]);
    const isFilterActive = useMemo(() => {
        if (isNoneExplicitlySelected) return true;
        if (selectionSet.size === 0) return false;
        // The filter is active if there is any selection beyond just the activeLine's automatic display
        return true;
    }, [isNoneExplicitlySelected, selectionSet.size]);

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
        if (zoomGroup === 1) weightFactor = Math.max(0.1, zoomLevel / 14);
        else if (zoomGroup === 2) weightFactor = 0.8;

        // Discrete weights per stage - now consistent to avoid bloat at zoom 12+
        const baseVisibilityWeight = 2.5 * weightFactor;
        const baseInvisibilityWeight = 1.5 * weightFactor;
        const usedWeight = 4.0 * weightFactor;
        const usedGlowWeight = 7.0 * weightFactor;
        const casingWeight = baseVisibilityWeight + (1.2 * weightFactor);
        const highlightWeight = 10 * weightFactor;

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
    }, [zoomGroup, dynamicSmoothFactor, zoomLevel]);

    const mergedGeoJsonData = useMemo<GeoJSON.FeatureCollection | null>(() => {
        if (!railroadNetwork) return null;

        const features: GeoJSON.Feature[] = [];

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
            const groupedSections = new Map<string, [number, number][][]>();
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

        } else if (railroadNetwork && 'routes' in railroadNetwork) {
            // Systematic Data
            const legacyData = railroadNetwork as { routes: any[] };
            legacyData.routes.forEach((route) => {
                if (!route) return;
                const coordinates = route.routeGeometry || route.edges?.map((e: { geometry: any }) => e.geometry) || [];
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
    }, [railroadNetwork, usedSectionIds]);

    // Casing Style: For outlines or background effects
    const casingStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const id = feature.properties.id;
        const isHovered = !isDragging && hoveredLine === id;
        const isClicked = activeLine === id;
        const isVisible = selectionSet.has(id) || activeLine === id || !isFilterActive;

        if (!isVisible && !isHovered && !isClicked) return { opacity: 0, interactive: false };

        return {
            color: '#000000', // Black casing
            weight: styleConfig.casingWeight,
            opacity: isVisible ? 0.3 : 0.1,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: styleConfig.smoothFactor,
            interactive: false
        } as L.PathOptions;
    }, [isFilterActive, selectionSet, activeLine, hoveredLine, styleConfig, isDragging]);

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

        // 2. Determine Weight (Standardized to match Stations)
        let weight = 4.0;
        const z = Math.round(zoomLevel);
        if (z <= 11) weight = 2.2;
        else if (z <= 13) weight = 3.0;

        // 3. Determine Opacity
        let opacity = isVisible ? 0.8 : 0.4;
        if (isUsed) opacity = 0.9;
        if (isHovered || isClicked) opacity = 1.0;

        return {
            color,
            weight,
            opacity,
            dashArray: isVisible ? undefined : '4, 8',
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            smoothFactor: styleConfig.smoothFactor,
            interactive: false,
        } as L.PathOptions;
    }, [isFilterActive, selectionSet, activeLine, styleConfig, hoveredLine, zoomLevel, isDragging]);


    const glowStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const isUsed = feature.properties.isUsed;
        const id = feature.properties.id;
        const isHovered = !isDragging && hoveredLine === id;
        const isClicked = activeLine === id;

        // 이동 중일 때는 호버/클릭 상태를 무시하고 오직 방문 경로(isUsed)만 표시
        const showGlow = isUsed || (!isMoving && (isHovered || isClicked));
        if (!showGlow) return { opacity: 0, interactive: false };

        // 강조 색상 결정
        let color = '#FFD60A'; // 기본: 호버(Yellow)

        // 지도 이동 중에는 선택 상태보다 방문 경로(Green)를 최우선으로 표시
        if (isMoving && isUsed) {
            color = '#2ecc71';
        } else if (isClicked) { // isDraggingOverall and isLineHovered/isStationHovered are not defined in this scope. Reverting to original logic for these.
            color = '#007AFF';
        } else if (isUsed && !isHovered) {
            color = '#2ecc71';
        }

        // 강조 여부 (클릭, 호버, 혹은 방문한 경로 모두 동일한 두께 적용)
        const isEmphasis = isClicked || isHovered || isUsed;

        // 표준화된 테두리 두께 로직 적용 (두께 다시 절반으로 축소)
        let baseWeight = 6.25;
        const z = Math.round(zoomLevel);
        if (z <= 11) baseWeight = 4.0;
        else if (z <= 13) baseWeight = 5.0;

        const factor = isMobile ? 1.4 : 1.0;
        const emphasisOffset = isEmphasis ? (z >= 14 ? 7.5 : 5.0) : 0;
        const finalWeight = (baseWeight * factor) + emphasisOffset;

        return {
            color: color,
            weight: finalWeight,
            opacity: isUsed && !isHovered && !isClicked ? 0.6 : 1.0,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            smoothFactor: styleConfig.smoothFactor,
            interactive: false
        } as L.PathOptions;
    }, [hoveredLine, activeLine, isMoving, isDragging, isMobile, zoomLevel, styleConfig]);

    // 상호작용 전용 스타일 (투명하지만 클릭 영역 확보)
    const interactionStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const id = feature.properties.id;
        const isVisible = selectionSet.has(id) || activeLine === id || !isFilterActive;

        return {
            color: '#000',
            weight: isMobile ? 22 : 14, // 충분한 클릭 영역
            opacity: 0, // 완전 투명
            pane: 'globalInteraction',
            interactive: isVisible,
            lineCap: 'round' as const,
            lineJoin: 'round' as const
        } as L.PathOptions;
    }, [isFilterActive, selectionSet, activeLine, isMobile]);

    const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
        if (!feature.properties) return;
        const props = feature.properties as any;
        const { name, name_en, company, company_en, endpoints } = props;

        // Japanese is always primary (larger), English is always secondary (smaller)
        const primaryLine = name;
        const secondaryLine = name_en && name_en !== name ? name_en : '';

        const primaryCorp = company;
        const secondaryCorp = company_en && company_en !== company ? company_en : '';

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
            mousedown: (e: L.LeafletMouseEvent) => {
                lastMouseDownPos.current = e.latlng;
            },
            click: (e: L.LeafletMouseEvent) => {
                if (isDragging) return;

                // 마우스가 눌렸을 때와 뗐을 때의 거리를 체크하여 '진짜 클릭'인지 판별
                if (lastMouseDownPos.current) {
                    const distance = e.latlng.distanceTo(lastMouseDownPos.current);
                    // 5미터 이상 이동했다면 드래그로 간주하고 무시 (클릭 판정 거리)
                    if (distance > 5) {
                        lastMouseDownPos.current = null;
                        return;
                    }
                }

                L.DomEvent.stopPropagation(e);
                onRailroadClick(props.id);
                lastMouseDownPos.current = null;
            },
            mouseover: () => {
                if (!isMobile && !isMoving && !isDragging) {
                    if (tooltipTimeout) clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => {
                        onRailroadHover(props.id);
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
    const glowLayerRef = useRef<L.GeoJSON>(null);
    const interactionLayerRef = useRef<L.GeoJSON>(null);

    // Dynamic Style Update without unmounting the layer
    useEffect(() => {
        if (mainLayerRef.current) mainLayerRef.current.setStyle(unifiedStyle);
        if (glowLayerRef.current) glowLayerRef.current.setStyle(glowStyle);
        if (interactionLayerRef.current) interactionLayerRef.current.setStyle(interactionStyle);
    }, [activeLine, hoveredLine, isMoving, isDragging, unifiedStyle, glowStyle, interactionStyle]);

    // Stable key: only re-render on data or major zoom changes
    const layerKey = useMemo(() => {
        return `${zoomGroup}_${usedSectionIds.size}_${selectionSet.size}`;
    }, [zoomGroup, usedSectionIds.size, selectionSet.size]);

    if (!mergedGeoJsonData) return null;

    return (
        <>
            {/* 1. Under-layers: Glows and Outlines (Non-interactive) */}
            {mergedGeoJsonData && (
                <GeoJSON
                    ref={glowLayerRef}
                    key={`rail-under-${layerKey}`}
                    data={mergedGeoJsonData}
                    style={glowStyle}
                    interactive={false}
                    pane="railroad-glow"
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
                    pane="globalInteraction"
                />
            )}
        </>
    );
};

const MemoizedRailroadLayer = React.memo(RailroadLayer);
MemoizedRailroadLayer.displayName = 'RailroadLayer';
export default MemoizedRailroadLayer;

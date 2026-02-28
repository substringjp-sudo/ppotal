"use client";

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getLineColor } from '../lib/lineColors';
import { RailData, Section } from '../types/railData';
import { sharedCanvasRenderer, sharedSvgRenderer } from './Map';

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
    draftSectionIds = new Set()
}) => {
    const map = useMap();
    const [panesReady, setPanesReady] = useState(false);

    const pathOptions = useMemo(() => ({
        renderer: sharedCanvasRenderer || undefined
    }), []);

    useEffect(() => {
        let mounted = true;
        const checkPanes = () => {
            if (!mounted) return;
            const required = ['railroad-glow', 'railroad-lines', 'master-interactions'];
            const allReady = required.every(p => !!map.getPane(p));
            if (allReady) {
                setPanesReady(true);
            } else {
                requestAnimationFrame(checkPanes);
            }
        };
        checkPanes();
        return () => { mounted = false; };
    }, [map]);

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
            const companyMap = new Map<number, { name: string, name_en: string }>();
            Object.values(data.companies).forEach((c) => companyMap.set(c.id, { name: c.name, name_en: c.name_en }));

            const lineInfoMap = new Map<number, { name: string, name_en: string, companyId: number, color?: string }>();
            Object.values(data.lines).forEach((l) => lineInfoMap.set(l.id, {
                name: l.name,
                name_en: l.name_en,
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
                        company: companyName,
                        company_en: companyInfo?.name_en || '',
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
        let weight = 2.7; // 4.0 * 2/3 ≈ 2.67
        const z = Math.round(zoomLevel);
        if (z <= 11) weight = 1.5; // 2.2 * 2/3 ≈ 1.47
        else if (z <= 13) weight = 2.0; // 3.0 * 2/3 ≈ 2.0

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
        const isDraft = feature.properties.isDraft;
        const id = feature.properties.id;
        const isHovered = !isDragging && hoveredLine === id;
        const isClicked = activeLine === id;

        // 이동 중일 때도 방문 경로(isUsed)와 미리보기 경로(isDraft)는 계속 표시함
        const showGlow = isUsed || isDraft || (!isMoving && (isHovered || isClicked));
        if (!showGlow) return { opacity: 0, interactive: false };

        // 강조 색상 결정 (isDraft가 최우선 순위 중 하나)
        let color = '#FFD60A'; // 기본: 호버(Yellow)

        if (isDraft) {
            color = '#007AFF'; // 미리보기는 파란색
        } else if (isMoving && isUsed) {
            color = '#2ecc71';
        } else if (isClicked) {
            color = '#007AFF';
        } else if (isUsed && !isHovered) {
            color = '#2ecc71';
        }

        // 강조 여부
        const isEmphasis = isClicked || isHovered || isUsed || isDraft;

        // 표준화된 테두리 두께 로직 - 2/3 Scale Applied
        let baseWeight = 4.2; // 6.25 * 2/3 ≈ 4.17
        const z = Math.round(zoomLevel);
        if (z <= 11) baseWeight = 2.7; // 4.0 * 2/3 ≈ 2.67
        else if (z <= 13) baseWeight = 3.3; // 5.0 * 2/3 ≈ 3.33

        const factor = isMobile ? 1.4 : 1.0;
        const emphasisOffset = isEmphasis ? (z >= 14 ? 5.0 : 3.3) : 0; // 7.5 * 2/3 = 5.0, 5.0 * 2/3 ≈ 3.33
        const finalWeight = (baseWeight * factor) + emphasisOffset;

        return {
            color: color,
            weight: finalWeight,
            opacity: (isUsed || isDraft) && !isHovered && !isClicked ? 0.6 : 1.0,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            smoothFactor: styleConfig.smoothFactor,
            interactive: false
        } as L.PathOptions;
    }, [hoveredLine, activeLine, isMoving, isDragging, isMobile, zoomLevel, styleConfig]);

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
        const props = feature.properties as { id: string; name: string; name_en?: string; company: string; company_en?: string; endpoints?: string };
        const { name, name_en, company, company_en, endpoints } = props;

        // Japanese is always primary (larger), English is always secondary (smaller)
        const primaryLine = name;
        const secondaryLine = name_en && name_en !== name ? name_en : '';

        const primaryCorp = company;
        const secondaryCorp = company_en && company_en !== company ? company_en : '';

        const tooltipContent = `
            <div style="padding: 2px; min-width: 160px; font-family: Pretendard, sans-serif; max-height: 300px; display: flex; flex-direction: column; border-left: 4px solid ${feature.properties.color || '#999'}; padding-left: 8px;">
                <div style="display: flex; flex-direction: column; border-bottom: 2px solid ${feature.properties.color || '#999'}; margin-bottom: 8px; padding-bottom: 4px;">
                    <span style="font-weight: 900; font-size: 14px; color: #2c3e50;">${primaryLine}</span>
                    <span style="font-weight: 600; font-size: 10px; color: #718096; margin-top: -2px;">${secondaryLine}</span>
                </div>
                <div style="flex: 1; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">
                    <div style="font-size: 11px; font-weight: 700; color: #4a5568; line-height: 1.4;">
                        ${primaryCorp}
                    </div>
                    <div style="font-size: 9px; font-weight: 600; color: #718096; margin-bottom: 4px;">
                        ${secondaryCorp}
                    </div>
                    ${endpoints ? `
                        <div style="font-size: 9px; color: #cbd5e0; margin-top: 4px; border-top: 1px solid #edf2f7; padding-top: 4px; font-style: italic;">
                            ${endpoints}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true,
                direction: 'auto',
                offset: [15, 0],
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

    // Safety cleanup: Ensure no tooltips linger when component remounts (due to key change)
    useEffect(() => {
        return () => {
            if (interactionLayerRef.current) {
                interactionLayerRef.current.eachLayer((l: any) => {
                    if (l.closeTooltip) l.closeTooltip();
                });
            }
        };
    }, []);

    // Stable key: only re-render on data or major zoom changes
    const layerKey = useMemo(() => {
        const draftIdsArray = Array.from(draftSectionIds || []);
        const draftKey = draftIdsArray.length > 0 ? `${draftIdsArray.length}_${draftIdsArray[draftIdsArray.length - 1]}` : 'none';
        return `${zoomGroup}_${usedSectionIds.size}_${selectionSet.size}_${draftKey}`;
    }, [zoomGroup, usedSectionIds.size, selectionSet.size, draftSectionIds]);

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
                    pathOptions={pathOptions}
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
                    pathOptions={pathOptions}
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

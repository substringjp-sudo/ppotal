"use client";

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getLineColor } from '../lib/lineColors';
import { getSmartTooltipOptions } from '../lib/uiUtils';
import { trackEvent } from '../lib/gtag';
import { GroupingMode, RailData, Section, ServiceGroup } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { glowCanvas, casingCanvas, railroadCanvas, sharedSvgRenderer } from './Map';
import { shapeGeometry } from '../lib/lineShapes';

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
    /** 실어 온 운행계통. 비어 있으면 계통 모드로 두어도 선적처럼 보인다. */
    services?: ServiceGroup[];
    /** 선을 선적으로 묶을지 운행계통으로 묶을지. */
    groupingMode?: GroupingMode;
    onTooltipUpdate?: (content: string | null, x: number, y: number, priority?: 'low' | 'high') => void;
    /** Bumps whenever the set of sections handed in actually changes. */
    dataRevision: number;
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
    services,
    groupingMode = 'track',
    isMoving = false,
    usedSectionIds = new Set(),
    isDragging = false,
    draftSectionIds = new Set(),
    settings,
    onTooltipUpdate,
    dataRevision
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
        const zoomWeight = 1.0; // Always full weight now for snappy feel

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
            // Douglas-Peucker tolerance in screen pixels, applied every time
            // Leaflet projects a line. At 1.0 the map was paying to draw detail
            // finer than a pixel; zoomed out that is most of the vertices.
            smoothFactor: zoomGroup === 3 ? 1.0 : zoomGroup === 2 ? 2.0 : 3.0
        };
    }, [zoomGroup, zoomLevel]);

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

            // 계통 모드에서 구간을 무슨 이름·색으로 묶을지.
            //
            // 계통이 정의된 구간만 제 색을 얻고 나머지는 선적 그대로 남는다. 일본
            // 철도에서 계통과 선적이 갈리는 곳은 대도시권 몇 군데뿐이라, 계통을 못
            // 채운 노선을 지도에서 지우는 것보다 선적으로 남겨 두는 편이 사실에 가깝다.
            const serviceBySection = new Map<number, ServiceGroup>();
            if (groupingMode === 'service' && services) {
                services.forEach((svc) => {
                    svc.sections.forEach((id) => {
                        if (!serviceBySection.has(id)) serviceBySection.set(id, svc);
                    });
                });
            }

            // Group sections by (group, isUsed, isDraft)
            // group 은 선적 모드면 line_id, 계통 모드면 계통 id(없으면 line_id)다.
            const groupedSections = new Map<string, [number, number][][]>();
            if (data.sections && Array.isArray(data.sections.sections)) {
                data.sections.sections.forEach((s: Section) => {
                    const isUsed = usedSectionIds.has(s.id);
                    const isDraft = draftSectionIds?.has(s.id) || false;
                    const svc = serviceBySection.get(s.id);
                    // '\u0000' 로 나눠 이름에 밑줄이 있어도 안 깨지게 한다.
                    const key = [svc ? `svc:${svc.id}` : `line:${s.line_id}`, s.line_id, isUsed, isDraft].join('\u0000');
                    if (!groupedSections.has(key)) groupedSections.set(key, []);
                    // Reshaping is cached against the geometry array, so this is
                    // a map lookup for every section after the first sighting.
                    groupedSections.get(key)!.push(shapeGeometry(s.geometry, settings.shapeMode));
                });
            }

            groupedSections.forEach((geoms, key) => {
                const [groupKey, lineIdStr, isUsedStr, isDraftStr] = key.split('\u0000');
                const lineId = parseInt(lineIdStr);
                const isUsed = isUsedStr === 'true';
                const isDraft = isDraftStr === 'true';

                const info = lineInfoMap.get(lineId);
                if (!info) return;
                const companyInfo = companyMap.get(info.companyId);
                const companyName = companyInfo?.name || String(info.companyId);
                const fullId = `${info.companyId}::${lineId}`;

                // 계통으로 묶였으면 이름과 색은 계통 것을 쓴다. 다만 **누르면 잡히는
                // 대상은 그대로 선적**이다(fullId). 모드에 따라 클릭 결과가 달라지면
                // 사용자가 자기가 무엇을 고른 건지 알 수 없게 된다.
                const svc = groupKey.startsWith('svc:')
                    ? services?.find((x) => `svc:${x.id}` === groupKey)
                    : undefined;

                features.push({
                    type: 'Feature',
                    properties: {
                        id: fullId,
                        name: svc?.name || info.name,
                        name_en: info.name_en,
                        name_kr: svc?.name_kr || info.name_kr,
                        company: companyName,
                        company_en: companyInfo?.name_en || '',
                        company_kr: companyInfo?.name_kr || '',
                        color: svc?.color || getLineColor(fullId, data) || '#999',
                        isUsed: isUsed,
                        isDraft: isDraft,
                        serviceId: svc?.id,
                        serviceName: svc ? svc.name_kr || svc.name : undefined,
                        trackName: info.name_kr || info.name
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
    }, [railroadNetwork, usedSectionIds, draftSectionIds, settings.shapeMode, services, groupingMode]);


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
    }, [isFilterActive, selectionSet, activeLine, styleConfig, hoveredLine, zoomLevel, isDragging, isMobile, settings]);

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
            // This layer is never seen — it only has to be hit-testable within
            // its own 14px stroke, so it can be simplified far harder than the
            // visible lines. Every vertex dropped here is one less to project
            // and one less to write into an SVG path on each zoom.
            smoothFactor: 6.0,
            renderer: sharedSvgRenderer || undefined
        } as L.PathOptions;
    }, [isMobile]);

    const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
        if (!feature.properties) return;
        const props = feature.properties as any;
        const { id, endpoints } = props;

        const lineData = railroadNetwork?.lines?.[id.split('::')[1]];
        const companyData = railroadNetwork?.companies?.[id.split('::')[0]];

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
                    ${props.serviceName ? `
                        <div style="font-size: 10px; color: #a0aec0; margin-bottom: 6px; line-height: 1.5;">
                            <span style="font-weight: 700; color: #718096;">선적</span> ${props.trackName}
                        </div>
                    ` : ''}
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

    // Restyling walks every feature, so it must only happen when a style
    // function has genuinely changed. It used to also run on isMoving, which
    // no style reads — so starting and finishing any pan restyled the whole
    // network twice to produce exactly the same pixels.
    useEffect(() => {
        if (mainLayerRef.current) mainLayerRef.current.setStyle(unifiedStyle);
    }, [unifiedStyle]);

    useEffect(() => {
        if (glowLayerRef.current) glowLayerRef.current.setStyle(glowStyle);
    }, [glowStyle]);

    useEffect(() => {
        if (interactionLayerRef.current) interactionLayerRef.current.setStyle(interactionStyle);
    }, [interactionStyle]);

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

    // react-leaflet only picks up new GeoJSON through a remount, so the key
    // tracks exactly what changes the *data*. Zoom is deliberately not in here:
    // zoom only changes styling, and styling goes through setStyle above.
    const layerKey = useMemo(() => {
        const draftIdsArray = Array.from(draftSectionIds || []);
        const draftKey = draftIdsArray.length > 0 ? `${draftIdsArray.length}_${draftIdsArray[draftIdsArray.length - 1]}` : 'none';

        // usedSectionIds의 실제 내용 변화를 감지하기 위해 size뿐만 아니라
        // 데이터의 특징적인 값(해시 대용)을 포함합니다.
        const usedIdsHash = Array.from(usedSectionIds).slice(-10).join(',');

        // 묶는 방식이 바뀌면 구간이 다른 덩어리로 다시 묶이므로 이것도 데이터 변화다.
        // 계통 목록은 뒤늦게 도착하니(비동기) 개수도 같이 넣는다 — 'service' 로
        // 저장된 채로 새로 들어온 경우, 목록이 도착하는 순간 다시 그려야 한다.
        const groupKey = `${groupingMode}_${services?.length ?? 0}`;
        return `${dataRevision}_${settings.shapeMode}_${usedSectionIds.size}_${usedIdsHash}_${draftKey}_${language}_${groupKey}`;
    }, [dataRevision, settings.shapeMode, usedSectionIds, draftSectionIds, language, groupingMode, services]);

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

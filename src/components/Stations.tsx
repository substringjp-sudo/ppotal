"use client";

import React, { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { MapStyleSettings } from './MainPageClient';
import { Language } from '../lib/translations';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';
import { RailData } from '../types/railData';
import { convexHull } from '../lib/geoUtils';
import { Company, Line } from '../types/railData';

interface StationFeatureProperties {
    type: 'node' | 'platform' | 'hull';
    stationId: string;
    lines: string[];
    isUsed?: boolean;
    isTransfer?: boolean;
    lineKey?: string;
    color?: string;
}

interface StationsProps {
    processedStations: Record<string, ProcessedStation> | null;
    effectiveZoom: number;
    realZoom: number;
    getColor: (lineKey: string) => string;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language?: Language;
    isMobile: boolean;
    isMoving?: boolean;
    railData: RailData;
    mapBounds: L.LatLngBounds | null;
    handleStationClick: (id: string, lines?: string[]) => void;
    handleStationMouseDown: (id: string, coords: [number, number]) => void;
    handleStationMouseUp?: (id: string) => void;
    onStationHover?: (id: string | null) => void;
    dragStartStation: string | null;
}

const Stations: React.FC<StationsProps> = ({
    processedStations,
    effectiveZoom,
    realZoom,
    getColor,
    selectedLines,
    activeLine,
    hoveredLine,
    visitedStations,
    settings,
    language,
    isMobile,
    isMoving = false,
    railData,
    mapBounds,
    handleStationClick,
    handleStationMouseDown,
    handleStationMouseUp,
    onStationHover,
    dragStartStation
}) => {

    const allEntries = useMemo(() => {
        if (!processedStations) return [];
        return Object.entries(processedStations).map(([id, data]) => {
            let isVisibleAtZoom = true;
            if (effectiveZoom < 8) isVisibleAtZoom = false;
            if (data.isJoint) isVisibleAtZoom = false;
            return { id, data, isVisibleAtZoom };
        }).filter(item => item.isVisibleAtZoom);
    }, [processedStations, effectiveZoom]);

    const visualsGeoJson = useMemo(() => {
        const features: GeoJSON.Feature[] = [];

        allEntries.forEach(({ id, data }) => {
            if (data.nodes) {
                const platforms: number[][][] = [];
                data.nodes.forEach(node => {
                    if (node.platforms) {
                        platforms.push(...node.platforms);
                    }
                });

                if (platforms.length > 0) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'MultiLineString', coordinates: platforms },
                        properties: {
                            type: 'platform',
                            stationId: id,
                            lineKey: data.lines[0] || 'Unknown',
                            lines: data.lines,
                            isUsed: data.isUsed
                        }
                    });
                }
            }
        });

        const nodeAcceptedEntries: typeof allEntries = [];
        const nodeCullDist = effectiveZoom === 8 ? 0.012 : (effectiveZoom === 12 ? 0.0015 : 0);

        allEntries.forEach((entry) => {
            const { id, data } = entry;
            if (effectiveZoom === 8 && data.lines.length < 2 && !data.isUsed) return;

            if (nodeCullDist > 0) {
                const isImportant = data.lines.length > 1 || data.isUsed;
                const tooDense = nodeAcceptedEntries.some(acc => {
                    const dLat = Math.abs(acc.data.centroid[0] - data.centroid[0]);
                    const dLon = Math.abs(acc.data.centroid[1] - data.centroid[1]);
                    return dLat < nodeCullDist && dLon < nodeCullDist;
                });
                if (tooDense && !isImportant) return;
            }

            nodeAcceptedEntries.push(entry);

            features.push({
                type: 'Feature',
                id: `node-${id}`,
                geometry: { type: 'Point', coordinates: [data.centroid[1], data.centroid[0]] },
                properties: {
                    type: 'node',
                    stationId: id,
                    isUsed: data.isUsed,
                    isTransfer: data.lines.length > 1,
                    lines: data.lines
                }
            });
        });

        allEntries.forEach(({ id, data }) => {
            if (data.lines.length > 1 && data.nodes) {
                const points: [number, number][] = [];
                data.nodes.forEach(n => {
                    points.push(n.coord);
                    if (n.platforms) {
                        n.platforms.forEach(p => p.forEach(pt => points.push([pt[1], pt[0]])));
                    }
                });

                if (points.length >= 3) {
                    const hull = convexHull(points);
                    if (hull.length >= 3) {
                        features.push({
                            type: 'Feature',
                            geometry: { type: 'Polygon', coordinates: [hull.map(p => [p[1], p[0]])] },
                            properties: { type: 'hull', stationId: id, lines: data.lines }
                        });
                    }
                }
            }
        });

        return { type: 'FeatureCollection', features };
    }, [allEntries, effectiveZoom]);

    const [localHoveredStation, setLocalHoveredStation] = useState<string | null>(null);

    const nodeStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        let radius = 3;
        if (effectiveZoom === 12) radius = 5;
        if (effectiveZoom >= 14) radius = 7;

        return {
            radius: radius,
            fillColor: '#000',
            stroke: false,
            fillOpacity: 0,
            pane: 'station-interactions'
        };
    }, [effectiveZoom]);

    const hullStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        const props = (feature.properties || {}) as StationFeatureProperties;
        const { lines = [] } = props;
        const isSelected = lines.some((l: string) =>
            selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
        );

        return {
            fillColor: isSelected ? '#ffffff' : '#a0aec0',
            fillOpacity: isSelected ? 0.7 : 0.5,
            stroke: false,
            interactive: false
        };
    }, [selectedLines, activeLine, hoveredLine]);

    const platformStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        const props = (feature.properties || {}) as StationFeatureProperties;
        if (!props.lineKey) return { opacity: 0, interactive: false };
        const { lineKey, lines = [], stationId } = props;
        const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
        const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
        const isSelected = lines.some((l: string) =>
            selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
        ) || (localHoveredStation === stationId);

        const isTransfer = lines.length > 1;
        let color = '#313131';

        if (effectiveZoom >= 8 && effectiveZoom <= 11) {
            if (!isTransfer) {
                color = getColor(lineKey);
            }
        }

        let weight = 4.0;
        if (effectiveZoom <= 7) weight = Math.max(0.1, (effectiveZoom / 7) * 1.5);
        else if (effectiveZoom <= 11) weight = 2.5;
        else if (effectiveZoom <= 13) weight = 3.0;

        const isDimmed = isFilterActive && !isSelected;

        return {
            color: isDimmed ? '#dddddd' : color,
            weight: isMobile ? weight * 1.4 : weight,
            opacity: isDimmed ? 0.3 : 1.0,
            pane: 'station-interactions',
            interactive: false,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
        } as L.PathOptions;
    }, [selectedLines, activeLine, hoveredLine, localHoveredStation, effectiveZoom, getColor, isMobile]);

    const getStandardCasingWeight = useCallback((zoom: number, isEmphasis: boolean) => {
        let base = 12.5;
        if (zoom <= 7) base = Math.max(0.2, (zoom / 7) * 5.0);
        else if (zoom <= 11) base = 7.5;
        else if (zoom <= 13) base = 10.0;

        const factor = isMobile ? 1.4 : 1.0;
        const emphasisOffset = isEmphasis ? (zoom >= 14 ? 15 : 10) : 0;
        return (base * factor) + emphasisOffset;
    }, [isMobile]);

    const platformCasingStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature || isMoving) return { opacity: 0, interactive: false };
        const props = (feature.properties || {}) as StationFeatureProperties;
        if (!props.lines) return { opacity: 0, interactive: false };
        const { lines, stationId, isUsed } = props;

        // 역 자체가 호버되거나, 역이 포함된 노선 중 하나가 호버된 경우
        const isLineHovered = hoveredLine !== null && lines.includes(hoveredLine);
        const isStationHovered = localHoveredStation === stationId;
        const isHovered = isLineHovered || isStationHovered;

        const isClicked = activeLine !== null && lines.includes(activeLine);
        const isDraggingOverall = !!dragStartStation;

        if (!isHovered && !isClicked && !isUsed) return { opacity: 0, interactive: false };

        let color = '#FF3B30'; // 기본: 직접 호버(Red)
        const isEmphasis = isClicked || isHovered || (isDraggingOverall && isHovered);

        if (isClicked || (isDraggingOverall && isHovered)) {
            color = '#007AFF';
        } else if (isLineHovered && !isStationHovered) {
            // 노선 호버를 통해 강조되는 플랫폼은 노란색
            color = '#FFD60A';
        } else if (isUsed && !isHovered) {
            color = '#2ecc71';
        }

        const casingWeight = getStandardCasingWeight(effectiveZoom, isEmphasis);

        return {
            color: color,
            weight: casingWeight,
            opacity: isUsed && !isHovered && !isClicked ? 0.6 : 1.0,
            pane: 'railroad-casing',
            interactive: false,
            lineCap: 'round' as const,
            lineJoin: 'round' as const
        };
    }, [hoveredLine, localHoveredStation, activeLine, dragStartStation, isMoving, effectiveZoom, getStandardCasingWeight]);

    const platformInteractionStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        return {
            color: '#000',
            weight: isMobile ? 24 : 16,
            opacity: 0,
            interactive: true,
            lineCap: 'round' as const,
            lineJoin: 'round' as const
        };
    }, [isMobile]);

    const nodeInteractionStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        return {
            radius: isMobile ? 12 : 8,
            fillColor: '#000',
            fillOpacity: 0,
            stroke: false,
            interactive: true
        };
    }, [isMobile]);

    const stationInteractionStyle = useCallback((f?: GeoJSON.Feature) => {
        if (!f || !f.properties) return { opacity: 0, interactive: false };
        if (f.properties.type === 'platform') return platformInteractionStyle(f);
        return nodeInteractionStyle(f);
    }, [platformInteractionStyle, nodeInteractionStyle]);

    const onEachStation = (feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = (feature.properties || {}) as StationFeatureProperties;
        const id = props.stationId;
        const station = id ? processedStations?.[id] : null;
        if (!station) return;

        const stationNameJA = station.name;
        const stationNameEN = station.name_en || '';

        const lineList = station.lines.map(l => {
            const [company, line] = l.includes('::') ? l.split('::') : ['Unknown', l];
            const lineData = (railData.lines as Record<string, Line>)[line];
            const dispLineJA = lineData?.name || line;
            const dispLineEN = lineData?.name_en || (lineData?.name ? '' : line);
            const color = getColor(l);

            return `
                <div style="display: flex; flex-direction: column; gap: 1px; background: #f8f9fa; border-left: 4px solid ${color}; padding: 6px 10px; margin-bottom: 6px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-size: 11px; color: #1a1a1a; font-weight: 800;">${dispLineJA}</span>
                        ${dispLineEN ? `<span style="font-size: 9px; color: #718096; font-weight: 500; opacity: 0.9;">${dispLineEN}</span>` : ''}
                    </div>
                </div>`;
        }).join('');

        const tooltipContent = `
            <div style="padding: 2px; min-width: 160px; font-family: Pretendard, sans-serif;">
                <div style="display: flex; flex-direction: column; border-bottom: 2px solid #3498db; margin-bottom: 8px; padding-bottom: 4px;">
                    <span style="font-weight: 900; font-size: 15px; color: #2c3e50;">${stationNameJA}</span>
                    ${stationNameEN ? `<span style="font-weight: 600; font-size: 11px; color: #718096; margin-top: -2px;">${stationNameEN}</span>` : ''}
                </div>
                <div style="display: flex; flex-direction: column;">${lineList}</div>
            </div>`;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true, direction: 'top', offset: [0, -10], opacity: 0.9, pane: 'top-tooltips'
            });
        }

        layer.on({
            click: (e) => { L.DomEvent.stopPropagation(e); handleStationClick(id); },
            mousedown: (e) => { L.DomEvent.stopPropagation(e); handleStationMouseDown(id, [e.latlng.lat, e.latlng.lng]); },
            mouseover: () => { setLocalHoveredStation(id); if (onStationHover) onStationHover(id); },
            mouseout: () => { setLocalHoveredStation(null); if (onStationHover) onStationHover(null); },
            mouseup: (e) => { L.DomEvent.stopPropagation(e); if (handleStationMouseUp) handleStationMouseUp(id); }
        });
    };

    const hullRef = useRef<L.GeoJSON>(null);
    const platformRef = useRef<L.GeoJSON>(null);
    const nodeRef = useRef<L.GeoJSON>(null);
    const platformCasingRef = useRef<L.GeoJSON>(null);
    const interactionRef = useRef<L.GeoJSON>(null);

    useEffect(() => {
        if (hullRef.current) hullRef.current.setStyle(hullStyle);
        if (platformRef.current) platformRef.current.setStyle(platformStyle as L.PathOptions);
        if (nodeRef.current) nodeRef.current.setStyle(nodeStyle as L.PathOptions);
        if (platformCasingRef.current) platformCasingRef.current.setStyle(platformCasingStyle as L.PathOptions);
        if (interactionRef.current) interactionRef.current.setStyle(stationInteractionStyle);
    }, [activeLine, hoveredLine, selectedLines, hullStyle, platformStyle, nodeStyle, platformCasingStyle, platformInteractionStyle, nodeInteractionStyle, stationInteractionStyle, localHoveredStation, effectiveZoom]);

    const bakedKey = useMemo(() => `${effectiveZoom}_${allEntries.length}`, [effectiveZoom, allEntries.length]);

    const visibleLabels = useMemo(() => {
        if (effectiveZoom < 14 || !mapBounds) return [];
        const paddedBounds = mapBounds.pad(0.5);
        const candidates = allEntries.filter(({ data }) => paddedBounds.contains(data.centroid));
        if (candidates.length === 0) return [];

        const prioritized = [...candidates].sort((a, b) => {
            const getPriority = (item: typeof a) => {
                let p = 0;
                const isSelected = item.data.lines.some(l => selectedLines.includes(l) || activeLine === l || hoveredLine === l);
                if (isSelected) p += 1000;
                if (item.data.lines.length > 1) p += 100;
                if (item.data.isUsed) p += 50;
                return p;
            };
            return getPriority(b) - getPriority(a);
        });

        const zoomFactor = Math.pow(2, 14 - realZoom);
        const minDistanceLat = 0.0025 * zoomFactor;
        const minDistanceLon = 0.0045 * zoomFactor;
        const accepted: typeof prioritized = [];

        prioritized.forEach(candidate => {
            const isSelected = candidate.data.lines.some(l => selectedLines.includes(l) || activeLine === l || hoveredLine === l);
            if (isSelected) { accepted.push(candidate); return; }
            const collision = accepted.some(acc => {
                const dLat = Math.abs(acc.data.centroid[0] - candidate.data.centroid[0]);
                const dLon = Math.abs(acc.data.centroid[1] - candidate.data.centroid[1]);
                return dLat < minDistanceLat && dLon < minDistanceLon;
            });
            if (!collision) accepted.push(candidate);
        });
        return accepted;
    }, [allEntries, mapBounds, effectiveZoom, realZoom, selectedLines, activeLine, hoveredLine]);

    if (!processedStations) return null;

    return (
        <React.Fragment>
            <GeoJSON
                ref={hullRef}
                key={`hulls-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={hullStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'hull'}
                pane="railroad-glow"
            />
            <GeoJSON
                ref={platformCasingRef}
                key={`platforms-casing-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={platformCasingStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'platform'}
                pane="railroad-casing"
            />
            <GeoJSON
                ref={platformRef}
                key={`platforms-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={platformStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'platform'}
                pane="station-interactions"
                interactive={false}
            />
            <GeoJSON
                ref={nodeRef}
                key={`nodes-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={nodeStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'node'}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => L.circleMarker(latlng, nodeStyle(feature) as L.CircleMarkerOptions)}
                pane="station-interactions"
                interactive={false}
            />
            <GeoJSON
                ref={interactionRef}
                key={`station-interact-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                filter={(feature) => feature.properties?.type === 'platform' || feature.properties?.type === 'node'}
                style={stationInteractionStyle}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => L.circleMarker(latlng, nodeInteractionStyle(feature))}
                pane="globalInteraction"
                onEachFeature={onEachStation}
            />
            {effectiveZoom >= 14 && visibleLabels.map(({ id, data }) => (
                <StationMarker
                    key={`marker-${id}`}
                    id={id}
                    station={data}
                    highlightedStations={[]}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    hoveredLine={hoveredLine}
                    zoom={realZoom}
                    zoomConfig={{ baseRadius: 1, weightValue: 1, zoomCategory: 1 }}
                    getColor={getColor}
                    handleStationClick={() => handleStationClick(id, data.lines)}
                    onStationMouseDown={(id, coords) => handleStationMouseDown(id, coords)}
                    onStationMouseUp={() => handleStationMouseUp?.(id)}
                    dragStartStation={dragStartStation}
                    visitedStations={visitedStations}
                    settings={settings}
                    language={language || 'en'}
                    isMobile={isMobile}
                    isMoving={isMoving}
                    railData={railData}
                    onlyLabels={true}
                    interactive={false}
                />
            ))}
        </React.Fragment>
    );
};

const MemoizedStations = memo(Stations);
MemoizedStations.displayName = 'Stations';
export default MemoizedStations;

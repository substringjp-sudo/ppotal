"use client";

import React, { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON, useMap } from 'react-leaflet';
import { MapStyleSettings } from './MainPageClient';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';
import { sharedSvgRenderer, railroadCanvas, glowCanvas, casingCanvas, stationCanvas } from './Map';
import { RailData } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { getSmartTooltipOptions } from '../lib/uiUtils';
import { trackEvent } from '../lib/gtag';
import { convexHull } from '../lib/geoUtils';
import { Line } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName, getLocalizedAddress, RegionNames } from '../lib/i18n-utils';

interface StationFeatureProperties {
    type: 'node' | 'platform' | 'hull';
    stationId: string;
    lines: string[];
    isUsed?: boolean;
    isTransfer?: boolean;
    isDraft?: boolean;
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
    isMobile: boolean;
    isMoving?: boolean;
    railData: RailData;
    mapBounds: L.LatLngBounds | null;
    handleStationClick: (id: string, lines?: string[]) => void;
    handleStationMouseDown: (id: string, coords: [number, number]) => void;
    handleStationMouseUp?: (id: string) => void;
    onStationHover?: (id: string | null) => void;
    dragStartStation: string | null;
    draftStationIds?: Set<string>;
    showLabels?: boolean;
    selectedStation?: string | null;
    onTooltipUpdate?: (content: string | null, x: number, y: number, priority?: 'low' | 'high') => void;
}


const Stations: React.FC<StationsProps> = ({
    processedStations,
    effectiveZoom,
    realZoom,
    getColor,
    selectedLines,
    activeLine,
    hoveredLine,
    isMobile,
    isMoving = false,
    railData,
    mapBounds,
    handleStationClick,
    handleStationMouseDown,
    handleStationMouseUp,
    onStationHover,
    dragStartStation,
    settings,
    draftStationIds = new Set(),
    showLabels = false,
    selectedStation = null,
    onTooltipUpdate
}) => {

    const { language, isKorean } = useI18n();
    const map = useMap();
    const [panesReady, setPanesReady] = useState(false);
    const [regionNames, setRegionNames] = useState<RegionNames | null>(null);

    useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    useEffect(() => {
        let isMounted = true;
        const checkPanes = () => {
            if (!isMounted) return;
            const required = [
                'railroad-glow',
                'railroad-casing',
                'railroad-lines',
                'master-interactions',
                'station-labels'
            ];
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

    const lastMouseDownPos = useRef<L.LatLng | null>(null);

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
            if (onStationHover) onStationHover(null);
            setLocalHoveredStation(null);
        }
    }, [isMoving, map, onStationHover]);
    const platformPathOptions = useMemo(() => ({
        renderer: railroadCanvas || undefined
    }), []);
    const casingPathOptions = useMemo(() => ({
        renderer: casingCanvas || undefined
    }), []);
    const glowPathOptions = useMemo(() => ({
        renderer: glowCanvas || undefined
    }), []);
    const stationPathOptions = useMemo(() => ({
        renderer: stationCanvas || undefined
    }), []);

    const allEntries = useMemo(() => {
        if (!processedStations) return [];
        return Object.entries(processedStations).map(([id, data]) => {
            // stations_lod already manages which stations are visible at which zoom.
            // So we trust processedStations here.
            let isVisibleAtZoom = true;
            if (data.isJoint) isVisibleAtZoom = false;
            return { id, data, isVisibleAtZoom };
        }).filter(item => item.isVisibleAtZoom);
    }, [processedStations]);

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
                            isUsed: data.isUsed,
                            isDraft: draftStationIds.has(id)
                        }
                    });
                }
            }
        });

        allEntries.forEach((entry) => {
            const { id, data } = entry;
            features.push({
                type: 'Feature',
                id: `node-${id}`,
                geometry: { type: 'Point', coordinates: [data.centroid[1], data.centroid[0]] },
                properties: {
                    type: 'node',
                    stationId: id,
                    isUsed: data.isUsed,
                    isDraft: draftStationIds.has(id),
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

                if (points.length >= 2) {
                    const expandedPoints: [number, number][] = [];
                    const dLat = 0.0006;
                    const dLon = 0.0009;

                    points.forEach(([lat, lon]) => {
                        expandedPoints.push([lat + dLat, lon + dLon]);
                        expandedPoints.push([lat + dLat, lon - dLon]);
                        expandedPoints.push([lat - dLat, lon + dLon]);
                        expandedPoints.push([lat - dLat, lon - dLon]);
                    });

                    const hull = convexHull(expandedPoints);
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
    }, [allEntries, effectiveZoom, draftStationIds]);

    const [localHoveredStation, setLocalHoveredStation] = useState<string | null>(null);

    const nodeStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const props = feature.properties as StationFeatureProperties;
        const { isTransfer, isDraft, isUsed } = props;

        // Use settings for base radius
        const sizeMultiplier = isUsed ? settings.visited.stationSize : settings.unvisited.stationSize;

        // Base radii adjusted to ensure white fill Visibility at low zoom
        let radius = 2.0 * sizeMultiplier;
        if (realZoom >= 10) radius = 2.7 * sizeMultiplier;
        if (realZoom >= 12) radius = 3.3 * sizeMultiplier;
        if (realZoom >= 14) radius = 4.0 * sizeMultiplier;

        if (isTransfer) {
            radius *= 1.4;
        }

        // Only show nodes when zoomed in enough or if it's a transfer/draft
        // Base styling
        let weight = 1.0;
        let color = '#000';
        if (realZoom >= 11) {
            weight = isTransfer ? 1.7 : 1.0;
        }

        // Highlight if hovered or selected
        const isHovered = localHoveredStation === props.stationId;
        const isSelected = selectedStation === props.stationId;

        if (isHovered || isSelected) {
            weight = isTransfer ? 2.5 : 2.0;
            color = isSelected ? '#007AFF' : '#FFD60A'; // Blue for selected, Yellow for hover
        }

        const minVisibleZoom = isTransfer ? 7 : 10;
        const isVisible = (realZoom >= minVisibleZoom || isDraft);

        return {
            radius: radius,
            fillColor: '#ffffff',
            stroke: true,
            color: color,
            weight: weight,
            fillOpacity: isVisible ? 1.0 : 0,
            opacity: isVisible ? 1.0 : 0,
            pane: 'station-labels'
        };
    }, [realZoom, localHoveredStation, selectedStation, settings, isMoving]);

    const hullStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const props = feature.properties as StationFeatureProperties;
        const { lines = [], stationId } = props;

        const isStationHovered = localHoveredStation === stationId;
        const isLineHovered = hoveredLine !== null && lines.includes(hoveredLine);
        const isHovered = isStationHovered || isLineHovered;
        const isClicked = (activeLine !== null && lines.includes(activeLine));

        if (!isHovered && !isClicked) {
            return {
                fillColor: '#4a5568',
                fillOpacity: 0.12,
                stroke: false,
                interactive: false
            };
        }

        let color = '#FF3B30';
        if (isClicked) {
            color = '#007AFF';
        } else if (isLineHovered && !isStationHovered) {
            color = '#FFD60A';
        }

        return {
            fillColor: color,
            fillOpacity: 0.25,
            stroke: false,
            interactive: false
        };
    }, [hoveredLine, activeLine, localHoveredStation, isMoving]);

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

        const isUsed = props.isUsed;
        const baseColor = getColor(lineKey);
        const color = isFilterActive && !isSelected ? '#dddddd' : baseColor;

        const baseWeight = isUsed ? settings.visited.weight : settings.unvisited.weight;

        // Synchronize with RailroadLayer weight scaling (2/3 scale roughly)
        let weight = baseWeight * 2.1; // Platforms are naturally thicker
        if (effectiveZoom <= 11) weight = baseWeight * 1.2;
        else if (effectiveZoom <= 13) weight = baseWeight * 1.7;

        const isHoveredLocal = localHoveredStation === stationId;
        const isSelectedLocal = selectedStation === stationId;

        if (isHoveredLocal || isSelectedLocal) {
            weight += 2.0;
        }

        const isDimmed = isFilterActive && !isSelected;
        return {
            color: color,
            weight: isMobile ? weight * 1.3 : weight,
            opacity: isDimmed ? 0.3 : 1.0,
            pane: 'railroad-lines',
            interactive: false,
            lineCap: 'butt' as const,
            lineJoin: 'round' as const,
        } as L.PathOptions;
    }, [selectedLines, activeLine, hoveredLine, localHoveredStation, selectedStation, effectiveZoom, getColor, isMobile, settings]);

    const platformCasingStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature || !feature.properties) return { opacity: 0, interactive: false };
        const props = (feature.properties || {}) as StationFeatureProperties;
        const { lines = [], stationId, isUsed, isDraft } = props;

        const isLineHovered = hoveredLine !== null && lines.includes(hoveredLine);
        const isStationHovered = localHoveredStation === stationId;
        const isSelectedLocal = selectedStation === stationId;
        const isHovered = isLineHovered || isStationHovered || isSelectedLocal;
        const isClicked = (activeLine !== null && lines.includes(activeLine)) || isSelectedLocal;
        const isDragStart = dragStartStation === stationId;

        const isEmphasis = isClicked || isHovered || isDragStart || isUsed || isDraft;
        const showEmphasis = isEmphasis; // We keep it visible during move if isEmphasis is true

        // Weights reduced by ~2/3 from [12.0, 7.0, 9.5]
        // Synchronize target weight with settings
        const targetWeight = isUsed ? settings.visited.weight : settings.unvisited.weight;

        let weight = targetWeight * 2.1 + (isUsed ? 3.5 : 2.2);
        if (effectiveZoom <= 11) weight = targetWeight * 1.2 + (isUsed ? 2.5 : 1.5);
        else if (effectiveZoom <= 13) weight = targetWeight * 1.7 + (isUsed ? 3.0 : 1.8);

        if (isHovered || isClicked) {
            weight += 2.0;
        }

        let color = '#333';
        if (showEmphasis) {
            if (isDraft) color = '#007AFF';
            else if (isUsed) color = '#2ecc71';
            else if (isDragStart || isClicked) color = '#007AFF';
            else if (isLineHovered || isStationHovered) color = '#FFD60A';
        }

        return {
            color: color,
            weight: weight,
            opacity: 1.0,
            pane: 'railroad-casing',
            interactive: false,
            lineCap: 'butt' as const,
            lineJoin: 'miter' as const,
        };
    }, [hoveredLine, activeLine, dragStartStation, localHoveredStation, selectedStation, effectiveZoom, isMoving]);

    const platformInteractionStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature) return { opacity: 0, interactive: false };
        return {
            color: '#000',
            weight: isMobile ? 24 : 16,
            opacity: 0.0001,
            pane: 'master-interactions',
            interactive: true,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            renderer: sharedSvgRenderer || undefined
        };
    }, [isMobile]);

    const nodeInteractionStyle = useCallback((feature?: GeoJSON.Feature): L.CircleMarkerOptions => {
        if (!feature) return { opacity: 0, interactive: false };
        return {
            radius: isMobile ? 12 : 8,
            fillColor: '#000',
            fillOpacity: 0.0001, // Use near-zero instead of zero for reliable hit testing
            stroke: false,
            interactive: true,
            pane: 'master-interactions',
            renderer: sharedSvgRenderer || undefined
        };
    }, [isMobile]);

    const stationInteractionStyle = useCallback((f?: GeoJSON.Feature): L.PathOptions => {
        if (!f || !f.properties) return { opacity: 0, interactive: false };
        if (f.properties.type === 'platform') return platformInteractionStyle(f);
        return nodeInteractionStyle(f) as L.PathOptions;
    }, [platformInteractionStyle, nodeInteractionStyle]);

    const onEachStation = (feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = (feature.properties || {}) as StationFeatureProperties;
        const id = props.stationId;
        const station = id ? processedStations?.[id] : null;
        if (!station) return;

        const localizedName = getLocalizedName(station, language);
        const nameSub = language !== 'ja' ? station.name : '';
        const rawStation = railData.stations[id];
        const address = getLocalizedAddress(rawStation?.prefecture_id, rawStation?.city_id, regionNames, language);
        const addressJA = getLocalizedAddress(rawStation?.prefecture_id, rawStation?.city_id, regionNames, 'ja');
        const nameSecondary = language !== 'ja' ? station.name : '';

        const lineList = station.lines.map(l => {
            const lineId = l.includes('::') ? l.split('::')[1] : l;
            const lineData = (railData.lines as Record<string, Line>)[lineId];
            const lineName = getLocalizedName(lineData, language);
            const lineSub = language !== 'ja' ? lineData.name : '';
            const color = getColor(l);

            return `
                <div style="display: flex; flex-direction: column; gap: 1px; background: #f8f9fa; border-left: 4px solid ${color}; padding: 6px 10px; margin-bottom: 6px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-size: 11px; color: #1a1a1a; font-weight: 800;">${lineName}</span>
                        ${lineSub ? `<span style="font-size: 9px; color: #718096; font-weight: 500; opacity: 0.9;">${lineSub}</span>` : ''}
                    </div>
                </div>`;
        }).join('');

        const addressSection = address ? `
            <div class="station-address" style="display: flex; flex-direction: column; text-align: right; margin-top: 2px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                <span style="font-size: 10px; font-weight: 700; color: #4a5568; letter-spacing: -0.01em;">${address}</span>
                ${(addressJA && addressJA !== address) ? `<span style="font-size: 9px; font-weight: 500; color: #a0aec0;">${addressJA}</span>` : ''}
            </div>` : '';

        const tooltipContent = `
            <div style="padding: 12px 16px; min-width: 200px; font-family: Pretendard, sans-serif;">
                <div style="display: flex; flex-direction: column; border-bottom: 2px solid #2d3748; margin-bottom: 12px; padding-bottom: 8px;">
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 16px;">
                        <div style="display: flex; flex-direction: row; align-items: baseline; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #2d3748; align-self: center;">subway</span>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 900; font-size: 16px; color: #1a202c; line-height: 1.2;">${localizedName}</span>
                                ${nameSub ? `<span style="font-weight: 600; font-size: 11px; color: #718096; margin-top: 2px;">${nameSub}</span>` : ''}
                            </div>
                        </div>
                        ${address ? `
                        <div style="display: flex; flex-direction: column; text-align: right; margin-top: 2px;">
                            <span style="font-size: 10px; font-weight: 700; color: #4a5568; letter-spacing: -0.01em;">${address}</span>
                            ${(addressJA && addressJA !== address) ? `<span style="font-size: 9px; font-weight: 500; color: #a0aec0;">${addressJA}</span>` : ''}
                        </div>` : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; max-height: 250px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">${lineList}</div>
            </div>`;

        // FloatingTooltip handles the display now, so we don't bind a Leaflet tooltip


        const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
        const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
        const isStationActive = !isFilterActive || station.lines.some(l =>
            selectedLines.includes(l) || activeLine === l
        );

        layer.on({
            click: (eValue: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(eValue);
                handleStationClick(id);
            },
            mousedown: (eValue: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(eValue);
                lastMouseDownPos.current = eValue.latlng;
                onTooltipUpdate?.(null, 0, 0);
                if (isStationActive) {
                    handleStationMouseDown(id, [eValue.latlng.lat, eValue.latlng.lng]);
                }
            },
            mouseover: (eValue: L.LeafletMouseEvent) => {
                if (isMovingRef.current && !dragStartStation) return;
                const { clientX, clientY } = (eValue as any).originalEvent;

                onTooltipUpdate?.(tooltipContent, clientX, clientY);
                setLocalHoveredStation(id);
                if (onStationHover) onStationHover(id);
            },
            mousemove: (eValue: L.LeafletMouseEvent) => {
                if (isMovingRef.current && !dragStartStation) return;
                const { clientX, clientY } = (eValue as any).originalEvent;
                onTooltipUpdate?.(tooltipContent, clientX, clientY);
            },
            mouseout: () => {
                onTooltipUpdate?.(null, 0, 0);
                setLocalHoveredStation(null);
                if (onStationHover) onStationHover(null);
            },
            mouseup: (eValue: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(eValue);
                if (isStationActive && handleStationMouseUp) {
                    handleStationMouseUp(id);
                }
            }
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

    }, [activeLine, hoveredLine, selectedLines, hullStyle, platformStyle, nodeStyle, platformCasingStyle, stationInteractionStyle, localHoveredStation, selectedStation, effectiveZoom]);

    // Safety cleanup: Ensure no tooltips linger when component remounts (due to key change)
    useEffect(() => {
        return () => {
            if (interactionRef.current) {
                interactionRef.current.eachLayer((l: any) => {
                    try {
                        l?.closeTooltip?.();
                    } catch (err) { /* ignore */ }
                });
            }
        };
    }, []);

    const bakedKey = useMemo(() => {
        const draftIdsArray = Array.from(draftStationIds || []);
        const draftKey = draftIdsArray.length > 0 ? `${draftIdsArray.length}_${draftIdsArray[draftIdsArray.length - 1]}` : 'none';
        const regionKey = regionNames ? 'loaded' : 'loading';
        return `${effectiveZoom}_${allEntries.length}_${draftKey}_${regionKey}_${language}`;
    }, [effectiveZoom, allEntries.length, draftStationIds, regionNames, language]);

    const visibleLabels = useMemo(() => {
        if (!mapBounds) return [];
        const paddedBounds = mapBounds.pad(2.0);

        let candidates = allEntries.filter(({ data }) => paddedBounds.contains(data.centroid));

        if (realZoom < 14) {
            candidates = candidates.filter((item) => {
                const isSelected = item.data.lines.some(l =>
                    (l && l !== '__NONE__' && selectedLines.includes(l)) ||
                    (activeLine && l === activeLine) ||
                    (hoveredLine && l === hoveredLine)
                );
                const isTransfer = item.data.lines.length > 1;

                if (realZoom < 12) {
                    return isTransfer || (isSelected && (item.id.charCodeAt(0) % 3 === 0));
                }

                return isTransfer || isSelected;
            });
        }

        if (candidates.length === 0) return [];

        const prioritized = [...candidates].sort((a, b) => {
            const getPriority = (item: typeof a) => {
                let p = 0;
                const isSelected = item.data.lines.some(l =>
                    (l && l !== '__NONE__' && selectedLines.includes(l)) ||
                    (activeLine && l === activeLine) ||
                    (hoveredLine && l === hoveredLine)
                );

                if (isSelected) p += 1000;
                if (item.data.lines.length > 1) p += 100;
                if (item.data.isUsed) p += 50;
                return p;
            };
            return getPriority(b) - getPriority(a);
        });

        const zoomFactor = Math.pow(2, Math.max(0, 14 - realZoom));
        const densityMultiplier = realZoom < 14 ? 1.5 : 1.0;
        const minDistanceLat = 0.0035 * zoomFactor * densityMultiplier;
        const minDistanceLon = 0.0070 * zoomFactor * densityMultiplier;
        const accepted: typeof prioritized = [];

        prioritized.forEach(candidate => {
            const isSelected = candidate.data.lines.some(l =>
                (l && l !== '__NONE__' && selectedLines.includes(l)) ||
                (activeLine && l === activeLine) ||
                (hoveredLine && l === hoveredLine)
            );

            const bypassCollision = (realZoom >= 14 && isSelected);

            if (bypassCollision) {
                accepted.push(candidate);
                return;
            }

            const hasCollision = accepted.some(acc => {
                const dLat = Math.abs(acc.data.centroid[0] - candidate.data.centroid[0]);
                const dLon = Math.abs(acc.data.centroid[1] - candidate.data.centroid[1]);
                return dLat < minDistanceLat && dLon < minDistanceLon;
            });

            if (!hasCollision) {
                accepted.push(candidate);
            }
        });

        return accepted;
    }, [allEntries, mapBounds, realZoom, selectedLines, activeLine, hoveredLine]);

    if (!processedStations || !panesReady) return null;

    return (
        <React.Fragment>
            <GeoJSON
                ref={hullRef}
                key={`hulls-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={hullStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'hull'}
                pathOptions={glowPathOptions}
                pane="railroad-glow"
            />
            <GeoJSON
                ref={platformCasingRef}
                key={`platforms-casing-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={platformCasingStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'platform'}
                pathOptions={casingPathOptions}
                pane="railroad-casing"
            />
            <GeoJSON
                ref={platformRef}
                key={`platforms-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={platformStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'platform'}
                pathOptions={platformPathOptions}
                pane="railroad-lines"
                interactive={false}
            />
            <GeoJSON
                ref={nodeRef}
                key={`nodes-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={nodeStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'node'}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => L.circleMarker(latlng, {
                    ...nodeStyle(feature) as L.CircleMarkerOptions,
                    renderer: stationCanvas || undefined
                })}
                pathOptions={stationPathOptions}
                pane="station-labels"
                interactive={false}
            />
            <GeoJSON
                key={`nodes-dots-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                filter={(feature) => feature.properties?.type === 'node' && feature.properties?.isTransfer}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => {
                    const baseStyle = nodeStyle(feature) as L.CircleMarkerOptions;
                    return L.circleMarker(latlng, {
                        radius: (baseStyle.radius || 0) * 0.3,
                        fillColor: '#000',
                        fillOpacity: baseStyle.fillOpacity,
                        stroke: false,
                        pane: 'station-labels',
                        interactive: false,
                        renderer: stationCanvas || undefined
                    });
                }}
            />
            <GeoJSON
                ref={interactionRef}
                key={`station-interact-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                filter={(feature) => feature.properties?.type === 'platform' || feature.properties?.type === 'node'}
                style={stationInteractionStyle}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => L.circleMarker(latlng, nodeInteractionStyle(feature))}
                pane="master-interactions"
                onEachFeature={onEachStation}
            />

            {showLabels && visibleLabels.map(({ id, data }) => (
                <StationMarker
                    key={`marker-${id}`}
                    station={data}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    hoveredLine={hoveredLine}
                />
            ))}

        </React.Fragment>
    );
};

const MemoizedStations = memo(Stations);
MemoizedStations.displayName = 'Stations';
export default MemoizedStations;

"use client";

import React, { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON, useMap } from 'react-leaflet';
import { MapStyleSettings } from './MainPageClient';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';
import { sharedSvgRenderer } from './Map';
import { RailData } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { getSmartTooltipOptions } from '../lib/uiUtils';
import { trackEvent } from '../lib/gtag';
import { convexHull } from '../lib/geoUtils';
import { Line } from '../types/railData';

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

interface RegionNames {
    adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
    adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
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
    draftStationIds = new Set(),
    showLabels = false,
    selectedStation = null
}) => {
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
        let mounted = true;
        const checkPanes = () => {
            if (!mounted) return;
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
        return () => { mounted = false; };
    }, [map]);

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
        const { isTransfer, isDraft } = props;

        // Base radii adjusted to ensure white fill Visibility at low zoom
        let radius = 2.0; // Increased from 1.7 to make it visible
        if (realZoom >= 10) radius = 2.7;
        if (realZoom >= 12) radius = 3.3;
        if (realZoom >= 14) radius = 4.0;

        if (isTransfer) {
            radius *= 1.4; // Slightly increased for more prominence
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
        const isVisible = realZoom >= minVisibleZoom || isDraft;

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
    }, [realZoom, localHoveredStation, selectedStation]);

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
    }, [hoveredLine, activeLine, localHoveredStation]);

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

        const baseColor = getColor(lineKey);
        const color = isFilterActive && !isSelected ? '#dddddd' : baseColor;

        // Weights reduced by ~2/3 from [8.0, 4.5, 6.5]
        let weight = 5.3;
        if (effectiveZoom <= 11) weight = 3.0;
        else if (effectiveZoom <= 13) weight = 4.3;

        const isHoveredLocal = localHoveredStation === stationId;
        const isSelectedLocal = selectedStation === stationId;

        // Add special weight or styling for hovered/selected platform
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
            lineJoin: 'miter' as const,
        } as L.PathOptions;
    }, [selectedLines, activeLine, hoveredLine, localHoveredStation, selectedStation, effectiveZoom, getColor, isMobile]);

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
        const showEmphasis = isEmphasis && !isMoving;

        // Weights reduced by ~2/3 from [12.0, 7.0, 9.5]
        let weight = 8.0;
        if (effectiveZoom <= 11) weight = 4.7;
        else if (effectiveZoom <= 13) weight = 6.3;

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
            opacity: showEmphasis ? 1.0 : 0.4,
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

        const stationNameJA = station.name;
        const stationNameEN = station.name_en || '';
        const rawStation = railData.stations[id];
        const prefecture = rawStation?.prefecture_id && regionNames ? regionNames.adm1[rawStation.prefecture_id] : null;
        const cityName = rawStation?.city_id && regionNames ? regionNames.adm2[rawStation.city_id]?.shapeName : '';
        const regionNameJA = prefecture ? `${prefecture.shapeName}${cityName ? ' ' + cityName : ''}` : cityName;

        const prefectureEn = prefecture?.shapeName_en || '';
        const cityNameEn = rawStation?.city_id && regionNames ? regionNames.adm2[rawStation.city_id]?.shapeName_en : '';
        const regionNameEN = prefectureEn ? `${prefectureEn}${cityNameEn ? ', ' + cityNameEn : ''}` : cityNameEn;

        const lineList = station.lines.map(l => {
            const line = l.includes('::') ? l.split('::')[1] : l;
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
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 900; font-size: 15px; color: #2c3e50;">${stationNameJA}</span>
                            ${stationNameEN ? `<span style="font-weight: 600; font-size: 11px; color: #718096; margin-top: -2px;">${stationNameEN}</span>` : ''}
                        </div>
                        ${regionNameJA ? `
                        <div style="display: flex; flex-direction: column; text-align: right; margin-top: 2px;">
                            <span style="font-size: 10px; color: #4a5568; font-weight: 700;">${regionNameJA}</span>
                            ${regionNameEN ? `<span style="font-size: 8px; color: #718096; font-weight: 500; margin-top: -1px;">${regionNameEN}</span>` : ''}
                        </div>` : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; max-height: 250px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;">${lineList}</div>
            </div>`;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true,
                direction: 'auto',
                offset: [15, 0],
                opacity: 0.9,
                pane: 'top-tooltips'
            });
        }

        const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
        const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
        const isStationActive = !isFilterActive || station.lines.some(l =>
            selectedLines.includes(l) || activeLine === l
        );

        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleStationClick(id);
            },
            mousedown: (e) => {
                L.DomEvent.stopPropagation(e);
                if (isStationActive) {
                    handleStationMouseDown(id, [e.latlng.lat, e.latlng.lng]);
                }
            },
            mouseover: (e: any) => {
                const { clientX: x, clientY: y } = e.originalEvent;
                const container = layer.getPane()?.closest('.leaflet-container');
                if (!container) return;

                const { direction, offset } = getSmartTooltipOptions(x, y, container.clientWidth, container.clientHeight);
                const tooltip = (layer as any).getTooltip();
                if (tooltip) {
                    L.setOptions(tooltip, { direction, offset });
                }

                setLocalHoveredStation(id);
                if (onStationHover) onStationHover(id);
            },
            mousemove: (e: any) => {
                const { clientX: x, clientY: y } = e.originalEvent;
                const container = layer.getPane()?.closest('.leaflet-container');
                if (!container) return;

                const { direction, offset } = getSmartTooltipOptions(x, y, container.clientWidth, container.clientHeight);
                const tooltip = (layer as any).getTooltip();
                if (tooltip) {
                    L.setOptions(tooltip, { direction, offset });
                }
            },
            mouseout: () => {
                setLocalHoveredStation(null);
                if (onStationHover) onStationHover(null);
                layer.closeTooltip();
            },
            mouseup: (e) => {
                L.DomEvent.stopPropagation(e);
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
                    if (l.closeTooltip) l.closeTooltip();
                });
            }
        };
    }, []);

    const bakedKey = useMemo(() => {
        const draftIdsArray = Array.from(draftStationIds || []);
        const draftKey = draftIdsArray.length > 0 ? `${draftIdsArray.length}_${draftIdsArray[draftIdsArray.length - 1]}` : 'none';
        const regionKey = regionNames ? 'loaded' : 'loading';
        return `${effectiveZoom}_${allEntries.length}_${draftKey}_${regionKey}`;
    }, [effectiveZoom, allEntries.length, draftStationIds, regionNames]);

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
                pane="railroad-lines"
                interactive={false}
            />
            <GeoJSON
                ref={nodeRef}
                key={`nodes-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={nodeStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'node'}
                pointToLayer={(feature: GeoJSON.Feature, latlng: L.LatLng) => L.circleMarker(latlng, nodeStyle(feature) as L.CircleMarkerOptions)}
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
                        interactive: false
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

"use client";

import React, { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON, useMap } from 'react-leaflet';
import { MapStyleSettings } from './MainPageClient';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';
import { sharedSvgRenderer } from './Map';
import { RailData } from '../types/railData';
import { convexHull } from '../lib/geoUtils';
import { Line } from '../types/railData';

interface StationFeatureProperties {
    type: 'node' | 'platform' | 'hull';
    stationId: string;
    lines: string[];
    isUsed?: boolean;
    isTransfer?: boolean;
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
    showLabels = false
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
        if (!feature) return { opacity: 0, interactive: false };
        let radius = 3;
        if (effectiveZoom === 10) radius = 5;
        if (effectiveZoom >= 14) radius = 7;

        return {
            radius: radius,
            fillColor: '#000',
            stroke: false,
            fillOpacity: 0,
            pane: 'railroad-lines'
        };
    }, [effectiveZoom]);

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

        const isTransfer = lines.length > 1;
        let color = '#313131';

        if (effectiveZoom >= 8 && effectiveZoom <= 11) {
            if (!isTransfer) {
                color = getColor(lineKey);
            }
        }

        let weight = 4.0;
        if (effectiveZoom <= 11) weight = 2.2;
        else if (effectiveZoom <= 13) weight = 3.0;

        const isDimmed = isFilterActive && !isSelected;

        return {
            color: isDimmed ? '#dddddd' : color,
            weight: isMobile ? weight * 1.4 : weight,
            opacity: isDimmed ? 0.3 : 1.0,
            pane: 'railroad-lines',
            interactive: false,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
        } as L.PathOptions;
    }, [selectedLines, activeLine, hoveredLine, localHoveredStation, effectiveZoom, getColor, isMobile]);

    const getStandardCasingWeight = useCallback((zoom: number, isEmphasis: boolean) => {
        let base = 6.25;
        if (zoom <= 11) base = 4.0;
        else if (zoom <= 13) base = 5.0;

        const factor = isMobile ? 1.4 : 1.0;
        const emphasisOffset = isEmphasis ? (zoom >= 14 ? 7.5 : 5.0) : 0;
        return (base * factor) + emphasisOffset;
    }, [isMobile]);

    const platformCasingStyle = useCallback((feature?: GeoJSON.Feature) => {
        if (!feature) return { opacity: 0, interactive: false };
        const props = (feature.properties || {}) as StationFeatureProperties;
        if (!props.lines) return { opacity: 0, interactive: false };
        const { lines, stationId, isUsed } = props;
        const isDraft = draftStationIds.has(stationId);

        const isLineHovered = hoveredLine !== null && lines.includes(hoveredLine);
        const isStationHovered = localHoveredStation === stationId;
        const isHovered = isLineHovered || isStationHovered;

        const isClicked = activeLine !== null && lines.includes(activeLine);
        const isDraggingOverall = !!dragStartStation;
        const isDragStart = dragStartStation === stationId;

        // 드래프트 상태도 항상 보여줌
        const showCasing = isDragStart || !!isUsed || isDraft || (!isMoving && (isHovered || isClicked));
        if (!showCasing) return { opacity: 0, interactive: false };

        let color = '#FF3B30';
        const isEmphasis = !!isClicked || !!isHovered || isDragStart || !!isUsed || isDraft;

        if (isDraft) {
            color = '#007AFF'; // 미리보기 역도 파란색
        } else if (isMoving && isUsed) {
            color = '#2ecc71';
        } else if (isDragStart || isClicked || (isDraggingOverall && isHovered)) {
            color = '#007AFF';
        } else if (isLineHovered && !isStationHovered) {
            color = '#FFD60A';
        } else if (isUsed && !isHovered) {
            color = '#2ecc71';
        }

        const casingWeight = getStandardCasingWeight(effectiveZoom, isEmphasis);
        const z = Math.round(effectiveZoom);

        return {
            color: color,
            weight: casingWeight,
            opacity: (isUsed || isDraft) && !isHovered && !isClicked ? 0.6 : 1.0,
            pane: 'railroad-casing',
            interactive: false,
            lineCap: 'round' as const,
            lineJoin: 'round' as const
        };
    }, [hoveredLine, localHoveredStation, activeLine, dragStartStation, draftStationIds, isMoving, effectiveZoom, getStandardCasingWeight]);

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
                <div style="display: flex; flex-direction: column;">${lineList}</div>
            </div>`;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true, direction: 'top', offset: [0, -10], opacity: 0.9, pane: 'top-tooltips'
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
            mouseover: () => {
                setLocalHoveredStation(id);
                if (onStationHover) onStationHover(id);
            },
            mouseout: () => {
                setLocalHoveredStation(null);
                if (onStationHover) onStationHover(null);
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
    }, [activeLine, hoveredLine, selectedLines, hullStyle, platformStyle, nodeStyle, platformCasingStyle, stationInteractionStyle, localHoveredStation, effectiveZoom]);

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
                pane="railroad-lines"
                interactive={false}
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

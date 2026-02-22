"use client";

import React, { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { MapStyleSettings } from './MainPageClient';
import { Language } from '../lib/translations';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker'; // Keep for labels and interaction
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
    effectiveZoom: number; // Discrete zoom (8, 12, 14)
    realZoom: number;      // Continuous zoom for Leaflet scale
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

    // 1. Process all entries (Raw data only - stable)
    const allEntries = useMemo(() => {
        if (!processedStations) return [];
        return Object.entries(processedStations).map(([id, data]) => {
            let isVisibleAtZoom = true;
            // Removed: if (effectiveZoom === 8 && data.lines.length < 2) isVisibleAtZoom = false;
            // Now we keep all stations in allEntries so platforms can be rendered for all.
            // We'll filter the dots (node features) later in visualsGeoJson for density.
            if (effectiveZoom < 8) isVisibleAtZoom = false;
            if (data.isJoint) isVisibleAtZoom = false;

            return { id, data, isVisibleAtZoom };
        }).filter(item => item.isVisibleAtZoom);
    }, [processedStations, effectiveZoom]);

    // 2. Prepare GeoJSON for "Baked" visuals (STABLE during hover)
    const visualsGeoJson = useMemo(() => {
        const features: GeoJSON.Feature[] = [];

        // Platforms per station
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
                            lines: data.lines
                        }
                    });
                }
            }
        });

        // 3. Node Features with Density Management
        const nodeAcceptedEntries: typeof allEntries = [];
        // Thresholds for dot density culling (in degrees)
        const nodeCullDist = effectiveZoom === 8 ? 0.012 : (effectiveZoom === 12 ? 0.0015 : 0);

        allEntries.forEach((entry) => {
            const { id, data } = entry;

            // At mid zoom (8-11), we only show dots for transfer stations or used stations
            // to keep the map clean, but platforms (if any) are already processed above for all stations.
            if (effectiveZoom === 8 && data.lines.length < 2 && !data.isUsed) return;

            // At mid zoom (8-12), we cull extremely close dots to avoid "blobbing"
            if (nodeCullDist > 0) {
                const isImportant = data.lines.length > 1 || data.isUsed;
                const tooDense = nodeAcceptedEntries.some(acc => {
                    const dLat = Math.abs(acc.data.centroid[0] - data.centroid[0]);
                    const dLon = Math.abs(acc.data.centroid[1] - data.centroid[1]);
                    return dLat < nodeCullDist && dLon < nodeCullDist;
                });

                // If too dense, only keep it if it's more important than existing one or we skip
                if (tooDense && !isImportant) return;
                // If the new one is important but old wasn't, we still keep the new one (as a node)
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

        // 4. Hull Features for Transfer Stations (Background Shapes)
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

    // Track local hover for platforms to show yellow border without affecting general line hover
    const [localHoveredStation, setLocalHoveredStation] = useState<string | null>(null);

    // 3. Dynamic Styles (Access props directly)
    const nodeStyle = useCallback((feature: GeoJSON.Feature) => {
        const props = feature.properties as unknown as StationFeatureProperties;
        if (!props) return { opacity: 0, interactive: false };
        const { lines } = props;
        const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
        const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
        const isSelected = lines.some((l: string) =>
            selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
        );

        let radius = 3;
        if (effectiveZoom === 12) radius = 5;
        if (effectiveZoom >= 14) radius = 7;
        const isDimmed = isFilterActive && !isSelected;

        return {
            radius: radius,
            fillColor: '#000',
            stroke: false,
            fillOpacity: 0, // Dots are now invisible interaction targets
            pane: 'station-interactions' // Use dedicated pane for priority events
        };
    }, [selectedLines, activeLine, hoveredLine, effectiveZoom]);

    const hullStyle = useCallback((feature: GeoJSON.Feature) => {
        const props = feature.properties as unknown as StationFeatureProperties;
        if (!props) return { opacity: 0, interactive: false };
        const { lines } = props;
        const isSelected = lines.some((l: string) =>
            selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
        );

        return {
            fillColor: isSelected ? '#ffffff' : '#f8f9fa',
            fillOpacity: 0.9,
            color: '#333333',
            weight: isSelected ? 2 : 1.2,
            pane: 'railroad-glow', // Behind railroad lines and platforms
            interactive: false
        };
    }, [selectedLines, activeLine, hoveredLine]);

    const platformStyle = useCallback((feature: GeoJSON.Feature) => {
        const props = feature.properties as unknown as StationFeatureProperties;
        if (!props || !props.lineKey) return { opacity: 0, interactive: false };
        const { lineKey, lines, stationId } = props;
        const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
        const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
        const isSelected = lines.some((l: string) =>
            selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
        ) || (localHoveredStation === stationId);

        const isTransfer = lines.length > 1;

        let color = '#313131'; // Standardized to black for schematic look (default)

        // 8~11: Transfer stations = Black, Regular stations = Line Color
        // 12+: All = Black
        if (effectiveZoom >= 8 && effectiveZoom <= 11) {
            if (!isTransfer) {
                color = getColor(lineKey);
            }
        }

        // Match thickness with RailroadLayer: Stage-based
        let weight = 3.5;
        if (effectiveZoom <= 7) weight = Math.max(0.1, (effectiveZoom / 7) * 1.5);
        else if (effectiveZoom <= 11) weight = 2.5;
        else if (effectiveZoom <= 13) weight = 3.0;

        const opacity = 1.0;
        const isDimmed = isFilterActive && !isSelected;

        return {
            color: isDimmed ? '#dddddd' : color,
            weight: isMobile ? weight * 1.4 : weight,
            opacity: isDimmed ? 0.3 : opacity,
            pane: 'station-interactions', // Platforms act as part of the station interaction layer
            interactive: true,
            lineCap: 'round',
            lineJoin: 'round',
        } as L.PathOptions;
    }, [selectedLines, activeLine, hoveredLine, localHoveredStation, effectiveZoom, getColor, isMobile]);

    const platformCasingStyle = useCallback((feature: GeoJSON.Feature) => {
        const props = feature.properties as unknown as StationFeatureProperties;
        if (!props || !props.lineKey) return { opacity: 0, interactive: false };
        const { lineKey, stationId } = props;
        const isHovered = (hoveredLine === lineKey || localHoveredStation === stationId);
        const isClicked = (activeLine === lineKey);
        const isDraggingOverall = !!dragStartStation;

        if (!isHovered && !isClicked) return { opacity: 0, interactive: false };

        const color = isClicked || (isDraggingOverall && isHovered) ? '#007AFF' : '#FFD700';

        let weight = 3.5;
        if (effectiveZoom <= 7) weight = Math.max(0.1, (effectiveZoom / 7) * 1.5);
        else if (effectiveZoom <= 11) weight = 2.5;
        else if (effectiveZoom <= 13) weight = 3.0;

        return {
            color: color,
            weight: (isMobile ? weight * 1.4 : weight) + (2.2 * (weight / 3.5)),
            opacity: 1.0,
            pane: 'railroad-casing',
            interactive: false,
            lineCap: 'round',
            lineJoin: 'round'
        };
    }, [hoveredLine, localHoveredStation, activeLine, dragStartStation, effectiveZoom, isMobile]);


    const combinedStyle = useCallback((feature: GeoJSON.Feature) => {
        if (feature.properties?.type === 'hull') return hullStyle(feature);
        if (feature.properties?.type === 'platform') return platformStyle(feature);
        return nodeStyle(feature) as L.PathOptions;
    }, [hullStyle, platformStyle, nodeStyle]);

    const onEachStation = (feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = feature.properties as unknown as StationFeatureProperties;
        if (!props) return;
        const isNode = props.type === 'node';
        const isPlatform = props.type === 'platform';
        if (!isNode && !isPlatform) return;

        const id = props.stationId;
        const station = processedStations![id];
        if (!station) return;

        const stationNameJA = station.name;
        const stationNameEN = station.name_en || '';

        // Build formatted lines for tooltip
        const lineList = station.lines.map(l => {
            const [company, line] = l.includes('::') ? l.split('::') : ['Unknown', l];
            const corp = (railData.companies as Record<string, Company>)[company];
            const lineData = (railData.lines as Record<string, Line>)[line];

            const dispCorpJA = corp?.name || company;
            const dispCorpEN = corp?.name_en || (corp?.name ? '' : company);
            const dispLineJA = lineData?.name || line;
            const dispLineEN = lineData?.name_en || (lineData?.name ? '' : line);

            const color = getColor(l);

            return `
                <div style="
                    display: flex; 
                    flex-direction: column; 
                    gap: 1px; 
                    background: #f8f9fa; 
                    border-left: 4px solid ${color}; 
                    padding: 6px 10px; 
                    margin-bottom: 6px; 
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                ">
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-size: 11px; color: #1a1a1a; font-weight: 800;">${dispLineJA}</span>
                        ${dispLineEN ? `<span style="font-size: 9px; color: #718096; font-weight: 500; opacity: 0.9;">${dispLineEN}</span>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; line-height: 1.2; margin-top: 4px; border-top: 1px solid #edf2f7; padding-top: 2px;">
                        <span style="font-size: 9px; color: #718096; font-weight: 600;">${dispCorpJA}</span>
                        ${dispCorpEN ? `<span style="font-size: 8px; color: #a0aec0; font-weight: 500; opacity: 0.8;">${dispCorpEN}</span>` : ''}
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
            </div>
        `;

        if (!isMobile) {
            layer.bindTooltip(tooltipContent, {
                sticky: true,
                direction: 'top',
                offset: [0, -10],
                opacity: 0.9,
                pane: 'top-tooltips'
            });
        }

        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleStationClick(id);
            },
            mousedown: (e) => {
                L.DomEvent.stopPropagation(e);
                handleStationMouseDown(id, [e.latlng.lat, e.latlng.lng]);
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
                // Ensure drag ends if mouse released over node/platform
                L.DomEvent.stopPropagation(e);
                if (handleStationMouseUp) handleStationMouseUp(id);
            }
        });
    };

    const geoJsonRef = useRef<L.GeoJSON>(null);
    const platformCasingRef = useRef<L.GeoJSON>(null);

    // Update styles without remounting
    useEffect(() => {
        if (geoJsonRef.current) {
            geoJsonRef.current.setStyle(combinedStyle as any);
        }
        if (platformCasingRef.current) {
            platformCasingRef.current.setStyle(platformCasingStyle as any);
        }
    }, [activeLine, hoveredLine, selectedLines, combinedStyle, platformCasingStyle, localHoveredStation]);

    // 4. Force re-render key ONLY for structural changes
    const bakedKey = useMemo(() => {
        return `${effectiveZoom}_${allEntries.length}`;
    }, [effectiveZoom, allEntries.length]);

    // 5. Intelligent Label Management (Collision Avoidance + Culling)
    const visibleLabels = useMemo(() => {
        if (effectiveZoom < 14 || !mapBounds) return [];

        const paddedBounds = mapBounds.pad(0.1);
        const candidates = allEntries.filter(({ data }) => paddedBounds.contains(data.centroid));

        if (candidates.length === 0) return [];

        // 1. Sort by priority: Selected/Active > Transfer > Visited > Default
        const prioritized = [...candidates].sort((a, b) => {
            const getPriority = (item: typeof a) => {
                let p = 0;
                const isSelected = item.data.lines.some(l =>
                    selectedLines.includes(l) || activeLine === l || hoveredLine === l
                );
                if (isSelected) p += 1000;
                if (item.data.lines.length > 1) p += 100;
                if (item.data.isUsed) p += 50;
                return p;
            };
            return getPriority(b) - getPriority(a);
        });

        // 2. Greedy Collision Detection
        // minDistance in degrees. 0.0025 at zoom 14 is roughly 30-40px.
        const zoomFactor = Math.pow(2, 14 - realZoom);
        const minDistanceLat = 0.0025 * zoomFactor;
        const minDistanceLon = 0.0045 * zoomFactor; // Wider for horizontal text labels

        const accepted: typeof prioritized = [];

        prioritized.forEach(candidate => {
            const isSelected = candidate.data.lines.some(l =>
                selectedLines.includes(l) || activeLine === l || hoveredLine === l
            );

            // Always show selected/active labels
            if (isSelected) {
                accepted.push(candidate);
                return;
            }

            const collision = accepted.some(acc => {
                const dLat = Math.abs(acc.data.centroid[0] - candidate.data.centroid[0]);
                const dLon = Math.abs(acc.data.centroid[1] - candidate.data.centroid[1]);
                return dLat < minDistanceLat && dLon < minDistanceLon;
            });

            if (!collision) {
                accepted.push(candidate);
            }
        });

        return accepted;
    }, [allEntries, mapBounds, effectiveZoom, realZoom, selectedLines, activeLine, hoveredLine]);

    if (!processedStations) return null;

    return (
        <>
            {/* Platform Casing (Highlight) Layer */}
            <GeoJSON
                ref={platformCasingRef}
                key={`platforms-casing-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={platformCasingStyle as L.PathOptions}
                filter={(feature) => feature.properties?.type === 'platform'}
            />

            {/* Baked Layer: High-performance canvas rendering for points/lines */}
            <GeoJSON
                ref={geoJsonRef}
                key={`stations-baked-${bakedKey}`}
                data={visualsGeoJson as GeoJSON.FeatureCollection}
                style={combinedStyle as L.PathOptions}
                pointToLayer={(feature, latlng) => {
                    if (feature.properties?.type === 'node') {
                        return L.circleMarker(latlng, nodeStyle(feature) as L.CircleMarkerOptions);
                    }
                    return (L as any).layerGroup();
                }}
                onEachFeature={onEachStation}
            />


            {/* DOM Layer: Labels (Filtered by Viewport for performance) */}
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
                    onlyLabels={true} // New prop for ultra-light rendering
                    interactive={false} // Labels don't block interaction
                />
            ))}
        </>
    );
};

const MemoizedStations = memo(Stations);
MemoizedStations.displayName = 'Stations';
export default MemoizedStations;

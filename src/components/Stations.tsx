"use client";

import React, { memo, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker'; // Keep for labels and interaction
import { RailData } from '../types/railData';

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
    language: Language;
    isMobile: boolean;
    railData: RailData;
    handleStationClick: (id: string, lines?: string[]) => void;
    handleStationMouseDown: (id: string, coords: [number, number]) => void;
    onStationHover?: (id: string | null) => void;
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
    language,
    isMobile,
    railData,
    handleStationClick,
    handleStationMouseDown,
    onStationHover
}) => {
    if (!processedStations || effectiveZoom === 0) return null;

    // 1. Filter stations once for this stage
    const filteredEntries = useMemo<[string, ProcessedStation][]>(() => {
        return Object.entries(processedStations).filter(([id, data]) => {
            const isNoneExplicitlySelected = selectedLines.includes("__NONE__");
            const isFilterActive = isNoneExplicitlySelected || selectedLines.length > 0;
            const isSelected = data.lines.some(l =>
                selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
            );
            if (isFilterActive && !isSelected) return false;
            if (effectiveZoom === 8 && data.lines.length < 2) return false; // Hide minor stations at zoom 8-11
            if (data.isJoint) return false;
            return true;
        });
    }, [processedStations, selectedLines, activeLine, hoveredLine, effectiveZoom]);

    // 2. Prepare GeoJSON for "Baked" visuals (Nodes and Platforms)
    const visualsGeoJson = useMemo(() => {
        const features: any[] = [];
        filteredEntries.forEach(([id, data]) => {
            // Node point
            features.push({
                type: 'Feature',
                id: `node-${id}`,
                geometry: { type: 'Point', coordinates: [data.centroid[1], data.centroid[0]] },
                properties: {
                    type: 'node',
                    stationId: id,
                    isUsed: data.isUsed,
                    isTransfer: data.lines.length > 1
                }
            });

            // Platforms (Zoom 14+)
            if (effectiveZoom >= 14 && data.nodes) {
                data.nodes.forEach(node => {
                    if (node.platforms) {
                        features.push({
                            type: 'Feature',
                            id: `plat-${id}-${node.id}`,
                            geometry: { type: 'MultiLineString', coordinates: node.platforms },
                            properties: { type: 'platform', stationId: id }
                        });
                    }
                });
            }
        });
        return { type: 'FeatureCollection', features };
    }, [filteredEntries, effectiveZoom]);

    // 3. Constant styles for the Stage
    const nodeStyle = (feature: any) => {
        const isUsed = feature.properties.isUsed;
        const isTransfer = feature.properties.isTransfer;
        let radius = 3;
        if (effectiveZoom === 12) radius = 5;
        if (effectiveZoom >= 14) radius = 7;

        if (isTransfer) radius *= 1.3;

        return {
            radius: radius,
            fillColor: isUsed ? '#ff9800' : '#1a1a1a', // Extremely dark grey
            stroke: false, // Clean borderless look
            fillOpacity: 1,
            pane: 'station-interact'
        };
    };

    const platformStyle = {
        color: '#666666',
        weight: 4,
        opacity: 0.8,
        pane: 'station-interact',
        interactive: false // Platforms shouldn't block node hover
    };

    const combinedStyle = (feature: any) => {
        if (feature.properties.type === 'platform') return platformStyle;
        return nodeStyle(feature);
    };

    const onEachStation = (feature: any, layer: L.Layer) => {
        if (feature.properties.type !== 'node') return;

        const id = feature.properties.stationId;
        const station = processedStations![id];
        if (!station) return;

        const primaryName = language === 'en' ? (station.name_en || station.name) : station.name;

        // Build formatted lines for tooltip
        const lineList = station.lines.map(l => {
            const [company, line] = l.includes('::') ? l.split('::') : ['Unknown', l];
            const corp = (railData.companies as any)[company];
            const lineData = (railData.lines as any)[line];
            const dispCorp = language === 'en' ? (corp?.name_en || corp?.name || company) : (corp?.name || company);
            const dispLine = language === 'en' ? (lineData?.name_en || lineData?.name || line) : (lineData?.name || line);
            return `<div style="display:flex; justify-content:space-between; gap:10px; font-size:11px; border-bottom:1px solid #eee; padding:2px 0;">
                        <span style="opacity:0.7;">${dispCorp}</span>
                        <span style="font-weight:600;">${dispLine}</span>
                    </div>`;
        }).join('');

        const tooltipContent = `
            <div style="padding:4px; min-width:140px;">
                <div style="font-weight:bold; font-size:14px; border-bottom:2px solid #333; margin-bottom:4px; padding-bottom:2px;">${primaryName}</div>
                <div>${lineList}</div>
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
                if (onStationHover) onStationHover(id);
            },
            mouseout: () => {
                if (onStationHover) onStationHover(null);
            }
        });
    };

    // 4. Force re-render key for data changes
    const bakedKey = useMemo(() => {
        return `${effectiveZoom}_${visitedStations.size}_${selectedLines.length}_${activeLine || ''}_${hoveredLine || ''}`;
    }, [effectiveZoom, visitedStations.size, selectedLines.length, activeLine, hoveredLine]);

    return (
        <>
            {/* Baked Layer: High-performance canvas rendering for points/lines */}
            <GeoJSON
                key={`stations-baked-${bakedKey}`}
                data={visualsGeoJson as any}
                style={combinedStyle as any}
                pointToLayer={(feature, latlng) => {
                    if (feature.properties.type === 'node') {
                        const style = nodeStyle(feature);
                        const mainMarker = L.circleMarker(latlng, style);

                        if (feature.properties.isTransfer) {
                            const innerDot = L.circleMarker(latlng, {
                                radius: style.radius * 0.35,
                                fillColor: '#ffffff', // Clean white dot for transfer hubs
                                stroke: false,
                                fillOpacity: 1.0,
                                interactive: false,
                                pane: 'station-interact'
                            });
                            return L.layerGroup([mainMarker, innerDot]);
                        }
                        return mainMarker;
                    }
                    return (L as any).layerGroup();
                }}
                onEachFeature={onEachStation}
            />

            {/* DOM Layer: Interaction & Labels (Only high zoom) */}
            {effectiveZoom >= 14 && filteredEntries.map(([id, station]) => (
                <StationMarker
                    key={`label-${id}`}
                    id={id}
                    station={station}
                    highlightedStations={[]}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    hoveredLine={hoveredLine}
                    zoom={effectiveZoom} // Pass discrete zoom!
                    zoomConfig={{ baseRadius: 7, weightValue: 4, zoomCategory: 4 }}
                    getColor={getColor}
                    handleStationClick={handleStationClick}
                    onStationMouseDown={() => { }}
                    onStationMouseUp={() => { }}
                    dragStartStation={null}
                    visitedStations={visitedStations}
                    settings={{} as any}
                    language={language as any}
                    isMobile={isMobile}
                    isMoving={false}
                    railData={railData}
                    onlyLabels={true} // New prop for ultra-light rendering
                />
            ))}
        </>
    );
};

export default memo(Stations);

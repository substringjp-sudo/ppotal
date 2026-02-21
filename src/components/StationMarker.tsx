"use client";
import React, { memo, useMemo, useCallback, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker, Polyline } from 'react-leaflet';
import { lightenColor } from '../lib/lineColors';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';
import { convexHull } from '../lib/geoUtils';
import { ProcessedStation } from '../types/mapTypes';
import { RailData } from '../types/railData';

interface StationMarkerProps {
    id: string;
    station: ProcessedStation;
    highlightedStations: string[];
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    zoom: number;
    zoomConfig: { baseRadius: number, weightValue: number, zoomCategory: number };
    getColor: (lineKey: string) => string;
    handleStationClick: (id: string, lines?: string[]) => void;
    onStationMouseDown: (id: string, coords: [number, number]) => void;
    onStationMouseUp: (id: string) => void;
    dragStartStation: string | null;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language: Language;
    isMobile: boolean;
    selectedStation?: string;
    isEditMode?: boolean;
    isMoving?: boolean;
    railData: RailData;
    onlyLabels?: boolean;
    interactive?: boolean;
}

/**
 * Optimized Station Node Item
 * Handles individual node and platform rendering with deep memoization.
 */
const StationNodeItem: React.FC<{
    node: any;
    id: string;
    radius: number;
    isSelected: boolean;
    isHighlighted: boolean;
    isDragging: boolean;
    isMobile: boolean;
    isEditMode: boolean;
    isMoving: boolean;
    zoom: number;
    weightValue: number;
    getColor: (lineKey: string) => string;
    handleStationClick: (id: string, lines?: string[]) => void;
    handleMouseOver: () => void;
    handleMouseOut: () => void;
    onStationMouseDown: (id: string, coords: [number, number]) => void;
    onStationMouseUp: (id: string) => void;
    station: ProcessedStation;
    formattedLines: any[];
    showTooltip: boolean;
    railData: RailData;
    selectedLines: string[];
    activeLine: string | null;
    selectedStation?: string;
    language: Language;
    zoomConfig: { baseRadius: number, weightValue: number, zoomCategory: number };
}> = memo(({
    node, id, radius, isSelected, isHighlighted, isDragging, isMobile,
    isEditMode, isMoving, zoom, weightValue, getColor, handleStationClick,
    handleMouseOver, handleMouseOut, onStationMouseDown, onStationMouseUp,
    station, formattedLines, showTooltip, railData, selectedLines, activeLine,
    selectedStation, language, zoomConfig
}) => {
    const isNodeUsed = node.isUsed;
    const isNodeSelected = isSelected;
    const zoomCategory = zoomConfig.zoomCategory;
    const isLowZoom = zoomCategory <= 2; // stage 1, 2

    // 1. Memoize Station Style
    const stationStyle = useMemo(() => {
        const baseColor = getColor(node.lineKey) || '#666';
        const lightenedColor = lightenColor(baseColor, 60);

        const style: any = {
            fill: !isLowZoom || isNodeSelected,
            fillColor: isNodeUsed ? '#2ecc71' : (isDragging ? '#2ecc71' : lightenedColor),
            fillOpacity: (isNodeSelected || isNodeUsed) ? 1 : 0.8,
            stroke: true,
            color: '#000000',
            weight: weightValue,
            opacity: (isNodeSelected || isNodeUsed) ? 0.8 : 0.3,
            className: isNodeUsed ? 'visited-station-glow' : ''
        };

        if (isNodeSelected && isMobile && (selectedStation === id)) {
            style.color = '#e74c3c';
            style.weight = 8;
            style.opacity = 1;
            style.fillOpacity = 1;
        }
        return style;
    }, [getColor, node.lineKey, isLowZoom, isNodeSelected, isNodeUsed, isDragging, isMobile, selectedStation, id, weightValue]);

    // 2. Memoize Handlers for the node
    const handlers = useMemo(() => ({
        click: (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (!isEditMode) handleStationClick(id, station.lines);
        },
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
        mousedown: (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (isEditMode || !isMobile) onStationMouseDown(id, node.coord);
        },
        mouseup: (e: any) => {
            L.DomEvent.stopPropagation(e);
            onStationMouseUp(id);
        }
    }), [id, station.lines, isEditMode, handleStationClick, handleMouseOver, handleMouseOut, isMobile, onStationMouseDown, node.coord, onStationMouseUp]);

    const hasPlatforms = zoomCategory >= 4 && node.platforms && node.platforms.length > 0;
    const isMultiLine = station.lines.length > 1;

    // 3. Memoize Platform Geometries
    const platformGeometries = useMemo(() => {
        if (!hasPlatforms) return [];
        return node.platforms!.map((plat: any) => {
            const positions = plat.filter((pt: any) => pt && pt.length >= 2).map((pt: any) => [pt[1], pt[0]] as [number, number]);
            return positions.length >= 2 ? positions : null;
        }).filter(Boolean);
    }, [hasPlatforms, node.platforms]);

    return (
        <React.Fragment>
            {/* Platforms */}
            {platformGeometries.map((positions: [number, number][] | null, pidx: number) => (
                <React.Fragment key={`plat-group-${pidx}`}>
                    <Polyline
                        positions={positions!}
                        pathOptions={{
                            color: '#333',
                            weight: isHighlighted ? 8 : 5,
                            opacity: 1,
                            lineCap: 'butt',
                            interactive: false,
                            pane: 'ui-elements'
                        }}
                    />
                    <Polyline
                        positions={positions!}
                        pathOptions={{
                            stroke: true,
                            color: '#000',
                            weight: 20,
                            opacity: 0.0,
                            lineCap: 'butt',
                            pane: 'station-interact',
                            interactive: true
                        }}
                        eventHandlers={handlers}
                    />
                </React.Fragment>
            ))}

            {/* Invisible Station Node for Interaction */}
            {!isMoving && (
                <CircleMarker
                    center={node.coord}
                    pathOptions={{
                        stroke: false,
                        fill: true,
                        fillColor: '#000',
                        fillOpacity: 0.0,
                        pane: 'railroad-lines',
                        interactive: true
                    }}
                    radius={radius + 8}
                    eventHandlers={handlers}
                >
                    {!isMobile && !isEditMode && (
                        <Tooltip
                            sticky
                            permanent
                            pane="top-tooltips"
                            offset={[20, -20]}
                            direction="top"
                            opacity={showTooltip ? (isDragging ? 0 : 1) : 0}
                        >
                            <div style={{ zIndex: 1000, position: 'relative', minWidth: '180px', padding: '4px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '2px solid #333', paddingBottom: '4px', color: '#000' }}>
                                    {language === 'en' ? (station.name_en || station.name) : station.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#333' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Available Lines
                                    </div>
                                    {formattedLines.map((fl, fidx) => {
                                        const corp = (railData.companies as any)[fl.company];
                                        const line = (railData.lines as any)[fl.line];
                                        const displayedCorp = language === 'en' ? (corp?.name_en || corp?.name || fl.company) : (corp?.name || fl.company);
                                        const displayedLine = language === 'en' ? (line?.name_en || line?.name || fl.line) : (line?.name || fl.line);
                                        return (
                                            <div key={fidx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '3px 0',
                                                borderBottom: fidx === formattedLines.length - 1 ? 'none' : '1px solid #eee',
                                                color: (selectedLines.includes(fl.key) || (activeLine === fl.key)) ? '#2980b9' : '#555',
                                                fontWeight: (selectedLines.includes(fl.key) || (activeLine === fl.key)) ? '800' : '500'
                                            }}>
                                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{displayedCorp}</span>
                                                <span>{displayedLine}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {isNodeUsed && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '4px 8px',
                                        backgroundColor: '#2ecc71',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        display: 'inline-block'
                                    }}>✓ VISITED</div>
                                )}
                            </div>
                        </Tooltip>
                    )}
                </CircleMarker>
            )}
        </React.Fragment>
    );
});

const StationMarker: React.FC<StationMarkerProps> = ({
    id,
    station,
    highlightedStations,
    selectedLines,
    activeLine,
    hoveredLine,
    zoom,
    getColor,
    handleStationClick,
    onStationMouseDown,
    onStationMouseUp,
    dragStartStation,
    visitedStations,
    settings,
    language,
    isMobile,
    selectedStation,
    isEditMode = false,
    isMoving = false,
    railData,
    zoomConfig,
    onlyLabels = false
}) => {
    const isHighlighted = highlightedStations.includes(id);
    const isUsed = station.isUsed;
    const isSelected = useMemo(() => station.lines.some(l =>
        selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
    ), [station.lines, selectedLines, activeLine, hoveredLine]);

    const radius = useMemo(() => {
        let r = zoomConfig.baseRadius;
        if (isMobile) r *= 1.5;
        if (isHighlighted || (isMobile && selectedStation === id)) r = Math.max(r, 10);
        if (isUsed) r *= settings.visited.stationSize;
        else if (isSelected) r *= settings.unvisited.stationSize;
        return r;
    }, [zoomConfig.baseRadius, isMobile, isHighlighted, selectedStation, id, isUsed, isSelected, settings]);

    const isDragging = dragStartStation === id;
    const weightValue = zoomConfig.weightValue;

    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseOver = useCallback(() => {
        if (isMobile || isEditMode) return;
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
            tooltipTimeoutRef.current = null;
        }, 200);
    }, [isMobile, isEditMode]);

    const handleMouseOut = useCallback(() => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
        }
        setShowTooltip(false);
    }, []);

    // Memoize formatted lines for tooltip
    const formattedLines = useMemo(() => station.lines.map(l => {
        if (l.includes('::')) {
            const [company, line] = l.split('::');
            return { company, line, key: l };
        }
        return { company: 'Unknown', line: l, key: l };
    }), [station.lines]);

    const hullPoints = useMemo(() => {
        if (zoomConfig.zoomCategory < 4) return null;
        const allPoints: [number, number][] = [];
        station.nodes.forEach(node => {
            if (node.platforms) {
                node.platforms.forEach(plat => {
                    if (Array.isArray(plat)) {
                        plat.forEach(p => {
                            if (Array.isArray(p) && p.length >= 2) {
                                allPoints.push([p[1], p[0]]); // [lat, lon]
                            }
                        });
                    }
                });
            }
            if (node.coord && node.coord.length >= 2) allPoints.push(node.coord);
        });
        return allPoints.length > 2 ? convexHull(allPoints) : null;
    }, [station, zoomConfig.zoomCategory]);

    if (station.isJoint) {
        const nodeCoord = station.nodes[0]?.coord || station.centroid;
        return (
            <CircleMarker
                center={nodeCoord}
                pathOptions={{ stroke: false, fill: true, fillColor: '#000', fillOpacity: 0.0, pane: 'railroad-lines', interactive: true }}
                radius={radius + 8}
                eventHandlers={{
                    click: (e) => { L.DomEvent.stopPropagation(e); if (!isEditMode) handleStationClick(id, station.lines); },
                    mousedown: (e) => { L.DomEvent.stopPropagation(e); if (isEditMode || !isMobile) onStationMouseDown(id, nodeCoord); },
                    mouseup: (e) => { L.DomEvent.stopPropagation(e); onStationMouseUp(id); }
                }}
            />
        );
    }

    return (
        <React.Fragment>
            {/* Convex Hull (Skip if only labels) */}
            {/* Convex Hull logic moved to baked layer in Stations.tsx */}

            {/* Labels (Always Render if requested) */}
            {zoomConfig.zoomCategory >= 4 && (
                <Marker
                    position={station.centroid}
                    interactive={false}
                    pane="station-labels"
                    icon={L.divIcon({
                        className: 'station-label-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
                                <div style="
                                    margin-top: ${(isHighlighted ? 12 : 10) / 2 + 4}px;
                                    font-size: 11px; 
                                    font-weight: ${isSelected ? '800' : '700'}; 
                                    color: ${isSelected ? '#000' : '#4a5568'};
                                    background: rgba(255, 255, 255, 0.75);
                                    backdrop-filter: blur(2px);
                                    padding: 1px 4px;
                                    border-radius: 3px;
                                    border: 1px solid rgba(255,255,255,0.8);
                                    text-shadow: 0 0 2px #fff;
                                    white-space: nowrap; 
                                    transform: translateX(-50%); 
                                    position: absolute; 
                                    top: 0; 
                                    pointer-events: none;
                                    opacity: ${isSelected ? 1 : 0.9};
                                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                                ">${language === 'en' ? (station.name_en || station.name) : station.name}</div>
                            </div>
                        `,
                        iconSize: [0, 0],
                    })}
                    zIndexOffset={100}
                />
            )}

            {/* Individual Nodes (Skip if only labels) */}
            {!onlyLabels && station.nodes.map((node, idx) => (
                <StationNodeItem
                    key={`${node.id}-${idx}`}
                    node={node}
                    id={id}
                    radius={radius}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isDragging={isDragging}
                    isMobile={isMobile}
                    isEditMode={isEditMode}
                    isMoving={isMoving}
                    zoom={zoom}
                    weightValue={weightValue}
                    getColor={getColor}
                    handleStationClick={handleStationClick}
                    handleMouseOver={handleMouseOver}
                    handleMouseOut={handleMouseOut}
                    onStationMouseDown={onStationMouseDown}
                    onStationMouseUp={onStationMouseUp}
                    station={station}
                    formattedLines={formattedLines}
                    showTooltip={showTooltip}
                    railData={railData}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    selectedStation={selectedStation}
                    language={language}
                    zoomConfig={zoomConfig}
                />
            ))}
        </React.Fragment>
    );
};

export default memo(StationMarker);

import React, { memo } from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker, Polyline } from 'react-leaflet';
import { lightenColor } from '../lib/lineColors';
import { normalizeKey, translateName } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';
import { convexHull } from '../lib/geoUtils';
import { ProcessedStation } from '../types/mapTypes';

interface StationMarkerProps {
    name: string;
    station: ProcessedStation;
    highlightedStations: string[];
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    zoom: number;
    getColor: (name: string) => string;
    handleStationClick: (name: string, lines?: string[]) => void;
    onStationMouseDown: (name: string, coords: [number, number]) => void;
    onStationMouseUp: (name: string) => void;
    dragStartStation: string | null;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language: Language;
    isMobile: boolean;
    selectedStation?: string;
    isEditMode?: boolean;
    isMoving?: boolean;
}

const StationMarker: React.FC<StationMarkerProps> = ({
    name,
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
    isMoving = false
}) => {
    const isHighlighted = highlightedStations.includes(name);
    const isVisited = visitedStations.has(name);
    const isSelected = station.lines.some(l =>
        selectedLines.some(sl => normalizeKey(sl) === normalizeKey(l)) ||
        (activeLine && normalizeKey(activeLine) === normalizeKey(l)) ||
        (hoveredLine && normalizeKey(hoveredLine) === normalizeKey(l))
    );
    const lines = station.lines;
    const isLowZoom = zoom <= 13;

    // Smoothly interpolate radius based on zoom level
    let radius = 3;
    if (zoom > 13) {
        // Linear interpolation between zoom 13 (radius 3) and zoom 15 (radius 8)
        const factor = Math.min(1, (zoom - 13) / 2);
        radius = 3 + factor * 5;
    }

    if (isMobile) {
        radius *= 1.5; // Make dots larger on mobile
    }

    if (isHighlighted || (isMobile && selectedStation === name)) {
        radius = Math.max(radius, 10);
    }

    // Apply user style size multipliers
    if (isVisited) {
        radius *= settings.visited.stationSize;
    } else if (isSelected) {
        radius *= settings.unvisited.stationSize;
    }

    const isDragging = dragStartStation === name;
    const isStationSelected = isMobile && (selectedStation === name);
    const weight = zoom <= 12 ? 0 : (isHighlighted || (isMobile && isStationSelected) ? 6 : 4);

    const [showTooltip, setShowTooltip] = React.useState(false);
    const tooltipTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseOver = () => {
        if (isMobile || isEditMode) return;

        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);

        tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
            tooltipTimeoutRef.current = null;
        }, 1000); // 1-second delay
    };

    const handleMouseOut = () => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
        }
        setShowTooltip(false);
    };

    const createEventHandlers = (nodeCoord: [number, number]) => ({
        click: (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (!isEditMode) {
                handleStationClick(name, lines);
            }
        },
        mouseover: (e: any) => {
            handleMouseOver();
        },
        mouseout: (e: any) => {
            handleMouseOut();
        },
        mousedown: (e: any) => {
            // Mouse down logic for desktop or emulated touch
            L.DomEvent.stopPropagation(e);
            if (isEditMode || !isMobile) {
                // Prevent default drag initiation if needed, but allow bubbling?
                // Actually, stopping propagation is good to avoid map drag.
                onStationMouseDown(name, nodeCoord);
            }
        },
        mouseup: (e: any) => {
            L.DomEvent.stopPropagation(e);
            onStationMouseUp(name);
        },
        touchstart: (e: any) => {
            if (isEditMode) {
                // Prevent browser scrolling/zoom to allow immediate draw interaction
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);

                let lat = nodeCoord[0];
                let lng = nodeCoord[1];
                if (e.latlng) {
                    lat = e.latlng.lat;
                    lng = e.latlng.lng;
                }
                onStationMouseDown(name, [lat, lng]);
            }
        }
    });

    if (station.isJoint) {
        // Find the node coordinate (joints only have one node)
        const nodeCoord = station.nodes[0]?.coord || station.centroid;
        const handlers = createEventHandlers(nodeCoord);

        return (
            <CircleMarker
                center={nodeCoord}
                pathOptions={{
                    stroke: false,
                    fill: true,
                    fillColor: '#000',
                    fillOpacity: 0.0,
                    pane: 'station-interact',
                    interactive: true
                }}
                radius={radius + 8}
                eventHandlers={handlers}
            />
        );
    }

    // Format line names for tooltip
    const formattedLines = lines.map(l => {
        if (l.includes('::')) {
            const [company, line] = l.split('::');
            return { company, line, key: l };
        }
        return { company: 'Unknown', line: l, key: l };
    });

    // Calculate Convex Hull for the station GROUP if zoom is high
    let hullPoints: [number, number][] | null = null;
    if (zoom >= 14) {
        const allPoints: [number, number][] = [];
        // Collect points from platform geometries
        station.nodes.forEach(node => {
            if (node.platforms) {
                node.platforms.forEach(plat => {
                    if (Array.isArray(plat)) {
                        plat.forEach(p => {
                            if (Array.isArray(p) && p.length >= 2) {
                                allPoints.push([p[1], p[0]]); // p is [lon, lat], we want [lat, lon]
                            }
                        });
                    }
                });
            }
            // Also include node center
            if (node.coord && node.coord.length >= 2) {
                allPoints.push(node.coord);
            }
        });

        if (allPoints.length > 2) {
            hullPoints = convexHull(allPoints);
        }
    }


    return (
        <React.Fragment>
            {/* Group Border (Convex Hull) - ONLY when not moving */}
            {zoom >= 14 && hullPoints && hullPoints.length > 2 && !isMoving && (
                <Polyline
                    positions={hullPoints}
                    pathOptions={{
                        color: (isHighlighted || isStationSelected) ? '#ff0000' : '#666',
                        weight: 1,
                        opacity: 0.5,
                        dashArray: '4, 4',
                        fill: true,
                        fillColor: '#ccc',
                        fillOpacity: 0.1,
                        interactive: false,
                        pane: 'ui-elements'
                    }}
                />
            )}

            {/* Labels - Only when not moving to prevent floating text lag */}
            {zoom >= 14 && !isMoving && (
                <Marker
                    position={station.centroid}
                    icon={L.divIcon({
                        className: 'station-label-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
                                <div style="
                                    margin-top: ${(isHighlighted ? 12 : 10) / 2 + 4}px;
                                    font-size: 12px;
                                    font-weight: 800;
                                    color: #000;
                                    text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
                                    white-space: nowrap;
                                    transform: translateX(-50%);
                                    position: absolute;
                                    top: 0;
                                    pointer-events: none;
                                ">${translateName(name, language, 'station')}</div>
                            </div>
                        `,
                        iconSize: [0, 0],
                    })}
                    zIndexOffset={100}
                />
            )}

            {station.nodes.map((node, idx) => {
                const isNodeVisited = visitedStations.has(node.id);
                const isNodeSelected = isSelected;

                const baseColor = getColor(node.lineKey) || '#666';
                const lightenedColor = lightenColor(baseColor, 60);

                const stationStyle = {
                    fill: !isLowZoom || isNodeSelected,
                    fillColor: isNodeVisited ? '#2ecc71' : (isDragging ? '#2ecc71' : lightenedColor),
                    fillOpacity: (isNodeSelected || isNodeVisited) ? 1 : 0.8,
                    stroke: zoom >= 10,
                    color: '#000000',
                    weight: (isLowZoom ? 0.5 : 1.2) * (isMobile ? 1.2 : 1),
                    opacity: (isNodeSelected || isNodeVisited) ? 0.8 : 0.3,
                    className: isNodeVisited ? 'visited-station-glow' : ''
                };

                if (isStationSelected && isMobile) {
                    stationStyle.stroke = true;
                    stationStyle.color = '#e74c3c';
                    stationStyle.weight = 8;
                    stationStyle.opacity = 1;
                    stationStyle.fillOpacity = 1;
                }

                const hasPlatforms = zoom >= 13 && node.platforms && node.platforms.length > 0 && !isMoving;
                const handlers = createEventHandlers(node.coord);

                return (
                    <React.Fragment key={`${node.id}-${idx}`}>
                        {/* Platform Rendering Logic - Skip when moving */}
                        {hasPlatforms && node.platforms!.map((plat, pidx) => {
                            const positions = plat.filter(pt => pt && pt.length >= 2).map(pt => [pt[1], pt[0]] as [number, number]);
                            if (positions.length < 2) return null;

                            return (
                                <React.Fragment key={`plat-group-${pidx}`}>
                                    <Polyline
                                        positions={positions}
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
                                        positions={positions}
                                        pathOptions={{
                                            stroke: true,
                                            color: '#000',
                                            weight: 20,
                                            opacity: 0.0,
                                            lineCap: 'butt',
                                            pane: 'station-interact',
                                            interactive: !isMoving
                                        }}
                                        eventHandlers={!isMoving ? handlers : undefined}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Dot Rendering */}
                        {zoom >= 11 && (!hasPlatforms || isDragging) && (
                            <React.Fragment>
                                <CircleMarker
                                    center={node.coord}
                                    pathOptions={{ ...stationStyle, pane: 'ui-elements', interactive: false }}
                                    radius={radius}
                                />
                                {!isMoving && (
                                    <CircleMarker
                                        center={node.coord}
                                        pathOptions={{
                                            stroke: false,
                                            fill: true,
                                            fillColor: '#000',
                                            fillOpacity: 0.0,
                                            pane: 'station-interact',
                                            interactive: true
                                        }}
                                        radius={radius + 8}
                                        eventHandlers={handlers}
                                    >
                                        {!isMobile && !isEditMode && (
                                            <Tooltip sticky pane="top-tooltips" offset={[20, -20]} direction="top" opacity={showTooltip ? (isDragging ? 0 : (isSelected ? 1 : 0.7)) : 0}>
                                                <div style={{ zIndex: 1000, position: 'relative', minWidth: '180px', padding: '4px' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '2px solid #333', paddingBottom: '4px', color: '#000' }}>
                                                        {translateName(name, language, 'station')}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#333' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            Available Lines
                                                        </div>
                                                        {formattedLines.map((fl, fidx) => (
                                                            <div key={fidx} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                padding: '3px 0',
                                                                borderBottom: fidx === formattedLines.length - 1 ? 'none' : '1px solid #eee',
                                                                color: (selectedLines.some(sl => normalizeKey(sl) === normalizeKey(fl.key)) || (activeLine && normalizeKey(activeLine) === normalizeKey(fl.key))) ? '#2980b9' : '#555',
                                                                fontWeight: (selectedLines.some(sl => normalizeKey(sl) === normalizeKey(fl.key)) || (activeLine && normalizeKey(activeLine) === normalizeKey(fl.key))) ? '800' : '500'
                                                            }}>
                                                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{fl.company}</span>
                                                                <span>{translateName(fl.line, language, 'line')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {isNodeVisited && (
                                                        <div style={{
                                                            marginTop: '8px',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#2ecc71',
                                                            color: '#fff',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            borderRadius: '4px',
                                                            display: 'inline-block'
                                                        }}>
                                                            ✓ VISITED
                                                        </div>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        )}
                                    </CircleMarker>
                                )}
                            </React.Fragment>
                        )}
                    </React.Fragment>
                );
            })}
        </React.Fragment>
    );
};

export default memo(StationMarker);

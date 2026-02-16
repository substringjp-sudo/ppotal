"use client";

import React from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker, Polyline } from 'react-leaflet';
import { lightenColor } from '../lib/lineColors';
import { normalizeKey, normalizeLineName, translateName } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';

interface StaticNode {
    id: string;
    coord: [number, number];
    lineKey: string;
    platforms?: [number, number][][];
    group?: string;
}

interface StationsProps {
    processedStations: Record<string, { nodes: StaticNode[]; centroid: [number, number]; lines: string[] }> | null;
    highlightedStations: string[];
    handleStationClick: (name: string) => void;
    zoom: number;
    getColor: (name: string) => string;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null; // Added prop
    onStationMouseDown: (name: string, coords: [number, number]) => void;
    onStationMouseUp: (name: string) => void;
    dragStartStation: string | null;
    onLineMappingCreated?: (mapping: Map<string, string>) => void;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language: Language;
}

// Convex Hull Algorithm (Monotone Chain)
// Points are [lat, lng]
const convexHull = (points: [number, number][]): [number, number][] => {
    if (points.length < 3) return points;

    // Sort by lat, then lng
    const sorted = [...points].sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);

    // Cross product of vectors OA and OB
    // A value > 0 means counter-clockwise turn, < 0 clockwise, 0 collinear
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };

    const lower: [number, number][] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: [number, number][] = [];
    for (const p of sorted.reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
};

const Stations: React.FC<StationsProps> = ({
    processedStations,
    highlightedStations,
    handleStationClick,
    zoom,
    getColor,
    selectedLines,
    activeLine,
    hoveredLine, // Destructure new prop
    onStationMouseDown,
    onStationMouseUp,
    dragStartStation,
    onLineMappingCreated,
    visitedStations,
    settings,
    language
}) => {
    if (!processedStations) {
        return null;
    }

    const stationEntries = Object.entries(processedStations).filter(([name, data]) => {
        const isSelected = data.lines.some(line =>
            selectedLines.includes(line) ||
            activeLine === line ||
            (hoveredLine && normalizeKey(line) === normalizeKey(hoveredLine))
        );

        // Requirements: 
        // 1. Invisible road (unselected) -> Stations NOT visible.
        // 2. Visible road (selected/hovered) -> Stations visible depending on zoom.

        if (!isSelected) return false;

        // Force show all stations of selected lines if zoom >= 10.
        // If zoom < 10, maybe show nothing or just major transfer stations?
        // User said: "zoom >= 10 dot appears". So < 10 implies no dot.
        if (zoom < 10) return false;

        return true;
    });

    return (
        <>
            {stationEntries.map(([name, station]) => {
                const isHighlighted = highlightedStations.includes(name);
                const isVisited = visitedStations.has(name);
                const isSelected = station.lines.some(l =>
                    selectedLines.some(sl => normalizeKey(sl) === normalizeKey(l))
                );
                const lines = station.lines;

                const isLowZoom = zoom <= 13;
                let radius = isLowZoom ? 3 : (isHighlighted ? 10 : 7.5);

                // Fine-tune radius based on zoom if not low zoom and not highlighted
                if (!isLowZoom && !isHighlighted) {
                    radius = zoom > 14 ? 8 : (zoom > 12 ? 6 : 4);
                }

                // Apply user style size multipliers
                if (isVisited) {
                    radius *= settings.visited.stationSize;
                } else if (isSelected) {
                    radius *= settings.unvisited.stationSize;
                }

                const isDragging = dragStartStation === name;
                const weight = isLowZoom ? 0 : (isHighlighted ? 6 : 4);

                const coords = station.nodes.map(n => n.coord);

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
                                plat.forEach(p => allPoints.push([p[1], p[0]])); // p is [lon, lat], we want [lat, lon]
                            });
                        }
                        // Also include node center just in case
                        allPoints.push(node.coord);
                    });

                    if (allPoints.length > 2) {
                        hullPoints = convexHull(allPoints);
                    }
                }

                return (
                    <React.Fragment key={name}>
                        {/* Group Border (Convex Hull) */}
                        {zoom >= 14 && hullPoints && hullPoints.length > 2 && (
                            <Polyline
                                positions={hullPoints}
                                pathOptions={{
                                    color: isHighlighted ? '#ff0000' : '#666',
                                    weight: 1,
                                    opacity: 0.5,
                                    dashArray: '4, 4',
                                    fill: true,
                                    fillColor: '#ccc',
                                    fillOpacity: 0.1,
                                    interactive: false // Let clicks pass through to platforms/markers
                                }}
                            />
                        )}

                        {zoom >= 12 && (
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
                            const isNodeSelected = selectedLines.includes(node.lineKey) || activeLine === node.lineKey;

                            const baseColor = getColor(node.lineKey) || '#666';
                            const lightenedColor = lightenColor(baseColor, 60);

                            const stationStyle = {
                                fill: !isLowZoom || isNodeSelected,
                                fillColor: isNodeVisited ? '#2ecc71' : (isDragging ? '#2ecc71' : lightenedColor),
                                fillOpacity: (isNodeSelected || isNodeVisited) ? 1 : 0.8,
                                stroke: !isLowZoom || isNodeSelected || isNodeVisited,
                                color: isNodeVisited ? baseColor : baseColor,
                                weight: isNodeVisited ? weight + 1 : weight,
                                opacity: (isNodeSelected || isNodeVisited) ? 1 : 0.4,
                                className: isNodeVisited ? 'visited-station-glow' : ''
                            };

                            const hasPlatforms = zoom >= 14 && node.platforms && node.platforms.length > 0;

                            return (
                                <React.Fragment key={`${node.id}-${idx}`}>
                                    {/* Platform Rendering Logic */}
                                    {hasPlatforms && node.platforms!.map((plat, pidx) => {
                                        const positions = plat.filter(pt => pt && pt.length >= 2).map(pt => [pt[1], pt[0]] as [number, number]);
                                        if (positions.length < 2) return null;

                                        return (
                                            <Polyline
                                                key={`plat-${pidx}`}
                                                positions={positions}
                                                pathOptions={{
                                                    color: '#333', // Dark grey for platform lines
                                                    weight: isHighlighted ? 8 : 5,
                                                    opacity: 1,
                                                    lineCap: 'butt',
                                                    interactive: true
                                                }}
                                                eventHandlers={{
                                                    click: (e) => {
                                                        L.DomEvent.stopPropagation(e);
                                                        handleStationClick(name);
                                                    },
                                                    mousedown: (e) => {
                                                        L.DomEvent.stopPropagation(e as any);
                                                        onStationMouseDown(name, [e.latlng.lat, e.latlng.lng]);
                                                    },
                                                    mouseup: (e) => {
                                                        L.DomEvent.stopPropagation(e as any);
                                                        onStationMouseUp(name);
                                                    },
                                                }}
                                            >
                                                <Tooltip sticky pane="top-tooltips" offset={[20, -20]} direction="top" opacity={isDragging ? 0 : (isSelected ? 1 : 0.7)}>
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
                                                                    color: (selectedLines.includes(fl.key) || activeLine === fl.key) ? '#2980b9' : '#555',
                                                                    fontWeight: (selectedLines.includes(fl.key) || activeLine === fl.key) ? '800' : '500'
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
                                            </Polyline>
                                        );
                                    })}

                                    {/* Hide dot if platforms are shown, unless it's a dragging target or we want a visual anchor */}
                                    {(!hasPlatforms || isDragging) && (
                                        <CircleMarker
                                            className={`station-${name}`}
                                            center={node.coord}
                                            pathOptions={stationStyle}
                                            radius={radius}
                                            eventHandlers={{
                                                click: () => handleStationClick(name),
                                                mousedown: () => onStationMouseDown(name, [node.coord[1], node.coord[0]]),
                                                mouseup: () => onStationMouseUp(name),
                                            }}
                                        >
                                            <Tooltip sticky pane="top-tooltips" offset={[20, -20]} direction="top" opacity={isDragging ? 0 : (isSelected ? 1 : 0.7)}>
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
                                                                color: (selectedLines.includes(fl.key) || activeLine === fl.key) ? '#2980b9' : '#555',
                                                                fontWeight: (selectedLines.includes(fl.key) || activeLine === fl.key) ? '800' : '500'
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
                                        </CircleMarker>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default React.memo(Stations);

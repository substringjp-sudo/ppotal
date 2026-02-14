"use client";

import React from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker, Polygon } from 'react-leaflet';
import { lightenColor } from '../lib/lineColors';

interface StaticNode {
    id: string;
    coord: [number, number];
    lineKey: string;
}

interface StationsProps {
    processedStations: Record<string, { nodes: StaticNode[]; centroid: [number, number]; lines: string[] }> | null;
    highlightedStations: string[];
    handleStationClick: (name: string) => void;
    zoom: number;
    getColor: (name: string) => string;
    selectedLines: string[];
    onStationMouseDown: (name: string, coords: [number, number]) => void;
    onStationMouseUp: (name: string) => void;
    dragStartStation: string | null;
    visitedStations: Set<string>;
}

// Convex Hull Algorithm (Monotone Chain)
const convexHull = (points: [number, number][]): [number, number][] => {
    if (points.length < 3) return points;

    const sorted = [...points].sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);

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
    onStationMouseDown,
    onStationMouseUp,
    dragStartStation,
    visitedStations
}) => {
    if (!processedStations) {
        return null;
    }

    const stationEntries = Object.entries(processedStations).filter(([name, data]) => {
        if (selectedLines.length === 0) return false;
        // Show dots only from zoom 7 (two stages later than initial 5)
        if (zoom < 7) return false;
        return data.lines.some(line => selectedLines.includes(line));
    });

    return (
        <>
            {stationEntries.map(([name, station]) => {
                const isHighlighted = highlightedStations.includes(name);
                const isSelected = selectedLines.some(line => station.lines.includes(line));
                const lines = station.lines;

                const isDragging = dragStartStation === name;
                const isLowZoom = zoom <= 13;

                const radius = isLowZoom ? 2.5 : (isHighlighted ? 8 : 6);
                const weight = isLowZoom ? 0 : (isHighlighted ? 5 : 3);

                const coords = station.nodes.map(n => n.coord);
                const hullPoints = coords.length > 2 ? convexHull(coords) : null;
                const hasMultiplePoints = coords.length > 1;

                // Format line names for tooltip
                const formattedLines = lines.map(l => {
                    if (l.includes('::')) {
                        const [company, line] = l.split('::');
                        return { company, line, key: l };
                    }
                    return { company: 'Unknown', line: l, key: l };
                });

                return (
                    <React.Fragment key={name}>
                        {/* Grouping Polygon - Improved Visual */}
                        {zoom > 12 && hasMultiplePoints && (hullPoints || coords.length === 2) && (
                            <Polygon
                                positions={hullPoints || coords}
                                pathOptions={{
                                    color: isHighlighted ? '#FF0000' : getColor(lines[0]),
                                    weight: 2,
                                    fillColor: isHighlighted ? '#FF0000' : getColor(lines[0]),
                                    fillOpacity: 0.15,
                                    stroke: true,
                                    lineJoin: 'round',
                                    lineCap: 'round'
                                }}
                            />
                        )}

                        {zoom > 12 && isSelected && (
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
                                            ">${name}</div>
                                        </div>
                                    `,
                                    iconSize: [0, 0],
                                })}
                                zIndexOffset={100}
                            />
                        )}

                        {station.nodes.map((node, idx) => {
                            const isNodeVisited = visitedStations.has(node.id);
                            const isNodeSelected = selectedLines.includes(node.lineKey);

                            const baseColor = getColor(node.lineKey);
                            const lightenedColor = lightenColor(baseColor, 60);

                            const stationStyle = {
                                fill: !isLowZoom || isNodeSelected,
                                fillColor: isNodeVisited ? '#2ecc71' : (isDragging ? '#2ecc71' : lightenedColor),
                                fillOpacity: (isNodeSelected || isNodeVisited) ? 1 : 0.8,
                                stroke: !isLowZoom || isNodeSelected || isNodeVisited,
                                color: isNodeVisited ? baseColor : baseColor, // Inner border is official
                                weight: isNodeVisited ? weight + 1 : weight,
                                opacity: (isNodeSelected || isNodeVisited) ? 1 : 0.4,
                                className: isNodeVisited ? 'visited-station-glow' : ''
                            };

                            return (
                                <CircleMarker
                                    key={`${node.id}-${idx}`}
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
                                    <Tooltip sticky pane="tooltipPane" opacity={isDragging ? 0 : (isSelected ? 1 : 0.7)}>
                                        <div style={{ zIndex: 1000, position: 'relative', minWidth: '150px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
                                                {name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                {formattedLines.map((fl, fidx) => (
                                                    <div key={fidx} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: '8px',
                                                        padding: '1px 0',
                                                        color: selectedLines.includes(fl.key) ? '#000' : '#888',
                                                        fontWeight: selectedLines.includes(fl.key) ? 'bold' : 'normal'
                                                    }}>
                                                        <span>{fl.company}</span>
                                                        <span>{fl.line}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {isNodeVisited && <div style={{ marginTop: '4px', fontSize: '11px', color: '#000', fontWeight: 'bold' }}>✓ Visited</div>}
                                        </div>
                                    </Tooltip>
                                </CircleMarker>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default React.memo(Stations);

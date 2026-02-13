"use client";

import React from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker, Polygon } from 'react-leaflet';

interface StationsProps {
    processedStations: Record<string, { allCoords: [number, number][]; lines: string[]; centroid: [number, number] }> | null;
    highlightedStations: string[];
    handleStationClick: (name: string) => void;
    zoom: number;
    getColor: (name: string) => string;
    selectedLines: string[];
    onStationMouseDown: (name: string) => void;
    onStationMouseUp: (name: string) => void;
    dragStartStation: string | null;
    visitedStations: Set<string>;
}

// Convex Hull Algorithm (Monotone Chain)
const convexHull = (points: [number, number][]): [number, number][] => {
    if (points.length < 3) return points;

    // Sort logic needs to work on [lat, lng] tuples
    // Sort by Lat (x), then Lng (y) - effectively
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

    // Concatenate and remove duplicate start/end points
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
        // User request: "Only show stations on selected lines". 
        // If no lines selected, show NO stations.
        if (selectedLines.length === 0) return false;

        // Show station ONLY if it belongs to a selected line.
        return data.lines.some(line => selectedLines.includes(line));
    });

    return (
        <>
            {stationEntries.map(([name, station]) => {
                const isHighlighted = highlightedStations.includes(name);
                const isSelected = selectedLines.some(line => station.lines.includes(line));
                const lines = station.lines;

                // Determine if this station is being dragged
                const isDragging = dragStartStation === name;
                const isVisited = visitedStations.has(name);
                const isLowZoom = zoom <= 11;

                // Default CircleMarker
                const radius = isLowZoom ? 2.5 : (isHighlighted ? 8 : 6);
                const weight = isLowZoom ? 0 : 3;

                // Calculate Convex Hull for grouping if there are multiple points
                const hullPoints = station.allCoords.length > 2 ? convexHull(station.allCoords) : null;
                const hasMultiplePoints = station.allCoords.length > 1;

                return (
                    <React.Fragment key={name}>
                        {/* Grouping Polygon for multi-point stations */}
                        {zoom > 13 && hasMultiplePoints && (hullPoints || station.allCoords.length === 2) && (
                            <Polygon
                                positions={hullPoints || station.allCoords}
                                pathOptions={{
                                    color: isHighlighted ? '#FF0000' : getColor(lines[0]),
                                    weight: 1,
                                    fillColor: isHighlighted ? '#FF0000' : getColor(lines[0]),
                                    fillOpacity: 0.1,
                                    dashArray: '4, 4',
                                    stroke: true
                                }}
                            />
                        )}

                        {zoom > 13 && isSelected && (
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

                        {station.allCoords.map((coord, idx) => {
                            const stationStyle = {
                                fill: !isLowZoom || isSelected, // visible fill if selected or zoomed in
                                fillColor: isVisited ? '#000000' : (isDragging ? 'black' : 'white'),
                                fillOpacity: (isSelected || isVisited) ? 1 : 0.3, // Ghosted if not selected
                                stroke: !isLowZoom || isSelected || isVisited,
                                color: getColor(lines[0]), // Always use line color for border
                                weight: weight,
                                opacity: (isSelected || isVisited) ? 1 : 0.4, // Ghosted border
                            };

                            return (
                                <CircleMarker
                                    key={`${name}-${idx}`}
                                    className={`station-${name}`}
                                    center={coord}
                                    pathOptions={stationStyle}
                                    radius={radius}
                                    eventHandlers={{
                                        click: () => handleStationClick(name),
                                        mousedown: () => onStationMouseDown(name),
                                        mouseup: () => onStationMouseUp(name),
                                    }}
                                >
                                    <Tooltip sticky pane="tooltipPane" opacity={isDragging ? 0 : (isSelected ? 1 : 0.7)}>
                                        <div style={{ zIndex: 1000, position: 'relative' }}>
                                            <strong>{name}</strong>
                                            <br />
                                            Line: {lines[0].includes('::') ? lines[0].split('::')[1] : lines[0]}
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

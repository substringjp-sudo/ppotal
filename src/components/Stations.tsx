"use client";

import React from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker } from 'react-leaflet';

interface StationsProps {
    processedStations: Record<string, { coords: [number, number]; lines: string[] }> | null;
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
        // If no lines are selected, hide all stations (to reduce clutter)
        if (selectedLines.length === 0) return false;
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

                // Determine transparency/visibility based on zoom
                // High zoom (> 11): show all stations
                // Low zoom (<= 11): show only major stations? 
                // Current logic seems to be: show all if data is passed (MapPane filters by bounds)

                // But simplified view at low zoom?
                const isLowZoom = zoom <= 11;

                const isVisited = visitedStations.has(name);

                if (zoom > 13 && isSelected) {
                    const dotSize = isHighlighted ? 12 : 10;
                    const labelIcon = L.divIcon({
                        className: 'station-label-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
                                <div style="
                                    width: ${dotSize}px;
                                    height: ${dotSize}px;
                                    background-color: ${isVisited ? '#000000' : (isDragging ? 'black' : 'white')};
                                    border: 2px solid ${isVisited ? '#000000' : (isHighlighted ? '#FF0000' : '#666')};
                                    border-radius: 50%;
                                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                                    margin-bottom: 4px;
                                "></div>
                                <div style="
                                    margin-top: ${dotSize / 2 + 4}px;
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
                    });

                    return (
                        <Marker
                            key={name}
                            position={station.coords}
                            icon={labelIcon}
                            zIndexOffset={100}
                            eventHandlers={{
                                click: () => handleStationClick(name),
                                mousedown: () => onStationMouseDown(name),
                                mouseup: () => onStationMouseUp(name),
                            }}
                        >
                            <Tooltip sticky pane="tooltipPane" opacity={isDragging ? 0 : 1}>
                                <div style={{ zIndex: 1000, position: 'relative' }}>
                                    <strong>{name}</strong>
                                    <br />
                                    Line: {lines[0].includes('::') ? lines[0].split('::')[1] : lines[0]}
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                }

                // Default CircleMarker
                const radius = isLowZoom ? 2.5 : (isHighlighted ? 8 : 6);
                const weight = isLowZoom ? 0 : 3;

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
                        key={name}
                        className={`station-${name}`}
                        center={station.coords}
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
        </>
    );
};

export default React.memo(Stations);

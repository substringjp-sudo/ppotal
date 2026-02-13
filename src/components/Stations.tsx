"use client";

import React from 'react';
import L from 'leaflet';
import { CircleMarker, Tooltip, Marker } from 'react-leaflet';

const Stations = ({ processedStations, highlightedStations, handleStationClick, zoom, getColor, selectedLines, onStationMouseDown, onStationMouseUp, clickStartStation, dragStartStation }) => {
    if (!processedStations) {
        return null;
    }

    const startStation = clickStartStation || dragStartStation;

    const stationEntries = Object.entries(processedStations).filter(([name, data]) => {
        if (!selectedLines || selectedLines.length === 0) return true;
        return data.lines.some(line => selectedLines.includes(line));
    });

    return (
        <>
            {stationEntries.map(([name, station]) => {
                const isHighlighted = highlightedStations.includes(name);
                const isStart = name === startStation;
                const isLowZoom = zoom <= 10;

                // Filter lines by selection and deduplicate by line name
                const filteredLines = station.lines.filter(l => selectedLines.length === 0 || selectedLines.includes(l));
                const uniqueLinesMap = new Map();
                filteredLines.forEach(l => {
                    const lineName = l.includes('::') ? l.split('::')[1] : l;
                    if (!uniqueLinesMap.has(lineName)) {
                        uniqueLinesMap.set(lineName, l);
                    }
                });
                const lines = Array.from(uniqueLinesMap.values());

                if (lines.length === 0) return null;
                const isInterchange = lines.length > 1 && !isLowZoom;

                if (isInterchange) {
                    const dotSize = isHighlighted ? 10 : 8;
                    const itemsPerRow = Math.ceil(Math.sqrt(lines.length));
                    const capsulePadding = 6;
                    const dotMargin = 2;
                    const containerWidth = itemsPerRow * (dotSize + dotMargin * 2) + capsulePadding * 2;
                    const containerHeight = Math.ceil(lines.length / itemsPerRow) * (dotSize + dotMargin * 2) + capsulePadding * 2;

                    const dotsHtml = lines.map(line => `
                        <div style="
                            width: ${dotSize}px;
                            height: ${dotSize}px;
                            background-color: ${getColor(line)};
                            border: 1px solid white;
                            border-radius: 50%;
                            margin: ${dotMargin}px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        ">
                            ${isStart ? '<div style="width: 4px; height: 4px; background: black; border-radius: 50%;"></div>' : ''}
                        </div>
                    `).join('');

                    const icon = L.divIcon({
                        className: 'station-capsule-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
                                <div style="
                                    display: flex;
                                    flex-wrap: wrap;
                                    width: ${containerWidth}px;
                                    padding: ${capsulePadding}px;
                                    background: rgba(255, 255, 255, 0.95);
                                    border: 1.5px solid #999;
                                    border-radius: 20px;
                                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                                    justify-content: center;
                                    align-items: center;
                                    transform: translate(-50%, -50%);
                                ">
                                    ${dotsHtml}
                                </div>
                                ${zoom > 13 ? `<div style="
                                    margin-top: ${containerHeight / 2 + 4}px;
                                    font-size: 12px;
                                    font-weight: 800;
                                    color: #000;
                                    text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
                                    white-space: nowrap;
                                    transform: translateX(-50%);
                                    position: absolute;
                                    top: 0;
                                    pointer-events: none;
                                ">${name}</div>` : ''}
                            </div>
                        `,
                        iconSize: [0, 0],
                    });

                    return (
                        <Marker
                            key={name}
                            position={station.coords}
                            icon={icon}
                            zIndexOffset={100}
                            eventHandlers={{
                                click: () => handleStationClick(name),
                                mousedown: () => onStationMouseDown(name),
                                mouseup: () => onStationMouseUp(name),
                            }}
                        >
                            <Tooltip sticky pane="tooltipPane" opacity={1}>
                                <div style={{ zIndex: 1000, position: 'relative' }}>
                                    <strong>{name} (Interchange)</strong>
                                    <br />
                                    Lines: {lines.map(l => l.includes('::') ? l.split('::')[1] : l).join(', ')}
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                }

                if (zoom > 13) {
                    const dotSize = isHighlighted ? 12 : 10;
                    const labelIcon = L.divIcon({
                        className: 'station-label-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
                                <div style="
                                    width: ${dotSize}px;
                                    height: ${dotSize}px;
                                    background-color: ${getColor(lines[0])};
                                    border: 2px solid white;
                                    border-radius: 50%;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                    transform: translate(-50%, -50%);
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                ">
                                    ${isStart ? '<div style="width: 5px; height: 5px; background: black; border-radius: 50%;"></div>' : ''}
                                </div>
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
                            <Tooltip sticky pane="tooltipPane" opacity={1}>
                                <div style={{ zIndex: 1000, position: 'relative' }}>
                                    <strong>{name}</strong>
                                    <br />
                                    Line: {lines[0].includes('::') ? lines[0].split('::')[1] : lines[0]}
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                }

                // Default CircleMarker for mid/low zoom
                const radius = isLowZoom ? 2.5 : (isHighlighted ? 8 : 6);
                const weight = isLowZoom ? 0 : (isHighlighted ? 3 : 2);

                const stationStyle = {
                    fill: true,
                    fillColor: getColor(lines[0]),
                    fillOpacity: 1,
                    stroke: !isLowZoom,
                    color: isStart ? 'black' : 'white', // Black border if start station for CircleMarker
                    weight: isStart ? weight + 2 : weight,
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
                        {isStart && !isLowZoom && (
                            <CircleMarker
                                center={station.coords}
                                radius={radius / 2}
                                pathOptions={{ fillColor: 'black', fillOpacity: 1, stroke: false }}
                                interactive={false}
                            />
                        )}
                        <Tooltip sticky pane="tooltipPane" opacity={1}>
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

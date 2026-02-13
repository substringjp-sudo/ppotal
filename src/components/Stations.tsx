"use client";

import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';

const Stations = ({ processedStations, highlightedStations, handleStationClick, zoom, getColor }) => {
    if (!processedStations) {
        return null;
    }

    const stationEntries = Object.entries(processedStations);

    return (
        <>
            {stationEntries.map(([name, station]) => {
                const isHighlighted = highlightedStations.includes(name);

                const stationStyle = {
                    fillColor: getColor(station.lines[0]), // Color based on the first line
                    fillOpacity: 1,
                    stroke: true,
                    color: 'white', // Border color
                    weight: zoom > 10 ? (isHighlighted ? 3 : 1.5) : 1, // Border weight
                };

                // Dynamic radius based on zoom level
                const radius = zoom > 10 ? (isHighlighted ? 7 : 5) : 3;

                return (
                    <CircleMarker
                        key={name}
                        center={station.coords}
                        pathOptions={stationStyle}
                        radius={radius}
                        eventHandlers={{
                            click: () => handleStationClick(name),
                        }}
                    >
                        {zoom > 10 && (
                            <Tooltip>
                                <div>
                                    <strong>{name}</strong>
                                    <br />
                                    Lines: {station.lines.join(', ')}
                                </div>
                            </Tooltip>
                        )}
                    </CircleMarker>
                );
            })}
        </>
    );
};

export default React.memo(Stations);

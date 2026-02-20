"use client";

import React, { memo } from 'react';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';
import { RailData } from '../types/railData';

interface StationsProps {
    processedStations: Record<string, ProcessedStation> | null;
    highlightedStations: string[];
    handleStationClick: (id: string, lines?: string[]) => void;
    zoom: number;
    getColor: (lineKey: string) => string;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onStationMouseDown: (id: string, coords: [number, number]) => void;
    onStationMouseUp: (id: string) => void;
    dragStartStation: string | null;
    onLineMappingCreated?: (mapping: Map<string, string>) => void;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language: Language;
    isMobile: boolean;
    selectedStation?: string;
    isEditMode?: boolean;
    isMoving?: boolean;
    railData: RailData;
}

const Stations: React.FC<StationsProps> = ({
    processedStations,
    highlightedStations,
    handleStationClick,
    zoom,
    getColor,
    selectedLines,
    activeLine,
    hoveredLine,
    onStationMouseDown,
    onStationMouseUp,
    dragStartStation,
    visitedStations,
    settings,
    language,
    isMobile,
    selectedStation,
    isEditMode,
    isMoving = false,
    railData
}) => {
    if (!processedStations) return null;

    const stationEntries = Object.entries(processedStations).filter(([id, data]) => {
        // If in Edit Mode, we assume selected lines logic still applies for visibility?
        // Or should we show ALL stations in edit mode?
        // Usually we only show selected lines to avoid clutter. Consistent behavior is safer.
        const isSelected = data.lines.some(l =>
            selectedLines.includes(l) ||
            (activeLine === l) ||
            (hoveredLine === l)
        );

        if (!isSelected) return false;
        if (zoom < 10) return false;

        return true;
    });

    return (
        <>
            {stationEntries.map(([id, station]) => (
                <StationMarker
                    key={id}
                    id={id}
                    station={station}
                    highlightedStations={highlightedStations}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    hoveredLine={hoveredLine}
                    zoom={zoom}
                    getColor={getColor}
                    handleStationClick={handleStationClick}
                    onStationMouseDown={onStationMouseDown}
                    onStationMouseUp={onStationMouseUp}
                    dragStartStation={dragStartStation}
                    visitedStations={visitedStations}
                    settings={settings}
                    language={language}
                    isMobile={isMobile}
                    selectedStation={selectedStation}
                    isEditMode={isEditMode}
                    isMoving={isMoving}
                    railData={railData}
                />
            ))}
        </>
    );
};

export default memo(Stations);

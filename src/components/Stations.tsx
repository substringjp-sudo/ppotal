"use client";

import React, { memo } from 'react';
import { normalizeKey } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';
import { Language } from '../lib/translations';
import { ProcessedStation } from '../types/mapTypes';
import StationMarker from './StationMarker';

interface StationsProps {
    processedStations: Record<string, ProcessedStation> | null;
    highlightedStations: string[];
    handleStationClick: (name: string, lines?: string[]) => void;
    zoom: number;
    getColor: (name: string) => string;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
    onStationMouseDown: (name: string, coords: [number, number]) => void;
    onStationMouseUp: (name: string) => void;
    dragStartStation: string | null;
    onLineMappingCreated?: (mapping: Map<string, string>) => void;
    visitedStations: Set<string>;
    settings: MapStyleSettings;
    language: Language;
    isMobile: boolean;
    selectedStation?: string;
    isEditMode?: boolean; // New prop
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
    isEditMode
}) => {
    if (!processedStations) return null;

    const stationEntries = Object.entries(processedStations).filter(([name, data]) => {
        // If in Edit Mode, we assume selected lines logic still applies for visibility?
        // Or should we show ALL stations in edit mode?
        // Usually we only show selected lines to avoid clutter. Consistent behavior is safer.
        const isSelected = data.lines.some(l =>
            selectedLines.some(sl => normalizeKey(sl) === normalizeKey(l)) ||
            (activeLine && normalizeKey(activeLine) === normalizeKey(l)) ||
            (hoveredLine && normalizeKey(hoveredLine) === normalizeKey(l))
        );

        if (!isSelected) return false;
        if (zoom < 10) return false;

        return true;
    });

    return (
        <>
            {stationEntries.map(([name, station]) => (
                <StationMarker
                    key={name}
                    name={name}
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
                />
            ))}
        </>
    );
};

export default memo(Stations);

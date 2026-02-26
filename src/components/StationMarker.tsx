"use client";
import React, { memo, useMemo } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { ProcessedStation } from '../types/mapTypes';

interface StationMarkerProps {
    station: ProcessedStation;
    selectedLines: string[];
    activeLine: string | null;
    hoveredLine: string | null;
}

/**
 * Simplified Station Marker Component
 * Now primarily handles label rendering using L.divIcon.
 * Actual node and platform rendering is handled by batch layers in Stations.tsx.
 */
const StationMarker: React.FC<StationMarkerProps> = ({
    station,
    selectedLines,
    activeLine,
    hoveredLine,
}) => {
    const isSelected = useMemo(() => station.lines.some(l =>
        selectedLines.includes(l) || (activeLine === l) || (hoveredLine === l)
    ), [station.lines, selectedLines, activeLine, hoveredLine]);

    const isHighlighted = false;

    return (
        <Marker
            position={station.centroid}
            interactive={false}
            pane="station-labels"
            icon={L.divIcon({
                className: 'station-label-icon',
                html: `
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500; transition: all 0.2s ease;">
                        <div style="
                            margin-top: ${(isHighlighted ? 12 : 10) / 2 + 4}px;
                            font-size: 11px; 
                            font-weight: ${isSelected ? '800' : '700'}; 
                            color: ${isSelected ? '#000' : '#4a5568'};
                            background: rgba(255, 255, 255, 0.85);
                            backdrop-filter: blur(2px);
                            padding: 2px 6px;
                            border-radius: 4px;
                            border: 1px solid rgba(255,255,255,0.9);
                            text-shadow: 0 0 2px #fff;
                            white-space: nowrap; 
                            transform: translateX(-50%) scale(1); 
                            position: absolute; 
                            top: 0; 
                            pointer-events: none;
                            opacity: ${isSelected ? 1 : 0.9};
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        ">
                            <div style="font-weight: 800; font-size: 11px; line-height: 1.1; margin-bottom: 1px;">
                                ${station.name}
                            </div>
                            ${station.name_en ? `<div style="font-size: 8px; font-weight: 600; opacity: 0.8; line-height: 1;">${station.name_en}</div>` : ''}
                        </div>
                    </div>
                `,
                iconSize: [0, 0],
            })}
            zIndexOffset={100}
        />
    );
};

StationMarker.displayName = 'StationMarker';
export default memo(StationMarker);

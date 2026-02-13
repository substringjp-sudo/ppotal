"use client";

import React, { useCallback } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

interface RailroadsProps {
    railroads: any;
    selectedLines: string[];
    onRailroadClick?: (line: string) => void;
    getColor: (name: string) => string;
    className?: string;
    zoom: number;
}

const Railroads: React.FC<RailroadsProps> = ({ railroads, selectedLines, onRailroadClick, getColor, className, zoom }) => {
    const [hoveredLineKey, setHoveredLineKey] = React.useState<string | null>(null);

    const style = useCallback((feature: any) => {
        const lineName = feature.properties.N02_003;
        const key = `${feature.properties.N02_004}::${lineName}`;

        // If selectedLines is empty, we treat NOTHING as selected (all ghosted).
        // This makes the map initially "faint".
        // BUT the user interaction (click) will select one.
        const isSelected = selectedLines.includes(key);
        // If selectedLines is empty => All visible (full opacity? or ghosted?)
        // The user said: "When not all lines are checked... make unchecked ... semi-transparent".
        // If selectedLines is empty, NONE are checked. So all semi-transparent? 
        // Or typically initial state is ALL visible. 
        // Current logic in Stations.tsx: if (selectedLines.length === 0) return true; (shows all).
        // Let's keep "Empty = Show All Full Opacity" or "Empty = Show All Ghosted"?
        // Sidebar logic usually implies empty = none selected. 
        // If I implement "Select All", then initial state might be empty.
        // Let's assume: If selectedLines len > 0, then non-selected are ghosted. 
        // If selectedLines len == 0, then ALL are ghosted? Or ALL are full?
        // Let's stick to: If selectedLines > 0, check includes. 

        const isActuallySelected = selectedLines.includes(key);
        const hasSelection = selectedLines.length > 0;

        // If nothing selected, maybe show everything ghosted? Or everything full?
        // Standard map behavior: No selection = Base state (often full). 
        // But user wants to highlight selection. 
        // Let's try: 
        // isSelected = isActuallySelected || !hasSelection; -> existing logic
        // But user explicitly wants "unchecked" to be semi-transparent.
        // If !hasSelection, everything is "unchecked". So everything semi-transparent?
        // That seems annoying. 
        // Let's say: If !hasSelection, treat as "All Selected" (classic filter behavior).
        // But user wants "Select All" button. Ideally, "Select All" makes `selectedLines` contain everything.
        // "Deselect All" makes `selectedLines` empty.
        // If empty, user usually expects nothing or everything.
        // Given the request "Make unchecked ... semi-transparent", if I deselect all, everything is unchecked -> everything semi-transparent.
        // This allows user to click one to select it. 

        const isHighlighted = isActuallySelected;
        const isHovered = hoveredLineKey === key;

        return {
            color: getColor(key),
            weight: isHovered ? 6 : (isHighlighted ? 4 : 2),
            opacity: isHighlighted ? 1 : (isHovered ? 1 : 0.3), // Hover makes it fully opaque
        };
    }, [selectedLines, getColor, hoveredLineKey]);

    const filter = useCallback((feature: any) => {
        return true; // Always show all lines
    }, []);

    if (!railroads) {
        return null;
    }

    // Interaction Layer Style (Invisible, thick)
    const interactionStyle = {
        weight: 15, // Increased weight for better hit testing
        opacity: 0.0, // Set to 0.0 for invisibility, but ensure events are caught
        color: '#000',
        fillOpacity: 0.0
    };

    // Events are now handled by the interaction layer
    const onEachInteractionFeature = (feature: any, layer: any) => {
        const lineName = feature.properties.N02_003;
        const key = `${feature.properties.N02_004}::${lineName}`;

        layer.bindTooltip(lineName, { sticky: true, className: 'railroad-tooltip' });

        layer.on({
            mouseover: (e: any) => {
                setHoveredLineKey(key);
                e.target.setStyle({ weight: 15 }); // optional feedback
            },
            mouseout: (e: any) => {
                setHoveredLineKey(null);
                e.target.setStyle({ weight: 15 });
            },
            click: (e: any) => {
                L.DomEvent.stopPropagation(e); // Stop event from bubbling to map
                if (onRailroadClick) onRailroadClick(key);
            }
        });
    };

    return (
        <>
            {/* Visual Layer - Non-interactive, pure display */}
            <GeoJSON
                data={railroads}
                style={style}
                interactive={false}
            />
            {/* Interaction Layer - Invisible, thick, handles events */}
            <GeoJSON
                data={railroads}
                style={interactionStyle}
                onEachFeature={onEachInteractionFeature}
                interactive={true}
            />
        </>
    );
};

export default React.memo(Railroads);

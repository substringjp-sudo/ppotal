"use client";

import React, { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

interface RailroadsProps {
    railroadNetwork: any;
    selectedLines: string[];
    onRailroadClick?: (line: string) => void;
    getColor: (name: string) => string;
    className?: string;
    zoom: number;
}

const Railroads: React.FC<RailroadsProps> = ({ railroadNetwork, selectedLines, onRailroadClick, getColor, className, zoom }) => {
    const [hoveredLineKey, setHoveredLineKey] = React.useState<string | null>(null);

    const geoJsonData = useMemo(() => {
        if (!railroadNetwork) return null;
        const features = railroadNetwork.routes.flatMap((route: any) => {
            return route.edges.map((edge: any) => ({
                type: 'Feature',
                properties: {
                    id: route.id,
                    company: route.company,
                    line: route.line,
                    from: edge.from,
                    to: edge.to,
                    distance: edge.distance
                },
                geometry: {
                    type: 'LineString',
                    coordinates: edge.geometry
                }
            }));
        });
        return { type: 'FeatureCollection' as const, features };
    }, [railroadNetwork]);

    const style = useCallback((feature: any) => {
        const key = feature.properties.id;

        const isActuallySelected = selectedLines.includes(key);
        const hasSelection = selectedLines.length > 0;

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

    if (!geoJsonData) {
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
        const lineName = feature.properties.line;
        const key = feature.properties.id;

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
                key={`visual-${geoJsonData.features.length}`} // Force re-render if data size changes
                data={geoJsonData}
                style={style}
                interactive={false}
            />
            {/* Interaction Layer - Invisible, thick, handles events */}
            <GeoJSON
                key={`interaction-${geoJsonData.features.length}`}
                data={geoJsonData}
                style={interactionStyle}
                onEachFeature={onEachInteractionFeature}
                interactive={true}
            />
        </>
    );
};

export default React.memo(Railroads);

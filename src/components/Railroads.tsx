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
    const geoJsonRef = React.useRef<L.GeoJSON>(null);

    const geoJsonData = useMemo(() => {
        if (!railroadNetwork) return null;

        // Group edges by route ID
        const features = railroadNetwork.routes.map((route: any) => {
            const coordinates = route.edges.map((edge: any) => edge.geometry);

            return {
                type: 'Feature',
                properties: {
                    id: route.id,
                    company: route.company,
                    line: route.line
                },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: coordinates
                }
            };
        });

        return { type: 'FeatureCollection' as const, features };
    }, [railroadNetwork]);

    const getFeatureStyle = useCallback((feature: any) => {
        const key = feature.properties.id;
        const isSelected = selectedLines.includes(key);
        const isHovered = hoveredLineKey === key;
        const baseColor = getColor(key);

        return {
            color: isHovered ? '#ff4d4f' : baseColor,
            weight: isHovered ? 12 : (isSelected ? 10 : 8),
            opacity: isHovered ? 1 : (isSelected ? 0.9 : 0.4),
            lineCap: 'round' as L.LineCapShape,
            lineJoin: 'round' as L.LineJoinShape,
        };
    }, [getColor, selectedLines, hoveredLineKey]);

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const key = feature.properties.id;
        const lineName = feature.properties.line;
        const companyName = feature.properties.company;

        layer.bindTooltip(`${companyName} ${lineName}`, {
            sticky: true,
            className: 'railroad-tooltip',
            direction: 'top',
            offset: [0, -10]
        });

        layer.on({
            mouseover: () => {
                setHoveredLineKey(key);
                layer.bringToFront();
            },
            mouseout: () => setHoveredLineKey(null),
            click: (e: any) => {
                L.DomEvent.stopPropagation(e);
                if (onRailroadClick) onRailroadClick(key);
            }
        });
    }, [onRailroadClick]);

    // Force style update when selection changes (hover is handled by layer.on)
    React.useEffect(() => {
        if (!geoJsonRef.current) return;
        geoJsonRef.current.eachLayer((layer: any) => {
            if (layer.feature) {
                layer.setStyle(getFeatureStyle(layer.feature));
                if (selectedLines.includes(layer.feature.properties.id)) {
                    layer.bringToFront();
                }
            }
        });
    }, [selectedLines, getFeatureStyle]);

    if (!geoJsonData) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .railroad-tooltip {
                    background: rgba(0, 0, 0, 0.95) !important;
                    color: white !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    font-size: 14px !important;
                    font-weight: 800 !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.6) !important;
                    pointer-events: none !important;
                    z-index: 3000 !important;
                }
                .railroad-tooltip:before {
                    border-top-color: rgba(0, 0, 0, 0.95) !important;
                }
            `}} />
            <GeoJSON
                ref={geoJsonRef}
                key={`railroads-${geoJsonData.features.length}-${selectedLines.length}`}
                data={geoJsonData}
                style={getFeatureStyle}
                onEachFeature={onEachFeature}
            />
        </>
    );
};

export default React.memo(Railroads);

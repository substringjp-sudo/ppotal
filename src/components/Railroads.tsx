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
    isDragging?: boolean;
}

const Railroads: React.FC<RailroadsProps> = ({ railroadNetwork, selectedLines, onRailroadClick, getColor, className, zoom, isDragging }) => {
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
        const lineKey = feature.properties.id;
        const isHovered = !isDragging && hoveredLineKey === lineKey;
        const isSelected = selectedLines.includes(lineKey);
        const baseColor = getColor(lineKey);

        // Dynamic weight based on zoom
        let baseWeight = 2;
        if (zoom > 7) baseWeight = 3;
        if (zoom > 9) baseWeight = 5;
        if (zoom > 11) baseWeight = 8;

        const weight = isHovered ? baseWeight * 1.5 : (isSelected ? baseWeight * 1.2 : baseWeight);

        return {
            color: isHovered ? '#ff4d4f' : baseColor,
            weight: weight,
            opacity: isHovered ? 1 : (isSelected ? 0.9 : 0.4),
            lineCap: 'round' as L.LineCapShape,
            lineJoin: 'round' as L.LineJoinShape,
        };
    }, [hoveredLineKey, selectedLines, getColor, isDragging, zoom]);

    const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
        const lineKey = feature.properties.id;
        const lineName = feature.properties.line;

        layer.on({
            mouseover: (e) => {
                if (isDragging) return;
                setHoveredLineKey(lineKey);
                const tooltipHtml = `
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-size: 10px; opacity: 0.7;">${feature.properties.company}</span>
                        <span>${lineName}</span>
                    </div>
                `;
                layer.bindTooltip(tooltipHtml, {
                    sticky: true,
                    className: 'railroad-tooltip',
                    direction: 'top',
                    offset: [0, -10]
                }).openTooltip();
            },
            mouseout: () => {
                setHoveredLineKey(null);
                layer.unbindTooltip();
            },
            click: () => {
                if (onRailroadClick && !isDragging) onRailroadClick(lineKey);
            }
        });
    }, [onRailroadClick, isDragging]);

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

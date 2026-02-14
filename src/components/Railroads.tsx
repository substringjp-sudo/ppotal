"use client";

import React, { useCallback, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { normalizeKey } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';

interface RailroadsProps {
    railroadNetwork: any;
    selectedLines: string[];
    recordedTrips: any[];
    onRailroadClick?: (line: string) => void;
    getColor: (name: string) => string;
    className?: string;
    zoom: number;
    isDragging?: boolean;
    activeLine: string | null;
}

const Railroads: React.FC<RailroadsProps> = ({
    railroadNetwork,
    selectedLines,
    recordedTrips,
    onRailroadClick,
    getColor,
    className,
    zoom,
    isDragging,
    activeLine
}) => {
    const [hoveredLineKey, setHoveredLineKey] = React.useState<string | null>(null);
    const geoJsonRef = React.useRef<L.GeoJSON>(null);

    // Get set of visited edge keys for fast lookup
    const visitedEdgeKeys = useMemo(() => {
        const keys = new Set<string>();
        recordedTrips.forEach(trip => {
            if (trip.path) {
                for (let i = 0; i < trip.path.length - 1; i++) {
                    keys.add([trip.path[i], trip.path[i + 1]].sort().join('<->'));
                }
            }
        });
        return keys;
    }, [recordedTrips]);

    // Group routes for layered rendering
    const { visitedFeatures, selectedFeatures, normalFeatures } = useMemo(() => {
        if (!railroadNetwork) return { visitedFeatures: [], selectedFeatures: [], normalFeatures: [] };

        const visited: any[] = [];
        const selected: any[] = [];
        const normal: any[] = [];

        railroadNetwork.routes.forEach((route: any) => {
            const lineKey = `${route.company}::${route.line}`;
            const isLineSelected = selectedLines.includes(lineKey);

            // Split edges into visited and unvisited
            const visitedCoords: any[][] = [];
            const unvisitedCoords: any[][] = [];

            route.edges.forEach((edge: any) => {
                const edgeKey = [edge.from, edge.to].sort().join('<->');
                if (visitedEdgeKeys.has(edgeKey)) {
                    visitedCoords.push(edge.geometry);
                } else {
                    unvisitedCoords.push(edge.geometry);
                }
            });

            if (visitedCoords.length > 0) {
                visited.push({
                    type: 'Feature',
                    properties: { id: lineKey, company: route.company, line: route.line, type: 'visited' },
                    geometry: { type: 'MultiLineString', coordinates: visitedCoords }
                });
            }

            if (unvisitedCoords.length > 0) {
                const feature = {
                    type: 'Feature',
                    properties: { id: lineKey, company: route.company, line: route.line, type: 'normal' },
                    geometry: { type: 'MultiLineString', coordinates: unvisitedCoords }
                };
                // Treat activeLine as selected for rendering priority and visibility
                if (isLineSelected || activeLine === lineKey) {
                    selected.push(feature);
                } else {
                    normal.push(feature);
                }
            }
        });

        return { visitedFeatures: visited, selectedFeatures: selected, normalFeatures: normal };
    }, [railroadNetwork, selectedLines, visitedEdgeKeys, activeLine]);

    const getBaseWeight = useCallback(() => {
        if (zoom <= 6) return 1.5;
        if (zoom <= 8) return 2.5;
        if (zoom <= 10) return 4;
        if (zoom <= 12) return 6;
        return 9;
    }, [zoom]);

    const renderLayer = (features: any[], isOutline: boolean, type: 'normal' | 'selected' | 'visited') => {
        if (features.length === 0) return null;

        const baseWeight = getBaseWeight();

        const style = (feature: any) => {
            const lineKey = feature.properties.id;
            const isActive = activeLine === lineKey;
            const isHovered = !isDragging && hoveredLineKey === lineKey;
            const baseColor = getColor(lineKey);

            let weight = baseWeight;
            if (type === 'selected') weight *= 1.4; // Slightly more weight
            if (type === 'visited') weight *= 1.5;
            if (isActive) weight *= 1.8; // Active line is very bold
            if (isHovered) weight *= 1.2;

            if (isOutline) {
                let outlineColor = '#ffffff';
                let oWeight = weight + (zoom > 10 ? 4 : 2);
                let opacity = type === 'normal' ? 0.3 : 0.9; // Increased selected outline opacity

                if (isActive) {
                    outlineColor = '#3498db'; // Blue glow for active
                    opacity = 1.0;
                }

                if (type === 'visited') {
                    outlineColor = '#2ecc71';
                    oWeight = weight + 4;
                    opacity = 1.0;
                }

                return {
                    color: '#fff',
                    weight: weight + (zoom > 10 ? 3 : 2),
                    opacity: 0.8,
                    lineCap: 'round' as L.LineCapShape,
                    lineJoin: 'round' as L.LineJoinShape,
                };
            }

            let color = baseColor;
            let opacity = 0.9; // Increased base opacity for better visibility

            if (isActive || type === 'visited') {
                opacity = 1.0;
            } else if (type === 'normal') {
                opacity = 0.4;
            }

            if (isHovered) {
                color = '#e74c3c'; // Coral red for hover
                opacity = 1.0;
            }

            return {
                color: color,
                weight: weight,
                opacity: opacity,
                lineCap: 'round' as L.LineCapShape,
                lineJoin: 'round' as L.LineJoinShape,
            };
        };

        return (
            <GeoJSON
                key={`${type}-${isOutline ? 'outline' : 'color'}-${features.length}-${visitedEdgeKeys.size}`}
                data={{ type: 'FeatureCollection', features } as any}
                style={style}
                onEachFeature={onEachFeature}
            />
        );
    };

    const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
        const lineKey = feature.properties.id;
        const lineName = feature.properties.line;

        layer.on({
            mouseover: () => {
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

    if (!railroadNetwork) return null;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .railroad-tooltip {
                    background: rgba(0, 0, 0, 0.9) !important;
                    color: white !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    font-size: 14px !important;
                    font-weight: 800 !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important;
                    pointer-events: none !important;
                    z-index: 3000 !important;
                }
            `}} />

            {/* Outline Layer (Bottom) */}
            {renderLayer(normalFeatures, true, 'normal')}
            {renderLayer(selectedFeatures, true, 'selected')}
            {renderLayer(visitedFeatures, true, 'visited')}

            {/* Color Layer (Top) */}
            {renderLayer(normalFeatures, false, 'normal')}
            {renderLayer(selectedFeatures, false, 'selected')}
            {renderLayer(visitedFeatures, false, 'visited')}
        </>
    );
};

export default React.memo(Railroads);

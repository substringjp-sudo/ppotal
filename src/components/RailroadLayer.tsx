"use client";

import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getOfficialColor } from '../lib/lineColors';

interface RailroadLayerProps {
    railroadNetwork: any;
    selectedLines: string[];
    hoveredLine: string | null;
    activeLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
}

const RailroadLayer: React.FC<RailroadLayerProps> = ({
    railroadNetwork,
    selectedLines,
    hoveredLine,
    activeLine,
    onRailroadClick,
    onRailroadHover,
    zoomLevel
}) => {
    if (!railroadNetwork) return null;

    // Helper to get color
    const getColor = (name: string) => {
        const official = getOfficialColor(name);
        return official || "#333";
    };

    // Memoize line processing to avoid recalculation on every render
    const { invisibleLines, visibleLines } = useMemo(() => {
        const invisible: any[] = [];
        const visible: any[] = [];

        railroadNetwork.routes.forEach((route: any) => {
            const fullId = `${route.company}::${route.line}`;
            const isSelected = selectedLines.includes(fullId);

            // routeGeometry 사용 (모든 section 포함, 끊김 없음)
            // fallback: edge geometry
            const positions = route.routeGeometry
                ? route.routeGeometry.map((geom: any) => geom.map((c: any) => [c[1], c[0]]))
                : route.edges.map((e: any) => e.geometry.map((c: any) => [c[1], c[0]]));

            if (isSelected) {
                // Only calculate endpoints for SELECTED lines to save CPU
                const stationCounts = new Map<string, number>();
                route.edges.forEach((edge: any) => {
                    const fromParts = edge.from.split('::');
                    const toParts = edge.to.split('::');
                    const fromName = fromParts[fromParts.length - 1];
                    const toName = toParts[toParts.length - 1];

                    stationCounts.set(fromName, (stationCounts.get(fromName) || 0) + 1);
                    stationCounts.set(toName, (stationCounts.get(toName) || 0) + 1);
                });

                const terminals: string[] = [];
                stationCounts.forEach((count, name) => {
                    if (count === 1) terminals.push(name);
                });
                const endpointsStr = terminals.length > 0 ? terminals.join(' ↔ ') : 'Loop / Complex';

                visible.push({
                    id: fullId,
                    name: route.line,
                    company: route.company,
                    color: getColor(fullId),
                    positions,
                    endpoints: endpointsStr
                });
            } else {
                invisible.push({
                    id: fullId,
                    name: route.line,
                    company: route.company,
                    color: '#ccc',
                    positions,
                    endpoints: ''
                });
            }
        });

        return { invisibleLines: invisible, visibleLines: visible };
    }, [railroadNetwork, selectedLines]);

    // Dynamic weights based on zoom
    const visWeight = zoomLevel <= 10 ? 1 : 2;
    const invWeight = zoomLevel <= 10 ? 0.5 : 1;

    return (
        <>
            {/* Invisible Roads (Unselected) */}
            {invisibleLines.map((line) => {
                return (
                    <React.Fragment key={`inv-${line.id}`}>
                        {/* Visible Line (Non-interactive) */}
                        <Polyline
                            positions={line.positions}
                            pathOptions={{
                                color: '#999',
                                weight: invWeight,
                                opacity: 0.4,
                                dashArray: '2, 6',
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'railroads'
                            }}
                            interactive={false}
                        />
                        {/* Hit Box Line (Transparent, Thicker, Top-most interaction) */}
                        <Polyline
                            positions={line.positions}
                            pathOptions={{
                                stroke: true,
                                color: '#000',
                                weight: 20,
                                opacity: 0.0,
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'railroad-interact'
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    onRailroadClick(line.id);
                                },
                                mouseover: (e) => {
                                    onRailroadHover(line.id);
                                    e.target.openTooltip();
                                },
                                mouseout: (e) => {
                                    onRailroadHover(null);
                                    e.target.closeTooltip();
                                }
                            }}
                        >
                            <Tooltip sticky pane="top-tooltips" offset={[0, -10]} direction="top">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold' }}>{line.name}</div>
                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{line.company}</div>
                                </div>
                            </Tooltip>
                        </Polyline>
                    </React.Fragment>
                );
            })}

            {/* Visible Roads (Selected) */}
            {visibleLines.map((line) => {
                const isActive = activeLine === line.id;
                return (
                    <React.Fragment key={`vis-${line.id}`}>
                        {/* Active Line Glow Outline - 강조색 테두리 */}
                        {isActive && (
                            <Polyline
                                positions={line.positions}
                                pathOptions={{
                                    color: line.color,
                                    weight: zoomLevel <= 10 ? 8 : 14,
                                    opacity: 0.35,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    pane: 'railroads'
                                }}
                                interactive={false}
                            />
                        )}
                        {/* Visible Line (Non-interactive) */}
                        <Polyline
                            positions={line.positions}
                            pathOptions={{
                                color: line.color,
                                weight: visWeight,
                                opacity: 1.0,
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'railroads'
                            }}
                            interactive={false}
                        />
                        {/* Hit Box Line */}
                        <Polyline
                            positions={line.positions}
                            pathOptions={{
                                stroke: true,
                                color: line.color,
                                weight: 20,
                                opacity: 0.0,
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'railroad-interact'
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    onRailroadClick(line.id);
                                },
                                mouseover: (e) => {
                                    onRailroadHover(line.id);
                                    e.target.openTooltip();
                                },
                                mouseout: (e) => {
                                    onRailroadHover(null);
                                    e.target.closeTooltip();
                                }
                            }}
                        >
                            <Tooltip sticky pane="top-tooltips" offset={[0, -10]} direction="top">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold' }}>{line.name}</div>
                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{line.company}</div>
                                    {line.endpoints && <div style={{ fontSize: '0.7em', color: '#888' }}>({line.endpoints})</div>}
                                </div>
                            </Tooltip>
                        </Polyline>
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default React.memo(RailroadLayer);

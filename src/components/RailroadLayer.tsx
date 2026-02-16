import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getOfficialColor } from '../lib/lineColors';

interface RailroadLayerProps {
    railroadNetwork: any;
    selectedLines: string[];
    hoveredLine: string | null;
    onRailroadClick: (lineId: string) => void;
    onRailroadHover: (lineId: string | null) => void;
    zoomLevel: number;
}

const RailroadLayer: React.FC<RailroadLayerProps> = ({
    railroadNetwork,
    selectedLines,
    hoveredLine,
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
                    edges: route.edges,
                    endpoints: endpointsStr
                });
            } else {
                invisible.push({
                    id: fullId,
                    name: route.line,
                    company: route.company,
                    color: '#ccc',
                    edges: route.edges,
                    endpoints: '' // Skip calculation
                });
            }
        });

        return { invisibleLines: invisible, visibleLines: visible };
    }, [railroadNetwork, selectedLines, getColor]);

    // Dynamic weights based on zoom
    const { visWeight, invWeight } = useMemo(() => {
        let vis = 2; // Original 4 -> 2
        let inv = 1; // Original 2 -> 1
        if (zoomLevel <= 10) {
            vis = 1;
            inv = 0.5;
        }
        return { visWeight: vis, invWeight: inv };
    }, [zoomLevel]);

    return (
        <>
            {/* Invisible Roads (Unselected) */}
            {invisibleLines.map((line) => (
                <React.Fragment key={`inv-${line.id}`}>
                    {line.edges.map((edge: any, idx: number) => {
                        const positions = edge.geometry.map((c: any) => [c[1], c[0]]);
                        return (
                            <React.Fragment key={`inv-edge-group-${line.id}-${idx}`}>
                                {/* Visible Line (Non-interactive) */}
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        color: '#ccc',
                                        weight: invWeight,
                                        opacity: 0.5,
                                        dashArray: '5, 10',
                                        lineCap: 'round',
                                        lineJoin: 'round'
                                    }}
                                    interactive={false}
                                />
                                {/* Hit Box Line (Transparent, Thicker, Interactive) */}
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        stroke: true,
                                        color: '#000', // Color doesn't matter if opacity is 0, but needed for hit test in some renderers?
                                        weight: Math.max(15, invWeight * 5), // Thicker hit area
                                        opacity: 0.0,
                                        lineCap: 'round',
                                        lineJoin: 'round'
                                    }}
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e);
                                            onRailroadClick(line.id);
                                        },
                                        mouseover: (e) => {
                                            onRailroadHover(line.id);
                                            // No style change, just hover state for tooltip
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
                </React.Fragment>
            ))}

            {/* Visible Roads (Selected) */}
            {visibleLines.map((line) => (
                <React.Fragment key={`vis-${line.id}`}>
                    {line.edges.map((edge: any, idx: number) => {
                        const positions = edge.geometry.map((c: any) => [c[1], c[0]]);
                        return (
                            <React.Fragment key={`vis-edge-group-${line.id}-${idx}`}>
                                {/* Visible Line (Non-interactive) */}
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        color: line.color,
                                        weight: visWeight,
                                        opacity: 1.0,
                                        lineCap: 'round',
                                        lineJoin: 'round'
                                    }}
                                    interactive={false}
                                />
                                {/* Hit Box Line */}
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        stroke: true,
                                        color: line.color,
                                        weight: Math.max(15, visWeight * 4),
                                        opacity: 0.0, // Invisible hit box
                                        lineCap: 'round',
                                        lineJoin: 'round'
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
                </React.Fragment>
            ))}

            {/* Hover Highlight Removed as requested */}
        </>
    );
};

export default React.memo(RailroadLayer);

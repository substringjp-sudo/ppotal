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

            // Calculate endpoints (Degree 1 nodes)
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
            // Should usually be 2, but for loop lines it might be 0, for branched lines > 2
            const endpointsStr = terminals.length > 0 ? terminals.join(' ↔ ') : 'Loop / Complex';

            const lineData = {
                id: fullId,
                name: route.line,
                company: route.company,
                color: getColor(fullId),
                edges: route.edges,
                endpoints: endpointsStr
            };

            if (isSelected) {
                visible.push(lineData);
            } else {
                invisible.push(lineData);
            }
        });

        return { invisibleLines: invisible, visibleLines: visible };
    }, [railroadNetwork, selectedLines]);

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
                    {line.edges.map((edge: any, idx: number) => (
                        <Polyline
                            key={`inv-edge-${line.id}-${idx}`}
                            positions={edge.geometry.map((c: any) => [c[1], c[0]])}
                            pathOptions={{
                                color: '#ccc',
                                weight: invWeight,
                                opacity: 0.5,
                                dashArray: '5, 10',
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
                                    e.target.setStyle({ color: '#999', weight: invWeight * 2, opacity: 0.8 });
                                },
                                mouseout: (e) => {
                                    onRailroadHover(null);
                                    e.target.setStyle({ color: '#ccc', weight: invWeight, opacity: 0.5 });
                                }
                            }}
                        >
                            <Tooltip sticky pane="top-tooltips" offset={[20, -20]} direction="top">
                                {line.company} {line.name} ({line.endpoints})
                            </Tooltip>
                        </Polyline>
                    ))}
                </React.Fragment>
            ))}

            {/* Visible Roads (Selected) */}
            {visibleLines.map((line) => (
                <React.Fragment key={`vis-${line.id}`}>
                    {line.edges.map((edge: any, idx: number) => (
                        <Polyline
                            key={`vis-edge-${line.id}-${idx}`}
                            positions={edge.geometry.map((c: any) => [c[1], c[0]])}
                            pathOptions={{
                                color: line.color,
                                weight: visWeight,
                                opacity: 1.0,
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
                                    e.target.setStyle({ weight: visWeight * 1.5, opacity: 1.0 });
                                },
                                mouseout: (e) => {
                                    onRailroadHover(null);
                                    e.target.setStyle({ weight: visWeight, opacity: 1.0 });
                                }
                            }}
                        >
                            <Tooltip sticky pane="top-tooltips" offset={[20, -20]} direction="top">
                                {line.company} {line.name} ({line.endpoints})
                            </Tooltip>
                        </Polyline>
                    ))}
                </React.Fragment>
            ))}

            {/* Hover Effect Layer (Optional: separate outline if needed, but setStyle in eventHandlers is efficient enough for now) */}
            {/* If we strictly follow "Hover Road: ... connected railroad whole border highlighted", 
                 we might need a separate layer that renders ON TOP when hoveredLine is set. 
                 Let's add that for the "whole line border" requirement.
             */}
            {hoveredLine && (() => {
                // Find the line data
                const route = railroadNetwork.routes.find((r: any) => `${r.company}::${r.line}` === hoveredLine);
                if (!route) return null;

                // Render a thick outlines/highlight for the WHOLE line
                return (
                    <React.Fragment key={`hover-highlight-${hoveredLine}`}>
                        {route.edges.map((edge: any, idx: number) => (
                            <Polyline
                                key={`hover-edge-${idx}`}
                                positions={edge.geometry.map((c: any) => [c[1], c[0]])}
                                pathOptions={{
                                    color: '#FFD700', // Gold highlight
                                    weight: 8,
                                    opacity: 0.4,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    className: 'blinking-highlight' // We can add CSS animation if we want
                                }}
                                interactive={false} // Pass through to underlying line
                            />
                        ))}
                    </React.Fragment>
                );
            })()}
        </>
    );
};

export default React.memo(RailroadLayer);

"use client";

import React, { useMemo, useRef } from 'react';
import { StationNode } from '../lib/graphUtils';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';

interface LineDetailPaneProps {
    lineId: string;
    segments: { stations: string[], edges: { from: string, to: string, distance: number }[] }[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>; // Set of edge keys like "stationId1<->stationId2"
    selectedLines: string[];
    onRecordTrip?: (trip: any) => void;
    getShortestPath?: (start: string, end: string, lines: string[]) => any;
    onStationClick?: (stationName: string) => void;
    onStationClick?: (stationName: string) => void;
    onClose: () => void;
    language: Language;
}

interface StationPos {
    id: string;
    x: number;
    y: number;
}

const LineDetailPane: React.FC<LineDetailPaneProps> = ({
    lineId, segments, nodes, visitedEdges, selectedLines, onRecordTrip, getShortestPath, onClose, onStationClick, language
}) => {
    const [company, lineName] = lineId.split('::');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [dragStart, setDragStart] = React.useState<string | null>(null);
    const [dragHover, setDragHover] = React.useState<string | null>(null);
    const [dragPathPreview, setDragPathPreview] = React.useState<Set<string>>(new Set());
    const [viewport, setViewport] = React.useState({ left: 0, width: 0, totalWidth: 1 });
    const [isMiniMapDragging, setIsMiniMapDragging] = React.useState(false);

    const miniMapRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleScroll = () => {
            if (scrollRef.current) {
                setViewport({
                    left: scrollRef.current.scrollLeft,
                    width: scrollRef.current.clientWidth,
                    totalWidth: scrollRef.current.scrollWidth
                });
            }
        };
        const ref = scrollRef.current;
        if (ref) {
            ref.addEventListener('scroll', handleScroll);
            handleScroll();
            // Also handle resize
            window.addEventListener('resize', handleScroll);
        }
        return () => {
            ref?.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [segments]); // Re-sync when segments change

    const getEdgeKey = (s1: string, s2: string) => [s1, s2].sort().join('<->');

    const visitedLogicalEdges = useMemo(() => {
        const set = new Set<string>();
        visitedEdges.forEach(key => {
            const [id1, id2] = key.split('<->');
            const n1 = nodes.get(id1)?.name;
            const n2 = nodes.get(id2)?.name;
            if (n1 && n2 && n1 !== n2) {
                set.add([n1, n2].sort().join('<->'));
            }
        });
        return set;
    }, [visitedEdges, nodes]);

    const stats = useMemo(() => {
        let total = 0;
        let visited = 0;
        const visitedStations = new Set<string>();

        const getName = (id: string) => nodes.get(id)?.name || id;

        segments.forEach((segment) => {
            segment.edges.forEach((edge) => {
                total += edge.distance;
                const logicalKey = [getName(edge.from), getName(edge.to)].sort().join('<->');

                if (visitedLogicalEdges.has(logicalKey)) {
                    visited += edge.distance;
                    visitedStations.add(edge.from);
                    visitedStations.add(edge.to);
                }
            });
        });

        return {
            total: Math.round(total * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: total > 0 ? Math.round((visited / total) * 100) : 0,
            visitedStations
        };
    }, [segments, visitedLogicalEdges, nodes]);

    // Simple layout logic for branching
    const layout = useMemo(() => {
        const rows: StationPos[][] = [];
        const stationToX = new Map<string, number>();

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const rowData: StationPos[] = [];

            // Find connection to previous rows
            let startX = 0;
            if (i > 0) {
                for (const sid of segment.stations) {
                    if (stationToX.has(sid)) {
                        startX = stationToX.get(sid)! - segment.stations.indexOf(sid);
                        break;
                    }
                }
            }

            segment.stations.forEach((sid, idx) => {
                const x = startX + idx;
                rowData.push({ id: sid, x, y: i });
                if (!stationToX.has(sid)) {
                    stationToX.set(sid, x);
                }
            });
            rows.push(rowData);
        }

        let minX = Infinity;
        let maxX = -Infinity;
        rows.forEach((row) => row.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
        }));

        return { rows, minX, maxX };
    }, [segments]);

    const scrollToStation = (x: number) => {
        if (scrollRef.current) {
            const containerWidth = scrollRef.current.clientWidth;
            const targetX = (x - layout.minX) * 120 + 40;
            scrollRef.current.scrollTo({
                left: targetX - containerWidth / 2,
                behavior: 'smooth'
            });
        }
    };

    const handleMiniMapInteraction = (e: React.MouseEvent | MouseEvent) => {
        if (!miniMapRef.current || !scrollRef.current) return;
        const rect = miniMapRef.current.getBoundingClientRect();
        const padding = 10; // 4% horizontal margin used in dots
        const mapWidth = rect.width - (padding * 2);
        const mouseX = Math.max(0, Math.min(mapWidth, e.clientX - rect.left - padding));
        const scrollRatio = mouseX / mapWidth;

        scrollRef.current.scrollLeft = scrollRatio * scrollRef.current.scrollWidth - scrollRef.current.clientWidth / 2;
    };

    const handleStationMouseDown = (id: string) => {
        setDragStart(id);
        setDragHover(null);
    };

    const handleStationMouseEnter = (id: string) => {
        if (dragStart) {
            setDragHover(id);
            // Path preview calculation
            if (getShortestPath) {
                const startNode = nodes.get(dragStart);
                const endNode = nodes.get(id);
                if (startNode && endNode) {
                    const pathData = getShortestPath(startNode.name, endNode.name, selectedLines);
                    if (pathData && pathData.path) {
                        setDragPathPreview(new Set(pathData.path));
                    }
                }
            }
        }
    };

    React.useEffect(() => {
        if (isMiniMapDragging) {
            const handleMouseMove = (e: MouseEvent) => handleMiniMapInteraction(e);
            const handleGlobalMouseUp = () => setIsMiniMapDragging(false);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleGlobalMouseUp);
            };
        }
    }, [isMiniMapDragging]);

    const handleMouseUp = () => {
        if (isMiniMapDragging) {
            setIsMiniMapDragging(false);
            return;
        }

        if (dragStart && dragHover && dragStart !== dragHover) {
            // ... (keep existing recording logic)
            if (onRecordTrip && getShortestPath) {
                const startNode = nodes.get(dragStart) as any;
                const endNode = nodes.get(dragHover) as any;
                if (startNode && endNode) {
                    const pathData = getShortestPath(startNode.name, endNode.name, selectedLines);
                    if (pathData) {
                        onRecordTrip({
                            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                            start: startNode.name,
                            end: endNode.name,
                            ...pathData
                        });
                    }
                }
            }
        }
        setDragStart(null);
        setDragHover(null);
        setDragPathPreview(new Set());
    };

    const paneHeight = Math.min(550, 240 + (layout.rows.length * 90));

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${paneHeight}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '2px solid #ddd',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            padding: '15px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease-in-out'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                gap: '20px'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>{translateName(company, language, 'company')}</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{translateName(lineName, language, 'line')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#444', fontWeight: 'bold' }}>
                            {stats.visited}km / {stats.total}km
                        </div>
                        <div style={{
                            width: '120px',
                            height: '6px',
                            backgroundColor: '#eee',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            display: 'flex'
                        }}>
                            <div style={{
                                width: `${stats.percent}%`,
                                height: '100%',
                                backgroundColor: '#27ae60',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{ fontSize: '14px', color: '#27ae60', fontWeight: '800' }}>
                            {stats.percent}%
                        </div>
                    </div>
                </div>

                {/* Enhanced Mini-map */}
                <div
                    ref={miniMapRef}
                    onMouseDown={(e) => {
                        setIsMiniMapDragging(true);
                        handleMiniMapInteraction(e);
                    }}
                    style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 10px)',
                        right: '25px',
                        width: '240px',
                        height: '110px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid #ccc',
                        borderRadius: '10px',
                        padding: '8px',
                        zIndex: 1200,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        userSelect: 'none',
                        cursor: 'crosshair'
                    }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', marginBottom: '6px', textAlign: 'center', letterSpacing: '0.05em' }}>NAVIGATOR</div>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#fdfdfd', borderRadius: '4px', border: '1px solid #eee' }}>
                        {/* Render Lines in Mini-map */}
                        {layout.rows.map((row: StationPos[], rIdx: number) => (
                            <React.Fragment key={`mini-edges-${rIdx}`}>
                                {row.map((pos: StationPos, pIdx: number) => {
                                    if (pIdx === row.length - 1) return null;
                                    const nextPos = row[pIdx + 1];
                                    const getName = (id: string) => nodes.get(id)?.name || id;
                                    const logicalKey = [getName(pos.id), getName(nextPos.id)].sort().join('<->');
                                    const isVisited = visitedLogicalEdges.has(logicalKey);
                                    return (
                                        <div
                                            key={`mini-edge-${rIdx}-${pIdx}`}
                                            style={{
                                                position: 'absolute',
                                                left: `${((pos.x - layout.minX) / (layout.maxX - layout.minX + 1 || 1)) * 100 + 4}%`,
                                                top: `${(pos.y / (layout.rows.length || 1)) * 80 + 10}%`,
                                                width: `${((nextPos.x - pos.x) / (layout.maxX - layout.minX + 1 || 1)) * 100}%`,
                                                height: '2px',
                                                backgroundColor: isVisited ? '#27ae60' : '#e0e0e0',
                                                transform: 'translateY(-50%)',
                                                zIndex: 1
                                            }}
                                        />
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Viewport Indicator */}
                        <div style={{
                            position: 'absolute',
                            left: `${(viewport.left / viewport.totalWidth) * 100}%`,
                            width: `${(viewport.width / viewport.totalWidth) * 100}%`,
                            top: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            border: '1.5px solid #3498db',
                            borderRadius: '2px',
                            zIndex: 2,
                            pointerEvents: 'none'
                        }} />

                        {/* Station Dots in Mini-map */}
                        {layout.rows.map((row: StationPos[], rIdx: number) => (
                            <React.Fragment key={`mini-row-${rIdx}`}>
                                {row.map((pos: StationPos, pIdx: number) => (
                                    <div
                                        key={`mini-dot-${pos.id}-${rIdx}-${pIdx}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const name = nodes.get(pos.id)?.name;
                                            if (name) onStationClick?.(name);
                                            scrollToStation(pos.x);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: `${((pos.x - layout.minX) / (layout.maxX - layout.minX + 1 || 1)) * 100 + 4}%`,
                                            top: `${(pos.y / (layout.rows.length || 1)) * 80 + 10}%`,
                                            width: '5px',
                                            height: '5px',
                                            borderRadius: '50%',
                                            backgroundColor: stats.visitedStations.has(pos.id) ? '#27ae60' : '#e0e0e0',
                                            cursor: 'pointer',
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 3,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}
                                        title={nodes.get(pos.id)?.name || pos.id}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                    position: 'relative',
                    minHeight: '140px',
                    userSelect: 'none'
                }}>
                <div style={{
                    position: 'relative',
                    width: `${(layout.maxX - layout.minX + 1) * 120}px`,
                    height: `${layout.rows.length * 90}px`,
                    margin: '0 auto'
                }}>
                    {/* Render Edges first */}
                    {layout.rows.map((row: StationPos[], rIdx: number) => {
                        return (
                            <React.Fragment key={`edges-${rIdx}`}>
                                {row.map((pos: StationPos, pIdx: number) => {
                                    if (pIdx === row.length - 1) return null;
                                    const nextPos = row[pIdx + 1];

                                    // Check if this edge exists in the segment
                                    const getName = (id: string) => nodes.get(id)?.name || id;
                                    const logicalKey = [getName(pos.id), getName(nextPos.id)].sort().join('<->');
                                    const isVisited = visitedLogicalEdges.has(logicalKey);
                                    const isPreview = dragPathPreview.has(pos.id) && dragPathPreview.has(nextPos.id);

                                    return (
                                        <div
                                            key={`edge-${rIdx}-${pIdx}`}
                                            style={{
                                                position: 'absolute',
                                                left: `${(pos.x - layout.minX) * 120 + 40}px`,
                                                top: `${pos.y * 90 + 20}px`,
                                                width: `${(nextPos.x - pos.x) * 120}px`,
                                                height: '4px',
                                                backgroundColor: isPreview ? '#FF00FF' : (isVisited ? '#27ae60' : '#ddd'),
                                                boxShadow: isPreview ? '0 0 10px #FF00FF' : 'none',
                                                zIndex: isPreview ? 2 : 1,
                                                transition: 'all 0.4s ease'
                                            }}
                                        />
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}

                    {/* Render Junction Connections */}
                    {layout.rows.map((row: StationPos[], rIdx: number) => {
                        if (rIdx === 0) return null;

                        // Find where this row connects to a previous row
                        let junctionInCurrent = -1;
                        let junctionX = -1;
                        let junctionParentY = -1;

                        for (let j = 0; j < row.length; j++) {
                            const sid = row[j].id;
                            // Search in previous rows
                            for (let prevR = 0; prevR < rIdx; prevR++) {
                                const found: StationPos | undefined = layout.rows[prevR].find((p: StationPos) => p.id === sid);
                                if (found) {
                                    junctionInCurrent = j;
                                    junctionX = row[j].x;
                                    junctionParentY = found.y;
                                    break;
                                }
                            }
                            if (junctionInCurrent !== -1) break;
                        }

                        if (junctionInCurrent !== -1) {
                            return (
                                <div
                                    key={`junction-${rIdx}`}
                                    style={{
                                        position: 'absolute',
                                        left: `${(junctionX - layout.minX) * 120 + 38}px`,
                                        top: `${junctionParentY * 90 + 25}px`,
                                        width: '4px',
                                        height: `${(rIdx - junctionParentY) * 90}px`,
                                        backgroundColor: '#ddd',
                                        zIndex: 0,
                                        borderLeft: '2px dashed #bbb'
                                    }}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Render Stations */}
                    {layout.rows.map((row: StationPos[], rIdx: number) => (
                        <React.Fragment key={`stations-${rIdx}`}>
                            {row.map((pos: StationPos, pIdx: number) => {
                                const node = nodes.get(pos.id);
                                const name = node ? node.name : pos.id.split('::').pop();
                                const isVisited = stats.visitedStations.has(pos.id);
                                const isDragging = dragStart === pos.id;
                                const isDragTarget = dragHover === pos.id;
                                const isPreview = dragPathPreview.has(pos.id);

                                return (
                                    <div
                                        key={`node-${rIdx}-${pIdx}`}
                                        onMouseDown={() => handleStationMouseDown(pos.id)}
                                        onMouseEnter={() => handleStationMouseEnter(pos.id)}
                                        onClick={(e) => {
                                            if (dragStart === pos.id && !dragHover) {
                                                const name = nodes.get(pos.id)?.name;
                                                if (name) onStationClick?.(name);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: `${(pos.x - layout.minX) * 120 + 20}px`,
                                            top: `${pos.y * 90 + 14}px`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            width: '40px',
                                            zIndex: 3,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: isDragging || isDragTarget ? '16px' : '12px',
                                            height: isDragging || isDragTarget ? '16px' : '12px',
                                            borderRadius: '50%',
                                            backgroundColor: isPreview ? '#FF00FF' : (isVisited ? '#27ae60' : '#e0e0e0'),
                                            border: '2px solid #fff',
                                            boxShadow: isPreview
                                                ? '0 0 15px #FF00FF, 0 0 0 1px #FF00FF'
                                                : (isVisited
                                                    ? '0 0 10px rgba(39, 174, 96, 0.5), 0 0 0 1px #27ae60'
                                                    : '0 0 0 1px #ccc'),
                                            marginBottom: '6px',
                                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            transform: isDragging || isDragTarget ? 'scale(1.2)' : 'scale(1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {isVisited && !isDragging && !isDragTarget && (
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#fff' }} />
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: isVisited || isDragging || isDragTarget ? 'bold' : 'normal',
                                            color: isVisited ? '#186A3B' : '#888',
                                            textAlign: 'center',
                                            whiteSpace: 'normal',
                                            width: '80px',
                                            lineHeight: '1.2',
                                            transition: 'all 0.2s'
                                        }}>{translateName(name || '', language, 'station')}</span>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LineDetailPane;

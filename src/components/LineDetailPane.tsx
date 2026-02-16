"use client";

import React, { useMemo, useRef } from 'react';
import { StationNode } from '../lib/graphUtils';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';
import TubeMap from './TubeMap';

interface LineDetailPaneProps {
    lineId: string;
    segments: { stations: string[], edges: { from: string, to: string, distance: number }[] }[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>; // Set of edge keys like "stationId1<->stationId2"
    selectedLines: string[];
    onRecordTrip?: (trip: any) => void;
    getShortestPath?: (start: string, end: string, lines: string[]) => any;
    onStationClick?: (stationName: string) => void;
    onClose: () => void;
    language: Language;
    onToggleLine?: (lineId: string) => void;
}

const LineDetailPane: React.FC<LineDetailPaneProps> = ({
    lineId, segments, nodes, visitedEdges, selectedLines, onClose, onStationClick, language, onToggleLine,
    getShortestPath, onRecordTrip
}) => {
    const [company, lineName] = lineId.split('::');
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Dynamic Topology Generation from Graph Data ---
    const generatedTopologies = useMemo(() => {
        if (!segments || segments.length === 0) return [];

        let unprocessedSegments = [...segments];
        const topologies: Array<{
            type: string;
            main_line: string[];
            branches: Array<{ junction: string, path: string[] }>;
        }> = [];

        while (unprocessedSegments.length > 0) {
            // 1. Sort remaining segments by length logic
            unprocessedSegments.sort((a, b) => b.stations.length - a.stations.length);
            const mainSegment = unprocessedSegments[0];

            // Remove main segment from pool
            unprocessedSegments.shift();

            const mainLine = mainSegment.stations;
            const processedStations = new Set<string>(mainLine);
            const branches: Array<{ junction: string, path: string[] }> = [];

            // 2. Iteratively attach remaining segments as branches
            let changed = true;
            while (changed) {
                changed = false;
                const nextUnprocessed: typeof segments = [];

                for (const seg of unprocessedSegments) {
                    const stations = seg.stations;
                    if (stations.length === 0) continue;

                    const startNode = stations[0];
                    const endNode = stations[stations.length - 1];

                    const startConnected = processedStations.has(startNode);
                    const endConnected = processedStations.has(endNode);

                    if (startConnected) {
                        const path = stations.slice(1);
                        if (path.length > 0) {
                            branches.push({ junction: startNode, path });
                            path.forEach(s => processedStations.add(s));
                            changed = true;
                        }
                    } else if (endConnected) {
                        const path = stations.slice(0, stations.length - 1).reverse();
                        if (path.length > 0) {
                            branches.push({ junction: endNode, path });
                            path.forEach(s => processedStations.add(s));
                            changed = true;
                        }
                    } else {
                        nextUnprocessed.push(seg);
                    }
                }
                unprocessedSegments = nextUnprocessed;
            }

            topologies.push({
                type: 'generated',
                main_line: mainLine,
                branches
            });
        }

        return topologies;
    }, [segments]);

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

    // --- Stats Calculation ---
    const stats = useMemo(() => {
        let total = 0;
        let visited = 0;
        const visitedStations = new Set<string>();

        const getName = (id: string) => nodes.get(id)?.name || id;

        if (segments) {
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
        }

        return {
            total: Math.round(total * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: total > 0 ? Math.round((visited / total) * 100) : 0,
            visitedStations
        };
    }, [segments, visitedLogicalEdges, nodes]);

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '60vh',
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
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => onToggleLine && onToggleLine(lineId)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid #3498db',
                            backgroundColor: selectedLines.includes(lineId) ? '#3498db' : 'transparent',
                            color: selectedLines.includes(lineId) ? '#fff' : '#3498db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'all 0.2s'
                        }}
                        title={selectedLines.includes(lineId) ? "Hide Line" : "Show Line"}
                    >
                        {selectedLines.includes(lineId) ? '✓' : ''}
                    </button>

                    <div>
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
                </div>

                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    ×
                </button>
            </div>

            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                    position: 'relative',
                    minHeight: '140px',
                    userSelect: 'none'
                }}>

                {generatedTopologies && generatedTopologies.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {generatedTopologies.map((topology, idx) => (
                            <div key={idx}>
                                {generatedTopologies.length > 1 && (
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>
                                        Section {idx + 1}
                                    </h4>
                                )}
                                <TubeMap
                                    lineId={lineId}
                                    topology={topology}
                                    nodes={nodes}
                                    visitedStations={stats.visitedStations}
                                    visitedEdges={visitedEdges}
                                    onStationClick={onStationClick}
                                    language={language}
                                    onPathCreate={(start, end) => {
                                        if (getShortestPath && onRecordTrip) {
                                            // Ensure we stay on the current line if possible? 
                                            // The user is in Line Detail, so they probably want to record on this line.
                                            // Passing [lineId] as restriction might be good, but users might drag across branches?
                                            // The `selectedLines` prop might be better.
                                            // Actually, `activeLine` context is usually implies focusing on one line.
                                            // Let's pass `selectedLines` combined with current line if needed, 
                                            // but `getShortestPath` usually takes an array of allowed lines.

                                            // If we just pass the current lineId, we ensure the path stays on this line 
                                            // (which is what Line Detail is for).

                                            const pathData = getShortestPath(start, end, [lineId]);
                                            // If pathData is null, maybe try with all lines?
                                            // But for LineDetail, restricting to lineId is safer to avoid jumping to other lines.

                                            if (pathData) {
                                                onRecordTrip({
                                                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                    start,
                                                    end,
                                                    ...pathData
                                                });
                                            }
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                        Processing Line Topology...
                    </div>
                )}
            </div>
        </div>
    );
};

export default LineDetailPane;

"use client";

import React, { useMemo } from 'react';
import { StationNode } from '../lib/graphUtils';

interface LineDetailPaneProps {
    lineId: string;
    segments: { stations: string[], edges: { from: string, to: string, distance: number }[] }[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>; // Set of edge keys like "stationId1<->stationId2"
    onClose: () => void;
}

interface StationPos {
    id: string;
    x: number;
    y: number;
}

const LineDetailPane: React.FC<LineDetailPaneProps> = ({ lineId, segments, nodes, visitedEdges, onClose }) => {
    const [company, lineName] = lineId.split('::');

    const getEdgeKey = (u: string, v: string) => [u, v].sort().join('<->');

    const stats = useMemo(() => {
        let total = 0;
        let visited = 0;

        segments.forEach(segment => {
            segment.edges.forEach(edge => {
                total += edge.distance;
                const edgeKey = [edge.from, edge.to].sort().join('<->');
                if (visitedEdges.has(edgeKey)) {
                    visited += edge.distance;
                }
            });
        });

        const percent = total > 0 ? (visited / total) * 100 : 0;
        return {
            total: Math.round(total * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: Math.round(percent * 10) / 10
        };
    }, [segments, visitedEdges]);

    const layout = useMemo(() => {
        if (segments.length === 0) return { rows: [], minX: 0, maxX: 0 };

        const stationToX = new Map<string, number>();
        const rows: StationPos[][] = [];

        // Main segment
        const mainSegment = segments[0];
        const firstRow: StationPos[] = [];
        mainSegment.stations.forEach((sid, idx) => {
            stationToX.set(sid, idx);
            firstRow.push({ id: sid, x: idx, y: 0 });
        });
        rows.push(firstRow);

        // Subsequent segments
        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            let junctionIdx = -1;
            let junctionX = -1;

            // Find first station that is already positioned to use as anchor
            for (let j = 0; j < segment.stations.length; j++) {
                if (stationToX.has(segment.stations[j])) {
                    junctionIdx = j;
                    junctionX = stationToX.get(segment.stations[j])!;
                    break;
                }
            }

            const rowData: StationPos[] = [];
            let startX = 0;
            if (junctionIdx !== -1) {
                startX = junctionX - junctionIdx;
            } else {
                // No junction? Place at the end of previous max X + some gap
                let currentMaxX = 0;
                stationToX.forEach(x => currentMaxX = Math.max(currentMaxX, x));
                startX = currentMaxX + 2;
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
        rows.forEach((row: StationPos[]) => row.forEach((p: StationPos) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
        }));

        return { rows, minX, maxX };
    }, [segments]);

    const paneHeight = Math.min(400, 160 + (layout.rows.length * 90));

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>{company}</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{lineName}</span>
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
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#999',
                        marginTop: '-5px'
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px',
                position: 'relative',
                minHeight: '140px'
            }}>
                <div style={{
                    position: 'relative',
                    width: `${(layout.maxX - layout.minX + 1) * 120}px`,
                    height: `${layout.rows.length * 90}px`,
                    margin: '0 auto'
                }}>
                    {/* Render Edges first */}
                    {layout.rows.map((row: StationPos[], rIdx: number) => {
                        const segment = segments[rIdx];
                        return (
                            <React.Fragment key={`edges-${rIdx}`}>
                                {row.map((pos: StationPos, pIdx: number) => {
                                    if (pIdx === row.length - 1) return null;
                                    const nextPos = row[pIdx + 1];

                                    // Check if this edge exists in the segment
                                    const edgeKey = getEdgeKey(pos.id, nextPos.id);
                                    const isVisited = visitedEdges.has(edgeKey);

                                    return (
                                        <div
                                            key={`edge-${rIdx}-${pIdx}`}
                                            style={{
                                                position: 'absolute',
                                                left: `${(pos.x - layout.minX) * 120 + 40}px`,
                                                top: `${pos.y * 90 + 20}px`,
                                                width: `${(nextPos.x - pos.x) * 120}px`,
                                                height: '4px',
                                                backgroundColor: isVisited ? '#27ae60' : '#ddd',
                                                zIndex: 1,
                                                transition: 'background-color 0.4s ease'
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
                        const segment = segments[rIdx];
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

                                return (
                                    <div
                                        key={`node-${rIdx}-${pIdx}`}
                                        style={{
                                            position: 'absolute',
                                            left: `${(pos.x - layout.minX) * 120 + 20}px`,
                                            top: `${pos.y * 90 + 14}px`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            width: '40px',
                                            zIndex: 2
                                        }}
                                    >
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: '#3498db',
                                            border: '2px solid #fff',
                                            boxShadow: '0 0 0 1px #3498db',
                                            marginBottom: '6px'
                                        }} />
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            whiteSpace: 'normal',
                                            width: '80px',
                                            lineHeight: '1.2'
                                        }}>{name}</span>
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

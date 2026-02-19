"use client";

import React, { useMemo, useRef } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import TubeMap from './TubeMap';
import { useLineTopology } from '../hooks/useLineTopology';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../lib/railwayData';
import { Trip } from '../types/trip';
import { getOfficialColor } from '../lib/lineColors';

interface LineDetailPaneProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    selectedLines: string[];
    onRecordTrip?: (trip: Trip) => void;
    getShortestPath?: (start: string, end: string, lines: string[]) => { path: string[], distance: number, geometries: [number, number][][] } | null;
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
    const lineColor = useMemo(() => getOfficialColor(lineId) || '#3498db', [lineId]);

    // --- Stats Calculation ---
    const stats = useMemo(() => {
        let total = 0;
        let visited = 0;
        const visitedStationsSet = new Set<string>();

        if (segments) {
            segments.forEach((segment) => {
                segment.edges.forEach((edge) => {
                    total += edge.distance;
                    const edgeKey = [edge.from, edge.to].sort().join('<->');

                    if (visitedEdges.has(edgeKey)) {
                        visited += edge.distance;
                        visitedStationsSet.add(edge.from);
                        visitedStationsSet.add(edge.to);
                    }
                });
            });
        }

        return {
            total: Math.round(total * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: total > 0 ? Math.round((visited / total) * 100) : 0,
            visitedStations: visitedStationsSet
        };
    }, [segments, visitedEdges]);

    // Calculate topology data using the hook
    const topology = useLineTopology(lineId, segments, nodes, stats.visitedStations, visitedEdges);

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '70vh',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '24px'
            }}>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => {
                            onToggleLine && onToggleLine(lineId);
                        }}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            border: '1px solid #eee',
                            backgroundColor: selectedLines.includes(lineId) ? '#3498db' : '#f8f9fa',
                            color: selectedLines.includes(lineId) ? '#fff' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                        title={selectedLines.includes(lineId) ? "Hide Line" : "Show Line"}
                    >
                        {selectedLines.includes(lineId) ? '✓' : '+'}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span style={{ fontSize: '14px', color: '#888', fontWeight: '600', letterSpacing: '0.05em' }}>{company}</span>
                            <span style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>{lineName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', opacity: 0.6 }}>
                            <span style={{ fontSize: '11px', fontWeight: '500' }}>{COMPANY_EN_NAMES[company] || company}</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{LINE_EN_NAMES[lineName] || lineName}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Completion</div>
                            <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: '900' }}>
                                {stats.visited} <span style={{ fontSize: '11px', color: '#888' }}>/ {stats.total} km</span>
                            </div>
                        </div>
                        <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27ae60" strokeWidth="3" strokeDasharray={`${stats.percent}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: '900', color: '#27ae60' }}>
                                {stats.percent}%
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        onClose();
                        trackEvent('close_line_detail', 'ui_interaction', lineId);
                    }}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#f1f2f6',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: '400px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                <TubeMap
                    nodes={topology.nodes}
                    edges={topology.edges}
                    visitedStations={stats.visitedStations}
                    visitedEdges={visitedEdges}
                    lineColor={lineColor}
                    onStationClick={onStationClick}
                    language={language}
                    onPathCreate={(start, end) => {
                        if (getShortestPath && onRecordTrip) {
                            const pathData = getShortestPath(start, end, [lineId]);
                            if (pathData) {
                                onRecordTrip({
                                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    start,
                                    end,
                                    ...pathData,
                                    waypoints: [start, end]
                                });
                            }
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default LineDetailPane;

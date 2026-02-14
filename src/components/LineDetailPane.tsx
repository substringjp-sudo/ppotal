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

const LineDetailPane: React.FC<LineDetailPaneProps> = ({ lineId, segments, nodes, visitedEdges, onClose }) => {
    const [company, lineName] = lineId.split('::');

    const getEdgeKey = (u: string, v: string) => [u, v].sort().join('<->');

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '180px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '2px solid #ddd',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            padding: '15px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease-in-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>{company}</span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{lineName}</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#999'
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                whiteSpace: 'nowrap',
                paddingBottom: '10px',
                display: 'flex',
                gap: '40px',
                alignItems: 'center'
            }}>
                {segments.map((segment, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center' }}>
                        {segment.stations.map((stationId, idx) => {
                            const node = nodes.get(stationId);
                            const name = node ? node.name : stationId.split('::').pop();

                            const isLast = idx === segment.stations.length - 1;
                            const nextStationId = !isLast ? segment.stations[idx + 1] : null;
                            const edgeKey = nextStationId ? getEdgeKey(stationId, nextStationId) : null;
                            const isVisited = edgeKey ? visitedEdges.has(edgeKey) : false;

                            return (
                                <React.Fragment key={`${stationId}-${idx}`}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: '60px'
                                    }}>
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: '#3498db',
                                            border: '2px solid #fff',
                                            boxShadow: '0 0 0 1px #3498db',
                                            marginBottom: '8px',
                                            zIndex: 2
                                        }} />
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{name}</span>
                                    </div>
                                    {!isLast && (
                                        <div style={{
                                            width: '80px',
                                            height: '4px',
                                            backgroundColor: isVisited ? '#27ae60' : '#ddd',
                                            margin: '0 -6px',
                                            marginTop: '-24px',
                                            zIndex: 1,
                                            transition: 'background-color 0.4s ease'
                                        }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LineDetailPane;

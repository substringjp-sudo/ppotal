"use client";

import React, { useMemo } from 'react';
import { translateName } from '../lib/lineUtils';
import { Language } from '../lib/translations';

interface MyLinesPaneProps {
    visitedLineLengths: Record<string, number>;
    lineLengths: Record<string, number>;
    onLineClick: (line: string) => void;
    onDeleteLineHistory: (line: string) => void;
    activeLine: string | null;
    language: Language;
    recordedTrips?: any[];
    onDeleteTrip?: (id: string) => void;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    visitedLineLengths,
    lineLengths,
    onLineClick,
    onDeleteLineHistory,
    activeLine,
    language,
    recordedTrips = [],
    onDeleteTrip
}) => {
    const [activeTab, setActiveTab] = React.useState<'lines' | 'trips'>('lines');

    const utilizedLines = useMemo(() => {
        return Object.entries(visitedLineLengths)
            .filter(([_, length]) => length > 0)
            .map(([id, visitedLength]) => {
                const totalLength = lineLengths[id] || 0;
                const percent = totalLength > 0 ? Math.round((visitedLength / totalLength) * 100) : 0;
                const [company, name] = id.split('::');
                return { id, company, name, visitedLength, totalLength, percent };
            })
            .sort((a, b) => b.percent - a.percent);
    }, [visitedLineLengths, lineLengths]);

    // Reverse recorded trips to show newest first
    const displayTrips = useMemo(() => {
        return [...recordedTrips].reverse();
    }, [recordedTrips]);

    const formatTime = (tripId: string) => {
        try {
            const parts = tripId.split('-');
            const timestamp = parseInt(parts[parts.length - 1]);
            if (!isNaN(timestamp)) {
                return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) { }
        return '';
    };

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '8px' }}>
                MY HISTORY
            </h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                    onClick={() => setActiveTab('lines')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderBottom: activeTab === 'lines' ? '2px solid #27ae60' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'lines' ? 'bold' : 'normal',
                        color: activeTab === 'lines' ? '#27ae60' : '#666',
                        cursor: 'pointer'
                    }}
                >
                    LINES ({utilizedLines.length})
                </button>
                <button
                    onClick={() => setActiveTab('trips')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderBottom: activeTab === 'trips' ? '2px solid #27ae60' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'trips' ? 'bold' : 'normal',
                        color: activeTab === 'trips' ? '#27ae60' : '#666',
                        cursor: 'pointer'
                    }}
                >
                    TRIPS ({recordedTrips.length})
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {activeTab === 'lines' ? (
                    utilizedLines.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
                            No lines utilized yet.<br />Record travel progress to see them here!
                        </div>
                    ) : (
                        utilizedLines.map(line => (
                            <div
                                key={line.id}
                                onClick={() => onLineClick(line.id)}
                                style={{
                                    padding: '12px',
                                    marginBottom: '10px',
                                    border: `1px solid ${activeLine === line.id ? '#27ae60' : '#eee'}`,
                                    borderRadius: '8px',
                                    backgroundColor: activeLine === line.id ? '#f0fff4' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: activeLine === line.id ? '0 2px 8px rgba(39, 174, 96, 0.1)' : 'none'
                                }}
                            >
                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>{translateName(line.company, language, 'company')}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{translateName(line.name, language, 'line')}</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteLineHistory(line.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            fontSize: '12px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: '-4px',
                                            marginRight: '-4px'
                                        }}
                                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)')}
                                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        title="Delete History"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${line.percent}%`,
                                            height: '100%',
                                            backgroundColor: '#27ae60',
                                            transition: 'width 0.4s ease'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#27ae60', minWidth: '35px', textAlign: 'right' }}>
                                        {line.percent}%
                                    </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                                    {Math.round(line.visitedLength * 10) / 10} km / {Math.round(line.totalLength * 10) / 10} km
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    // TRIPS TAB
                    displayTrips.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
                            No trips recorded yet.<br />Drag between stations to record!
                        </div>
                    ) : (
                        displayTrips.map(trip => (
                            <div
                                key={trip.id}
                                style={{
                                    padding: '12px',
                                    marginBottom: '10px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#999' }}>{formatTime(trip.id)}</div>
                                    <button
                                        onClick={() => onDeleteTrip && onDeleteTrip(trip.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            fontSize: '12px'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {trip.from} <span style={{ color: '#27ae60' }}>➝</span> {trip.to}
                                </div>
                                {trip.distance > 0 && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                        {Math.round(trip.distance * 10) / 10} km
                                    </div>
                                )}
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};

export default React.memo(MyLinesPane);

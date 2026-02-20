"use client";

import React, { useMemo } from 'react';
import { Language } from '../lib/translations';
import { trackEvent } from '../lib/gtag';
import { RailData } from '../types/railData';

interface MyLinesPaneProps {
    visitedLineLengths: Record<string, number>;
    lineLengths: Record<string, number>;
    onLineClick: (line: string) => void;
    onDeleteLineHistory: (line: string) => void;
    activeLine: string | null;
    language: Language;
    recordedTrips?: any[];
    onDeleteTrip?: (id: string) => void;
    railData: RailData | null;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    visitedLineLengths,
    lineLengths,
    onLineClick,
    onDeleteLineHistory,
    activeLine,
    language,
    recordedTrips = [],
    onDeleteTrip,
    railData
}) => {
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
                {language === 'ko' ? '나의 기록' : 'MY HISTORY'}
            </h2>

            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {language === 'ko' ? '이동 내역' : 'TRIPS'} ({recordedTrips.length})
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {displayTrips.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
                        {language === 'ko' ? '기록된 이동 내역이 없습니다.\n역과 역 사이를 드래그하여 기록해 보세요!' :
                            'No trips recorded yet.\nDrag between stations to record!'}
                    </div>
                ) : (
                    displayTrips.map(trip => {
                        const startStation = railData?.stations[trip.startId] || railData?.stations[trip.start];
                        const endStation = railData?.stations[trip.endId] || railData?.stations[trip.end];

                        const startName = (language === 'en' && startStation?.name_en) ? startStation.name_en : (startStation?.name || trip.start);
                        const endName = (language === 'en' && endStation?.name_en) ? endStation.name_en : (endStation?.name || trip.end);

                        return (
                            <div
                                key={trip.id}
                                style={{
                                    padding: '12px',
                                    marginBottom: '10px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#999' }}>{formatTime(trip.id)}</div>
                                    <button
                                        onClick={() => {
                                            onDeleteTrip && onDeleteTrip(trip.id);
                                            trackEvent('delete_trip_item', 'engagement', trip.id);
                                        }}
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
                                    {startName} <span style={{ color: '#27ae60' }}>➝</span> {endName}
                                </div>
                                {trip.distance > 0 && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                        {Math.round(trip.distance * 10) / 10} km
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default React.memo(MyLinesPane);

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

                        const getStationFullInfo = (station: any, id: string) => {
                            if (!station) return { name: id, name_en: '', lines: [] };

                            let compId = '';
                            let lineId = '';

                            // processedStations has 'lines', but raw railData.stations has 'platform_ids'
                            if (station.lines && station.lines.length > 0) {
                                const firstLineId = station.lines[0];
                                const parts = firstLineId?.split('::') || [];
                                compId = parts[0] || '';
                                lineId = parts[1] || '';
                            } else if (station.platform_ids && station.platform_ids.length > 0) {
                                const platform = railData?.platforms?.[station.platform_ids[0]];
                                if (platform) {
                                    compId = platform.company?.toString() || '';
                                    lineId = platform.line?.toString() || '';
                                }
                            }

                            const comp = compId ? (railData?.companies as any)?.[compId] : null;
                            const line = lineId ? (railData?.lines as any)?.[lineId] : null;

                            return {
                                name: station.name,
                                name_en: station.name_en || '',
                                companyName: comp?.name || compId || 'Unknown',
                                companyName_en: comp?.name_en || '',
                                lineName: line?.name || lineId || 'Unknown',
                                lineName_en: line?.name_en || ''
                            };
                        };

                        const startInfo = getStationFullInfo(startStation, trip.start);
                        const endInfo = getStationFullInfo(endStation, trip.end);

                        // Identify unique lines used in this trip with bilingual support
                        const linesUsed = Array.from(new Set(trip.sectionIds?.map((sid: number) => {
                            const section = (railData as any)?.sections?.sections?.find((s: any) => s.id === sid);
                            if (section) {
                                const lData = (railData?.lines as any)?.[section.line_id];
                                return JSON.stringify({
                                    name: lData?.name || section.line_id.toString(),
                                    name_en: lData?.name_en || ''
                                });
                            }
                            return null;
                        }).filter(Boolean))).map(s => JSON.parse(s as string)) as { name: string, name_en: string }[];

                        return (
                            <div
                                key={trip.id}
                                style={{
                                    padding: '16px',
                                    marginBottom: '15px',
                                    border: '1px solid #edf2f7',
                                    borderRadius: '12px',
                                    backgroundColor: '#fff',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f7fafc', paddingBottom: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: '500' }}>{formatTime(trip.id)}</div>
                                    <button
                                        onClick={() => onDeleteTrip && onDeleteTrip(trip.id)}
                                        style={{ background: 'none', border: 'none', color: '#cbd5e0', cursor: 'pointer', padding: '4px', fontSize: '14px', transition: 'color 0.2s' }}
                                        onMouseOver={(e) => (e.currentTarget.style.color = '#e53e3e')}
                                        onMouseOut={(e) => (e.currentTarget.style.color = '#cbd5e0')}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Start Station */}
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                        {/* Line Row (Primary) */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '11px', color: '#2d3748', fontWeight: '800' }}>
                                            <span>{startInfo.lineName}</span>
                                            {startInfo.lineName_en && (
                                                <span style={{ fontSize: '10px', color: '#718096', fontWeight: '500', opacity: 0.8 }}>
                                                    {startInfo.lineName_en}
                                                </span>
                                            )}
                                        </div>
                                        {/* Company Row (Secondary) */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '9px', color: '#a0aec0', fontWeight: 'bold' }}>
                                            <span>{startInfo.companyName}</span>
                                            {startInfo.companyName_en && (
                                                <span style={{ fontWeight: '500', opacity: 0.7 }}>
                                                    {startInfo.companyName_en}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#2d3748', lineHeight: '1.2' }}>{startInfo.name}</div>
                                    {startInfo.name_en && <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '-2px' }}>{startInfo.name_en}</div>}
                                </div>

                                <div style={{ margin: '2px 0 2px 12px', borderLeft: '2px dashed #cbd5e0', padding: '10px 0 10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', color: '#48bb78', fontWeight: 'bold' }}>↓</span>
                                        {linesUsed.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '10px', color: '#718096', fontWeight: '600' }}>
                                                    {language === 'ko' ? '경유:' : 'via'} {linesUsed.map(l => l.name).join(', ')}
                                                </span>
                                                {linesUsed.some(l => l.name_en) && (
                                                    <span style={{ fontSize: '8px', color: '#a0aec0' }}>
                                                        {linesUsed.map(l => l.name_en).filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* End Station */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                        {/* Line Row (Primary) */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '11px', color: '#2d3748', fontWeight: '800' }}>
                                            <span>{endInfo.lineName}</span>
                                            {endInfo.lineName_en && (
                                                <span style={{ fontSize: '10px', color: '#718096', fontWeight: '500', opacity: 0.8 }}>
                                                    {endInfo.lineName_en}
                                                </span>
                                            )}
                                        </div>
                                        {/* Company Row (Secondary) */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '9px', color: '#a0aec0', fontWeight: 'bold' }}>
                                            <span>{endInfo.companyName}</span>
                                            {endInfo.companyName_en && (
                                                <span style={{ fontWeight: '500', opacity: 0.7 }}>
                                                    {endInfo.companyName_en}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#2d3748', lineHeight: '1.2' }}>{endInfo.name}</div>
                                    {endInfo.name_en && <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '-2px' }}>{endInfo.name_en}</div>}
                                </div>

                                {trip.distance > 0 && (
                                    <div style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#3498db',
                                        backgroundColor: '#ebf8ff',
                                        padding: '2px 8px',
                                        borderRadius: '20px'
                                    }}>
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

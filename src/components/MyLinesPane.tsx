"use client";

import React, { useMemo } from 'react';
import { RailData, Station, Line, Section, Company } from '../types/railData';
import { Trip } from '../types/trip';

export interface MyLinesPaneProps {
    recordedTrips?: Trip[];
    onDeleteTrip?: (id: string) => void;
    railData: RailData | null;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    recordedTrips = [],
    onDeleteTrip,
    railData
}) => {
    const displayTrips = useMemo(() => {
        return [...(recordedTrips || [])].reverse();
    }, [recordedTrips]);


    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '8px' }}>
                MY HISTORY
            </h2>

            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TRIPS ({recordedTrips?.length || 0})
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {displayTrips.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
                        No trips recorded yet.
                        Drag between stations to record!
                    </div>
                ) : (
                    displayTrips.map(trip => {
                        const startStation = ((trip.startId && railData) ? railData.stations[trip.startId] : undefined) || (railData ? railData.stations[trip.start] : undefined);
                        const endStation = ((trip.endId && railData) ? railData.stations[trip.endId] : undefined) || (railData ? railData.stations[trip.end] : undefined);

                        const getStationFullInfo = (station: (Station & { lines?: string[] }) | undefined, id: string) => {
                            if (!station) return {
                                nameJa: id,
                                nameEn: '',
                                companyJa: 'Unknown',
                                companyEn: '',
                                lineJa: 'Unknown',
                                lineEn: '',
                                lineColor: '#cbd5e0'
                            };

                            let compId = '';
                            let lineId = '';

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

                            const comp = compId ? (railData?.companies as Record<string, Company>)?.[compId] : null;
                            const line = lineId ? (railData?.lines as Record<string, Line>)?.[lineId] : null;

                            return {
                                nameJa: station.name,
                                nameEn: station.name_en,
                                companyJa: comp?.name || compId || 'Unknown',
                                companyEn: comp?.name_en || '',
                                lineJa: line?.name || lineId || 'Unknown',
                                lineEn: line?.name_en || '',
                                lineColor: line?.color || '#cbd5e0'
                            };
                        };

                        const startInfo = getStationFullInfo(startStation, trip.start);
                        const endInfo = getStationFullInfo(endStation, trip.end);

                        const linesUsed = Array.from(new Set(trip.sectionIds?.map((sid: number) => {
                            const section = railData?.sections?.sections?.find((s: Section) => s.id === sid);
                            if (section) {
                                const lData = railData?.lines[section.line_id];
                                // Combine JA and EN for VIA list or just use JA? 
                                // User said Japanese main, English sub. For comma-separated list, maybe just Japanese or "Ja (En)" format.
                                // Let's use Ja only or abbreviated format to save space.
                                return lData?.name || section.line_id.toString();
                            }
                            return null;
                        }).filter(Boolean))) as string[];

                        const StationInfo = ({ info }: {
                            info: {
                                nameJa: string; nameEn?: string;
                                companyJa: string; companyEn?: string;
                                lineJa: string; lineEn?: string;
                                lineColor: string
                            }
                        }) => (
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0px',
                                    marginBottom: '6px',
                                    borderLeft: `3px solid ${info.lineColor || '#edf2f7'}`,
                                    paddingLeft: '8px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            color: '#2d3748',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {info.lineJa}
                                        </div>
                                        {info.lineEn && (
                                            <div style={{
                                                fontSize: '9px',
                                                fontWeight: '600',
                                                color: '#718096',
                                                marginTop: '-2px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                opacity: 0.8
                                            }}>
                                                {info.lineEn}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1px' }}>
                                        <div style={{
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            color: '#a0aec0',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {info.companyJa}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: '900',
                                        color: '#1a202c',
                                        lineHeight: '1',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {info.nameJa}
                                    </div>
                                    {info.nameEn && (
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: '#718096',
                                            marginTop: '0px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {info.nameEn}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );

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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                                    <StationInfo info={startInfo} />

                                    <div style={{
                                        margin: '8px 0 8px 10px',
                                        padding: '2px 0 2px 18px',
                                        borderLeft: '2px dotted #cbd5e0',
                                        minHeight: '24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {linesUsed.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                <div style={{
                                                    fontSize: '9px',
                                                    fontWeight: '900',
                                                    color: '#48bb78',
                                                    backgroundColor: '#f0fff4',
                                                    padding: '1px 4px',
                                                    borderRadius: '3px',
                                                    flexShrink: 0
                                                }}>VIA</div>
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: '#718096',
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {linesUsed.join(', ')}
                                                    {trip.path.length > 2 && (
                                                        <span style={{ marginLeft: '6px', color: '#a0aec0', fontWeight: 'bold' }}>
                                                            ({trip.path.length - 2} stations)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <StationInfo info={endInfo} />
                                </div>

                                <div style={{
                                    marginTop: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderTop: '1px solid #edf2f7',
                                    paddingTop: '12px'
                                }}>
                                    {trip.distance > 0 && (
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            color: '#3182ce',
                                            backgroundColor: '#ebf8ff',
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <span style={{ fontSize: '10px', opacity: 0.7 }}>DIST</span>
                                            {Math.round(trip.distance * 10) / 10} km
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onDeleteTrip && onDeleteTrip(trip.id)}
                                        style={{
                                            background: '#fff5f5',
                                            border: '1px solid #fed7d7',
                                            color: '#e53e3e',
                                            cursor: 'pointer',
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#e53e3e';
                                            e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = '#fff5f5';
                                            e.currentTarget.style.color = '#e53e3e';
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

MyLinesPane.displayName = 'MyLinesPane';
export default React.memo(MyLinesPane);

"use client";

import React, { useMemo } from 'react';
import { RailData, Station, Line, Section, Company } from '../types/railData';
import { Trip } from '../types/trip';

export interface MyLinesPaneProps {
    recordedTrips?: Trip[];
    onDeleteTrip?: (id: string) => void;
    onResetTrips?: () => void;
    railData: RailData | null;
}

interface RegionNames {
    adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
    adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
}

const MyLinesPane: React.FC<MyLinesPaneProps> = ({
    recordedTrips = [],
    onDeleteTrip,
    onResetTrips,
    railData
}) => {
    const [regionNames, setRegionNames] = React.useState<RegionNames | null>(null);

    React.useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    const displayTrips = useMemo(() => {
        return [...(recordedTrips || [])].reverse();
    }, [recordedTrips]);


    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '900', color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '8px' }}>
                MY HISTORY
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TRIP RECORDS ({recordedTrips?.length || 0})
                </div>
                {recordedTrips.length > 0 && (
                    <button
                        onClick={onResetTrips}
                        style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#e53e3e',
                            backgroundColor: '#fff5f5',
                            border: '1px solid #fed7d7',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#e53e3e';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff5f5';
                            e.currentTarget.style.color = '#e53e3e';
                        }}
                    >
                        DELETE ALL
                    </button>
                )}
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
                                lineColor: '#cbd5e0',
                                prefJa: '',
                                prefEn: '',
                                cityJa: '',
                                cityEn: ''
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
                                    compId = (platform.company !== undefined && platform.company !== null) ? platform.company.toString() : '';
                                    lineId = (platform.line !== undefined && platform.line !== null) ? platform.line.toString() : '';
                                }
                            }

                            const comp = compId !== '' ? (railData?.companies as Record<string, Company>)?.[compId] : null;
                            const line = lineId !== '' ? (railData?.lines as Record<string, Line>)?.[lineId] : null;

                            const prefecture = station.prefecture_id && regionNames ? regionNames.adm1[station.prefecture_id] : null;
                            const city = station.city_id && regionNames ? regionNames.adm2[station.city_id] : null;

                            return {
                                nameJa: station.name,
                                nameEn: station.name_en,
                                companyJa: comp?.name || compId || 'Unknown',
                                companyEn: comp?.name_en || '',
                                lineJa: line?.name || lineId || 'Unknown',
                                lineEn: line?.name_en || '',
                                lineColor: line?.color || '#cbd5e0',
                                prefJa: prefecture?.shapeName || '',
                                prefEn: prefecture?.shapeName_en || '',
                                cityJa: city?.shapeName || '',
                                cityEn: city?.shapeName_en || ''
                            };
                        };

                        const startInfo = getStationFullInfo(startStation, trip.start);
                        const endInfo = getStationFullInfo(endStation, trip.end);

                        const linesUsedMap = new Map<number, { ja: string, en: string }>();
                        trip.sectionIds?.forEach((sid: number) => {
                            const section = railData?.sections?.sections?.find((s: Section) => s.id === sid);
                            if (section) {
                                const lData = railData?.lines[section.line_id];
                                if (!linesUsedMap.has(section.line_id)) {
                                    linesUsedMap.set(section.line_id, {
                                        ja: lData?.name || section.line_id.toString(),
                                        en: lData?.name_en || ''
                                    });
                                }
                            }
                        });
                        const linesUsed = Array.from(linesUsedMap.values());

                        const StationInfo = ({ info }: {
                            info: {
                                nameJa: string; nameEn?: string;
                                companyJa: string; companyEn?: string;
                                lineJa: string; lineEn?: string;
                                lineColor: string;
                                prefJa: string; prefEn: string;
                                cityJa: string; cityEn: string;
                            }
                        }) => (
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    marginBottom: '8px',
                                    border: `1px solid ${info.lineColor || '#edf2f7'}`,
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    backgroundColor: (info.lineColor || '#edf2f7') + '08', // Low opacity background
                                    borderLeft: `4px solid ${info.lineColor || '#edf2f7'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: '900',
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
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    opacity: 0.8
                                                }}>
                                                    {info.lineEn}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', flex: 1, minWidth: 0 }}>
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
                                            {info.companyEn && (
                                                <div style={{
                                                    fontSize: '8px',
                                                    fontWeight: '600',
                                                    color: '#cbd5e0',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {info.companyEn}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: '900',
                                            color: '#1a202c',
                                            lineHeight: '1.2',
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
                                                marginTop: '2px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {info.nameEn}
                                            </div>
                                        )}
                                    </div>
                                    {info.prefJa && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', flexShrink: 0, marginTop: '3px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '9px', color: '#718096', fontWeight: 'bold' }}>
                                                {info.prefJa} {info.cityJa}
                                            </div>
                                            <div style={{ fontSize: '7px', color: '#a0aec0', marginTop: '-1px' }}>
                                                {info.prefEn} {info.cityEn}
                                            </div>
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
                                        padding: '4px 0 4px 18px',
                                        borderLeft: '2px dotted #cbd5e0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        {linesUsed.length > 0 && (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        fontWeight: '900',
                                                        color: '#48bb78',
                                                        backgroundColor: '#f0fff4',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        flexShrink: 0,
                                                        marginTop: '2px'
                                                    }}>via</div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: '#718096',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '2px'
                                                    }}>
                                                        {linesUsed.map((l, i) => (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                <span>{l.ja}</span>
                                                                <span style={{ fontSize: '8px', color: '#a0aec0' }}>{l.en}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {trip.path.length > 2 && (
                                                    <div style={{
                                                        fontSize: '9px',
                                                        color: '#a0aec0',
                                                        fontWeight: 'bold',
                                                        paddingLeft: '32px'
                                                    }}>
                                                        ({trip.path.length - 2} stations)
                                                    </div>
                                                )}
                                            </>
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

import React from 'react';

import { getLineColor } from '../../lib/lineColors';
import { RailData, Station } from '../../types/railData';

export interface MobileStationPreviewProps {
    station: Station;
    lines: string[]; // List of line IDs (Company::LineName)
    onLineClick?: (lineId: string) => void;
    railData: RailData | null;
    isTripInProgress?: boolean;
    tripStartStationId?: string | null;
    onStartTrip?: (station: Station) => void;
    onEndTrip?: (station: Station) => void;
    onCancel?: () => void;
}

interface RegionNames {
    adm1: Record<string, { shapeName: string; shapeName_en?: string }>;
    adm2: Record<string, { shapeName: string; shapeName_en?: string }>;
}

const MobileStationPreview: React.FC<MobileStationPreviewProps> = ({
    station,
    lines,
    onLineClick,
    railData,
    isTripInProgress = false,
    tripStartStationId = null,
    onStartTrip,
    onEndTrip,
    onCancel
}) => {
    const [regionNames, setRegionNames] = React.useState<RegionNames | null>(null);

    React.useEffect(() => {
        fetch('/data/region_names.json')
            .then(res => res.json())
            .then(data => setRegionNames(data))
            .catch(err => console.error("Failed to load region names:", err));
    }, []);

    const prefecture = station.prefecture_id && regionNames ? regionNames.adm1[station.prefecture_id] : null;
    const prefectureName = prefecture?.shapeName || '';
    const prefectureNameEn = prefecture?.shapeName_en || '';

    const city = station.city_id && regionNames ? regionNames.adm2[station.city_id] : null;
    const cityName = city?.shapeName || '';
    const cityNameEn = city?.shapeName_en || '';

    return (
        <div style={{
            padding: '16px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #ddd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            zIndex: 1000,
            overflowX: 'auto'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#1a202c' }}>
                            {station.name}
                        </span>
                        {(prefectureName || cityName) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700' }}>
                                    {prefectureName}{prefectureName && cityName ? ' ' : ''}{cityName}
                                </span>
                                {(prefectureNameEn || cityNameEn) && (
                                    <span style={{ fontSize: '10px', color: '#718096', fontWeight: '500', marginTop: '-2px' }}>
                                        {prefectureNameEn}{prefectureNameEn && cityNameEn ? ', ' : ''}{cityNameEn}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#718096', fontWeight: '500', display: 'block' }}>
                        {station.name_en}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'flex-start' }}>
                        {!isTripInProgress ? (
                            <button
                                onClick={() => onStartTrip && onStartTrip(station)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '24px',
                                    backgroundColor: '#3182ce',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(49,130,206,0.25)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Start Trip
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '140px' }}>
                                {tripStartStationId !== station.id && (
                                    <button
                                        onClick={() => onEndTrip && onEndTrip(station)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '24px',
                                            backgroundColor: '#38a169',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(56,161,105,0.25)',
                                            whiteSpace: 'nowrap',
                                            width: '100%'
                                        }}
                                    >
                                        End Trip
                                    </button>
                                )}
                                <button
                                    onClick={() => onCancel && onCancel()}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '24px',
                                        backgroundColor: '#edf2f7',
                                        color: '#4a5568',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        width: '100%'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lines.map(lineId => {
                    const [company, line] = lineId.split('::');
                    const color = getLineColor(lineId, railData) || '#999';

                    const corpInfo = railData?.companies[company];
                    const lineInfo = railData?.lines[line];

                    const corpDisplayName = corpInfo?.name || company;
                    const lineDisplayName = lineInfo?.name || line;

                    const corpSecondaryName = corpInfo?.name_en || "";
                    const lineSecondaryName = lineInfo?.name_en || "";

                    return (
                        <div
                            key={lineId}
                            onClick={() => onLineClick && onLineClick(lineId)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                backgroundColor: '#f9f9f9',
                                borderLeft: `4px solid ${color}`,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: '1px solid #eee',
                                borderLeftWidth: '4px'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', color: '#2d3748', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                        {lineDisplayName}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#718096', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                        {lineSecondaryName}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: '#4a5568', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                        {corpDisplayName}
                                    </span>
                                    <span style={{ fontSize: '9px', color: '#a0aec0', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                        {corpSecondaryName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileStationPreview;

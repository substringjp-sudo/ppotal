import React from 'react';
import { translateName } from '../../lib/lineUtils';
import { Language } from '../../lib/translations';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../../lib/railwayData';
import { getOfficialColor } from '../../lib/lineColors';

interface MobileStationPreviewProps {
    stationName: string;
    lines: string[]; // List of line IDs (Company::LineName)
    onLineClick?: (lineId: string) => void;
    language: Language;
}

const MobileStationPreview: React.FC<MobileStationPreviewProps> = ({
    stationName,
    lines,
    onLineClick,
    language
}) => {
    return (
        <div style={{
            padding: '16px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #ddd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            zIndex: 1000,
            overflowX: 'auto'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                    {translateName(stationName, language, 'station')}
                </div>
                <div style={{ fontSize: '12px', color: '#888', fontWeight: '400', marginTop: '-2px' }}>
                    {translateName(stationName, 'en', 'station')}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lines.map(lineId => {
                    const [company, line] = lineId.split('::');
                    const color = getOfficialColor(lineId) || '#999';

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
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>
                                    {translateName(company, language, 'company')}
                                </span>
                                <span style={{ fontSize: '12px', color: '#333', fontWeight: 'bold' }}>
                                    {translateName(line, language, 'line')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '-2px' }}>
                                <span style={{ fontSize: '9px', color: '#999', fontWeight: '300' }}>
                                    {COMPANY_EN_NAMES[company] || company}
                                </span>
                                <span style={{ fontSize: '10px', color: '#888', fontWeight: '300' }}>
                                    {LINE_EN_NAMES[line] || line}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileStationPreview;

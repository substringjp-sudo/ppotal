import React from 'react';

import { Language } from '../../lib/translations';
import { getLineColor } from '../../lib/lineColors';
import { RailData } from '../../types/railData';

export interface MobileStationPreviewProps {
    stationName: string;
    lines: string[]; // List of line IDs (Company::LineName)
    onLineClick?: (lineId: string) => void;
    language: Language;
    railData: RailData | null;
}

const MobileStationPreview: React.FC<MobileStationPreviewProps> = ({
    stationName,
    lines,
    onLineClick,
    language,
    railData
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
                    {stationName}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lines.map(lineId => {
                    const [company, line] = lineId.split('::');
                    const color = getLineColor(lineId, railData) || '#999';

                    const corpInfo = railData?.companies[company];
                    const lineInfo = railData?.lines[line];

                    const corpDisplayName = language === 'en' ? (corpInfo?.name_en || company) : (corpInfo?.name || company);
                    const lineDisplayName = language === 'en' ? (lineInfo?.name_en || line) : (lineInfo?.name || line);

                    const corpSecondaryName = language === 'en' ? (corpInfo?.name || "") : (corpInfo?.name_en || "");
                    const lineSecondaryName = language === 'en' ? (lineInfo?.name || "") : (lineInfo?.name_en || "");

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
                                    {corpDisplayName}
                                </span>
                                <span style={{ fontSize: '12px', color: '#333', fontWeight: 'bold' }}>
                                    {lineDisplayName}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {corpSecondaryName && (
                                    <span style={{ fontSize: '9px', color: '#999', fontWeight: '300' }}>
                                        {corpSecondaryName}
                                    </span>
                                )}
                                {lineSecondaryName && (
                                    <span style={{ fontSize: '9px', color: '#888', fontWeight: '300' }}>
                                        {lineSecondaryName}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileStationPreview;

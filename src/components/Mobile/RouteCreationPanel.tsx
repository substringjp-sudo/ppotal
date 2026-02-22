import React from 'react';
import { Trip } from '../../types/trip';
import { Language } from '../../lib/translations';
import { RailData } from '../../types/railData';

interface RouteCreationPanelProps {
    isDragging: boolean;
    tempPath: string[];
    draftTrip: Trip | null;
    onAdd: () => void;
    onDiscard: () => void;
    onFinish: () => void;
    language: Language;
    onHeightChange?: (height: number) => void;
    railData: RailData | null;
}

const RouteCreationPanel: React.FC<RouteCreationPanelProps> = ({
    isDragging,
    tempPath,
    draftTrip,
    onAdd,
    onDiscard,
    onFinish,
    language,
    onHeightChange,
    railData
}) => {
    // Determine which path to show
    const displayPath = isDragging ? tempPath : (draftTrip ? draftTrip.waypoints : []);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current && onHeightChange) {
            // Measure actual height including padding/borders
            const height = containerRef.current.offsetHeight;
            onHeightChange(height);
        }
    }, [displayPath, draftTrip, isDragging, onHeightChange]);

    return (
        <div ref={containerRef} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'transparent',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'none' // Allow click-through on transparent parts if any, but children need events
        }}>
            <div style={{
                backgroundColor: '#fff',
                padding: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'auto'
            }}>
                {/* Header removed: Title and Finish button moved to main App Header */}

                {/* Station List or Instruction */}
                <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '10px',
                    padding: '8px 5px',
                    borderTop: '1px solid #eee',
                    borderBottom: '1px solid #eee',
                    minHeight: '40px',
                    whiteSpace: 'nowrap',
                    alignItems: 'center'
                }}>
                    {displayPath.length === 0 ? (
                        <span style={{ color: '#555', fontSize: '14px', margin: 'auto', fontWeight: 'bold' }}>
                            {language === 'ko' ? '역을 누른 채 옆으로 드래그하여 경로를 추가하세요' : 'Press and drag a station to record your route'}
                        </span>
                    ) : (
                        displayPath.map((stationId: string, idx: number) => {
                            const station = railData?.stations[stationId];
                            const displayName = (language === 'en' && station?.name_en) ? station.name_en : (station?.name || stationId);

                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#ecf0f1',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#333',
                                        fontWeight: '700'
                                    }}>
                                        {displayName}
                                    </span>
                                    {idx < displayPath.length - 1 && (
                                        <span style={{ color: '#ccc', fontWeight: 'bold' }}>→</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Action Buttons (Only when draft exists) */}
                {draftTrip && !isDragging && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onAdd}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#3498db',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }}
                        >
                            Add to History
                        </button>
                        <button
                            onClick={onDiscard}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#e74c3c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }}
                        >
                            Discard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteCreationPanel;

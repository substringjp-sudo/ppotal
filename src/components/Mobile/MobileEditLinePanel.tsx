import React from 'react';
import { StationNode } from '../../lib/graphUtils';
import { Language } from '../../lib/translations';
import { useLineTopology, TopologySegment } from '../../hooks/useLineTopology';
import TubeMap from '../TubeMap';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../../lib/railwayData';

interface MobileEditLinePanelProps {
    lineId: string;
    segments: TopologySegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    visitedStations: Set<string>;
    onPathCreate: (startId: string, endId: string) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    onClose: () => void;
    language: Language;
}

const MobileEditLinePanel: React.FC<MobileEditLinePanelProps> = ({
    lineId,
    segments,
    nodes,
    visitedEdges,
    visitedStations,
    onPathCreate,
    onDragUpdate,
    onClose,
    language
}) => {
    const [company, lineName] = lineId.split('::');
    const generatedTopologies = useLineTopology(segments);

    return (
        <div style={{
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderTop: '1px solid #ddd',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '45vh',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>{company}</span>
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{lineName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '-2px' }}>
                        <span style={{ fontSize: '9px', color: '#999' }}>{COMPANY_EN_NAMES[company] || company}</span>
                        <span style={{ fontSize: '10px', color: '#888' }}>{LINE_EN_NAMES[lineName] || lineName}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        border: 'none',
                        background: '#f0f0f0',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        fontSize: '14px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '11px', color: '#2980b9', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    💡 {language === 'ko' ? '역을 누른 채 옆으로 드래그하여 경로를 추가하세요' : 'Press and drag a station to record your route'}
                </p>
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                    {generatedTopologies && generatedTopologies.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {generatedTopologies.map((topology, idx) => (
                                <TubeMap
                                    key={idx}
                                    lineId={lineId}
                                    topology={topology}
                                    nodes={nodes}
                                    visitedStations={visitedStations}
                                    visitedEdges={visitedEdges}
                                    language={language}
                                    onPathCreate={onPathCreate}
                                    onDragUpdate={onDragUpdate}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                            노선도 데이터를 불러올 수 없습니다
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileEditLinePanel;

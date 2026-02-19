import React, { useMemo } from 'react';
import { StationNode, LineSegment } from '../../lib/graphUtils';
import TubeMap from '../TubeMap';
import { useLineTopology } from '../../hooks/useLineTopology';
import { translateName } from '../../lib/lineUtils';
import { Language } from '../../lib/translations';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../../lib/railwayData';
import { getOfficialColor } from '../../lib/lineColors';

interface MobileEditLinePanelProps {
    lineId: string;
    segments: LineSegment[];
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
    language,
}) => {
    const [company, lineName] = lineId.split('::');
    const lineColor = useMemo(() => getOfficialColor(lineId) || '#3498db', [lineId]);

    // Calculate topology data using the hook
    const topology = useLineTopology(lineId, segments, nodes, visitedStations, visitedEdges);

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            padding: '24px',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                        {translateName(company, language, 'company')}
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {translateName(lineName, language, 'line')}
                    </span>
                    <span style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        두 역을 순서대로 선택하여 이동 경로를 기록하세요.
                    </span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: '#eee',
                        fontSize: '20px',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Topology Area */}
            <div style={{ flex: 1, overflow: 'hidden', marginBottom: '20px' }}>
                <TubeMap
                    nodes={topology.nodes}
                    edges={topology.edges}
                    visitedStations={visitedStations}
                    visitedEdges={visitedEdges}
                    lineColor={lineColor}
                    onPathCreate={onPathCreate}
                    language={language}
                />
            </div>

            {/* Guide */}
            <div style={{
                padding: '16px',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    backgroundColor: lineColor,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    fontWeight: 'bold'
                }}>!</div>
                <span style={{ fontSize: '13px', color: '#444' }}>
                    노선도에서 역을 탭하여 시작점과 도착점을 지정할 수 있습니다.
                </span>
            </div>
        </div>
    );
};

export default MobileEditLinePanel;

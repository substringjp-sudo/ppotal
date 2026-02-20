import React, { useMemo } from 'react';
import { StationNode, LineSegment } from '../../lib/graphUtils';
import TubeMap from '../TubeMap';
import { useLineTopology } from '../../hooks/useLineTopology';

import { Language } from '../../lib/translations';
import { getLineColor } from '../../lib/lineColors';
import { RailData } from '../../types/railData';

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
    railData: RailData | null;
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
    railData,
}) => {
    const [company, lineName] = lineId.split('::');
    const lineColor = useMemo(() => getLineColor(lineId, railData) || '#3498db', [lineId, railData]);

    // Calculate topology data using the hook
    const topology = useLineTopology(lineId, segments, nodes, visitedStations, visitedEdges);

    const companyData = railData?.companies[company];
    const lineData = railData?.lines[lineName];

    const cNamePrimary = language === 'en' ? (companyData?.name_en || company) : (companyData?.name || company);
    const lNamePrimary = language === 'en' ? (lineData?.name_en || lineName) : (lineData?.name || lineName);

    const cNameSecondary = language === 'en' ? (companyData?.name || "") : (companyData?.name_en || "");
    const lNameSecondary = language === 'en' ? (lineData?.name || "") : (lineData?.name_en || "");

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
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#888', fontWeight: '600', letterSpacing: '0.05em' }}>
                            {language === 'en' ? (railData?.companies[company]?.name_en || company) : (railData?.companies[company]?.name || company)}
                        </span>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                            {language === 'en' ? (railData?.lines[lineName]?.name_en || lineName) : (railData?.lines[lineName]?.name || lineName)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', opacity: 0.6 }}>
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>
                            {railData?.companies[company]?.name_en || ""}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>
                            {railData?.lines[lineName]?.name_en || ""}
                        </span>
                    </div>
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
                    {language === 'en' ? "Tap stations on the map to specify start and end points." : "노선도에서 역을 탭하여 시작점과 도착점을 지정할 수 있습니다."}
                </span>
            </div>
        </div>
    );
};

export default MobileEditLinePanel;

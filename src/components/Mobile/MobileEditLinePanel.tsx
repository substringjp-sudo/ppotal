import React, { useMemo } from 'react';
import { StationNode, LineSegment } from '../../lib/graphUtils';
import TubeMap from '../TubeMap';
import { useLineTopology } from '../../hooks/useLineTopology';

import { getLineColor } from '../../lib/lineColors';
import { RailData } from '../../types/railData';
import { useI18n } from '../../lib/i18n-context';
import { getLocalizedName } from '../../lib/i18n-utils';

import { MOBILE_EDIT_LINE_TRANSLATIONS, getTranslations } from '../../lib/translations';


interface MobileEditLinePanelProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    visitedStations: Set<string>;
    onPathCreate: (startId: string, endId: string) => void;
    onClose: () => void;
    railData: RailData | null;
}

const MobileEditLinePanel: React.FC<MobileEditLinePanelProps> = ({
    lineId,
    segments,
    nodes,
    visitedEdges,
    visitedStations,
    onPathCreate,
    onClose,
    railData,
}) => {
    const { language } = useI18n();
    const t = getTranslations(MOBILE_EDIT_LINE_TRANSLATIONS, language);
    const [company, lineName] = lineId.split('::');
    const lineColor = useMemo(() => getLineColor(lineId, railData) || '#3498db', [lineId, railData]);

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
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#888', fontWeight: '600', letterSpacing: '0.05em' }}>
                            {getLocalizedName(railData?.companies[company], language) || company}
                        </span>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                            {getLocalizedName(railData?.lines[lineName], language) || lineName}
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
                    {t.guide}
                </span>
            </div>
        </div>
    );
};

export default MobileEditLinePanel;

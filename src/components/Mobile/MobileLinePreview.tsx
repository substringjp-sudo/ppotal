import React, { useMemo } from 'react';
import { StationNode, LineSegment } from '../../lib/graphUtils';
import { translateName } from '../../lib/lineUtils';
import { Language } from '../../lib/translations';
import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../../lib/railwayData';
import TubeMap from '../TubeMap';
import { useLineTopology } from '../../hooks/useLineTopology';
import { getOfficialColor } from '../../lib/lineColors';

interface MobileLinePreviewProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    visitedStations: Set<string>;
    selectedLines: string[];
    onToggleLine: (lineId: string) => void;
    language: Language;
}

const MobileLinePreview: React.FC<MobileLinePreviewProps> = ({
    lineId,
    segments,
    nodes,
    visitedEdges,
    visitedStations,
    selectedLines,
    onToggleLine,
    language
}) => {
    const isSelected = selectedLines.includes(lineId);
    const lineColor = useMemo(() => getOfficialColor(lineId) || '#3498db', [lineId]);

    // Calculate topology data using the hook
    const topology = useLineTopology(lineId, segments, nodes, visitedStations, visitedEdges);

    const stats = useMemo(() => {
        let totalDistance = 0;
        let visitedDistance = 0;

        segments.forEach((segment) => {
            segment.edges.forEach((edge) => {
                const edgeKey = [edge.from, edge.to].sort().join('<->');
                totalDistance += edge.distance;
                if (visitedEdges.has(edgeKey)) {
                    visitedDistance += edge.distance;
                }
            });
        });

        return {
            total: (totalDistance / 1000).toFixed(1),
            visited: (visitedDistance / 1000).toFixed(1),
            percent: totalDistance > 0 ? Math.round((visitedDistance / totalDistance) * 100) : 0
        };
    }, [segments, visitedEdges]);

    const [company, lineName] = lineId.split('::');

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            margin: '10px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                        {translateName(company, language, 'company')}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: lineColor }}>
                        {translateName(lineName, language, 'line')}
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{stats.percent}%</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{stats.visited} / {stats.total} km</div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <TubeMap
                    nodes={topology.nodes}
                    edges={topology.edges}
                    visitedStations={visitedStations}
                    visitedEdges={visitedEdges}
                    lineColor={lineColor}
                    language={language}
                />
            </div>

            <button
                onClick={() => onToggleLine(lineId)}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isSelected ? '#eee' : lineColor,
                    color: isSelected ? '#666' : '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {isSelected ? '지도에서 숨기기' : '지도에 표시하기'}
            </button>
        </div>
    );
};

export default React.memo(MobileLinePreview);

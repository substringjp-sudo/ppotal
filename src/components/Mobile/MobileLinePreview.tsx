import React, { useMemo } from 'react';
import { StationNode, LineSegment } from '../../lib/graphUtils';

import TubeMap from '../TubeMap';
import { useLineTopology } from '../../hooks/useLineTopology';
import { getLineColor } from '../../lib/lineColors';
import { RailData } from '../../types/railData';

export interface MobileLinePreviewProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    visitedStations: Set<string>;
    selectedLines: string[];
    onToggleLine: (lineId: string) => void;
    railData: RailData | null;
}

const MobileLinePreview: React.FC<MobileLinePreviewProps> = ({
    lineId,
    segments,
    nodes,
    visitedEdges,
    visitedStations,
    selectedLines,
    onToggleLine,
    railData
}) => {
    const isSelected = selectedLines.includes(lineId);
    const lineColor = useMemo(() => getLineColor(lineId, railData) || '#3498db', [lineId, railData]);

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
            total: totalDistance.toFixed(1),
            visited: visitedDistance.toFixed(1),
            percent: totalDistance > 0 ? Math.round((visitedDistance / totalDistance) * 100) : 0
        };
    }, [segments, visitedEdges]);

    const [company, lineName] = lineId.split('::');

    const companyData = railData?.companies[company];
    const lineData = railData?.lines[lineName];

    const cNamePrimary = companyData?.name || company;
    const lNamePrimary = lineData?.name || lineName;

    const cNameSecondary = companyData?.name_en || "";
    const lNameSecondary = lineData?.name_en || "";

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#1a1a1a' }}>
                            {lNamePrimary}
                        </span>
                        <span style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>
                            {lNameSecondary}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>
                            {cNamePrimary}
                        </span>
                        <span style={{ fontSize: '10px', color: '#a0aec0', fontWeight: '500' }}>
                            {cNameSecondary}
                        </span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{stats.percent}%</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{stats.visited} / {stats.total} km</div>
                </div>
            </div>

            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                <TubeMap
                    nodes={topology.nodes}
                    edges={topology.edges}
                    visitedStations={visitedStations}
                    visitedEdges={visitedEdges}
                    lineColor={lineColor}
                />
                <div id="tube-minimap-portal" style={{
                    marginTop: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '60px'
                }} />
            </div>
        </div>
    );
};

export default React.memo(MobileLinePreview);

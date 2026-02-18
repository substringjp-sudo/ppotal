import React, { useRef } from 'react';
import { StationNode } from '../../lib/graphUtils';
import { translateName } from '../../lib/lineUtils';
import { Language } from '../../lib/translations';
import { useLineTopology, TopologySegment } from '../../hooks/useLineTopology';
import TubeMap from '../TubeMap';

import { COMPANY_EN_NAMES, LINE_EN_NAMES } from '../../lib/railwayData';

interface MobileLinePreviewProps {
    lineId: string;
    segments: TopologySegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    selectedLines: string[];
    onToggleLine: (lineId: string) => void;
    language: Language;
}

const MobileLinePreview: React.FC<MobileLinePreviewProps> = ({
    lineId,
    segments,
    nodes,
    visitedEdges,
    selectedLines,
    onToggleLine,
    language
}) => {
    const [company, lineName] = lineId.split('::');
    const generatedTopologies = useLineTopology(segments);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isVisible = selectedLines.includes(lineId);

    // Calculate stats
    const stats = React.useMemo(() => {
        let total = 0;
        let visited = 0;

        const getName = (id: string) => nodes.get(id)?.name || id;
        const visitedLogicalEdges = new Set<string>();
        visitedEdges.forEach(key => {
            const [id1, id2] = key.split('<->');
            const n1 = nodes.get(id1)?.name;
            const n2 = nodes.get(id2)?.name;
            if (n1 && n2 && n1 !== n2) {
                visitedLogicalEdges.add([n1, n2].sort().join('<->'));
            }
        });

        if (segments) {
            segments.forEach((segment) => {
                segment.edges.forEach((edge) => {
                    total += edge.distance;
                    const logicalKey = [getName(edge.from), getName(edge.to)].sort().join('<->');
                    if (visitedLogicalEdges.has(logicalKey)) {
                        visited += edge.distance;
                    }
                });
            });
        }
        return {
            total: Math.round(total * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: total > 0 ? Math.round((visited / total) * 100) : 0
        };
    }, [segments, visitedEdges, nodes]);

    return (
        <div style={{
            padding: '16px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #ddd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            position: 'relative',
            zIndex: 1000,
            maxHeight: '40vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>{translateName(company, language, 'company')}</span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{translateName(lineName, language, 'line')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '-2px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#999', fontWeight: '400' }}>{COMPANY_EN_NAMES[company] || company}</span>
                            <span style={{ fontSize: '11px', color: '#888', fontWeight: '400' }}>{LINE_EN_NAMES[lineName] || lineName}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: '#444' }}>{stats.visited}km / {stats.total}km</span>
                        <span style={{ color: stats.percent >= 100 ? '#27ae60' : '#3498db', fontWeight: 'bold' }}>
                            ({stats.percent}%)
                        </span>
                    </div>
                </div>

                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    backgroundColor: isVisible ? '#e8f5e9' : '#f5f5f5',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    border: `1px solid ${isVisible ? '#a5d6a7' : '#ddd'}`,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: isVisible ? '#2e7d32' : '#666'
                }}>
                    <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleLine(lineId)}
                        style={{ margin: 0 }}
                    />
                    Show on Map
                </label>
            </div>

            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '10px',
                    marginTop: '8px',
                    backgroundColor: '#fff'
                }}
            >
                {generatedTopologies && generatedTopologies.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {generatedTopologies.map((topology, idx) => (
                            <TubeMap
                                key={idx}
                                lineId={lineId}
                                topology={topology}
                                nodes={nodes}
                                visitedStations={new Set()} // Not highlighting stations specifically unless we want to, using empty set for now or pass actual visited
                                visitedEdges={visitedEdges}
                                language={language}
                            // onStationClick logic could be passed if needed
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        Details not available
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileLinePreview;

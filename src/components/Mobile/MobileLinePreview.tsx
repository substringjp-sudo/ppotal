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
        <div className="mx-2 my-1 p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-white/40 dark:border-slate-800/50 shadow-lg animate-in slide-in-from-top duration-300">
            {/* Header: Line & Stats */}
            <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex flex-col min-w-0 flex-1">
                    {/* Line Name Section */}
                    <div className="flex items-baseline gap-2 overflow-hidden">
                        <span className="text-xl font-black text-slate-900 dark:text-white leading-none truncate">
                            {lNamePrimary}
                        </span>
                        {lNameSecondary && (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic truncate uppercase tracking-tight">
                                {lNameSecondary}
                            </span>
                        )}
                    </div>

                    {/* Company Name Section */}
                    <div className="flex items-baseline gap-1.5 mt-0.5 overflow-hidden">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-none truncate uppercase tracking-widest">
                            {cNamePrimary}
                        </span>
                        {cNameSecondary && (
                            <span className="text-[8px] font-medium text-slate-400 dark:text-slate-600 truncate uppercase tracking-tighter">
                                {cNameSecondary}
                            </span>
                        )}
                    </div>
                </div>

                {/* Compact Stats Info */}
                <div className="flex flex-col items-end shrink-0 bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/50 dark:border-slate-700/30 shadow-sm">
                    <div className="text-2xl font-black text-primary leading-tight">
                        {stats.percent}%
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none uppercase tracking-tighter">
                        {stats.visited}<span className="text-slate-300 dark:text-slate-700 mx-0.5">/</span>{stats.total} km
                    </div>
                </div>
            </div>

            {/* Route Map Area */}
            <div
                className="relative mt-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/40 overflow-hidden shadow-inner"
                style={{ height: '240px', display: 'flex', flexDirection: 'column' }}
            >
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <TubeMap
                        nodes={topology.nodes}
                        edges={topology.edges}
                        visitedStations={visitedStations}
                        visitedEdges={visitedEdges}
                        lineColor={lineColor}
                        containerHeight="100%"
                        containerStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
                    />
                </div>
            </div>

            {/* Bottom Indicator for interactivity */}
            <div className="mt-2 flex justify-center">
                <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700/50" />
            </div>
        </div>
    );
};

export default React.memo(MobileLinePreview);

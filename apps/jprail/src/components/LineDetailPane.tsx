"use client";

import React, { useCallback, useMemo, useRef } from 'react';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { trackEvent } from '../lib/gtag';
import TubeMap from './TubeMap';
import { useLineTopology } from '../hooks/useLineTopology';
import { Trip } from '../types/trip';
import { getLineColor } from '../lib/lineColors';
import { RailData } from '../types/railData';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';
import { LINE_DETAIL_TRANSLATIONS, getTranslations } from '../lib/translations';
import { buildRouteGraph } from '../lib/routeSearch';
import { findConnectingPath, findEdge, geometriesForSections } from '../lib/dragRouting';
import { Z } from '../lib/layers';

export interface LineDetailPaneProps {
    lineId: string;
    segments: LineSegment[];
    nodes: Map<string, StationNode>;
    visitedEdges: Set<string>;
    selectedLines: string[];
    onRecordTrip?: (trip: Trip) => void;
    getShortestPath?: (start: string, end: string, lines: string[]) => Promise<{ path: string[], distance: number, geometries: [number, number][][], sectionIds: number[] } | null>;
    onStationClick?: (id: string) => void;
    onClose: () => void;
    onToggleLine?: (lineId: string) => void;
    railData: RailData | null;
}

const LineDetailPane: React.FC<LineDetailPaneProps> = ({
    lineId, segments, nodes, visitedEdges, selectedLines, onClose, onStationClick, onToggleLine,
    getShortestPath, onRecordTrip, railData
}) => {
    const { language } = useI18n();
    const t = getTranslations(LINE_DETAIL_TRANSLATIONS, language);
    const [company, lineName] = lineId.split('::');
    const lineColor = useMemo(() => getLineColor(lineId, railData) || '#3498db', [lineId, railData]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const companyData = useMemo(() => {
        if (!railData || !company) return null;
        return railData.companies[company] || null;
    }, [railData, company]);

    const lineData = useMemo(() => {
        if (!railData || !lineName) return null;
        return railData.lines[lineName] || null;
    }, [railData, lineName]);

    const stats = useMemo(() => {
        let total = 0;
        let visited = 0;
        const visitedStationsSet = new Set<string>();

        if (segments) {
            segments.forEach((segment) => {
                segment.edges.forEach((edge) => {
                    total += edge.distance;
                    const edgeKey = [edge.from, edge.to].sort().join('<->');
                    if (visitedEdges.has(edgeKey)) {
                        visited += edge.distance;
                        visitedStationsSet.add(edge.from);
                        visitedStationsSet.add(edge.to);
                    }
                });
            });
        }
        const totalDist = total > 0 ? total : (lineData?.total_length ? lineData.total_length / 1000 : 0);
        return {
            total: Math.round(totalDist * 10) / 10,
            visited: Math.round(visited * 10) / 10,
            percent: totalDist > 0 ? Math.round((visited / totalDist) * 100) : 0,
            visitedStations: visitedStationsSet
        };
    }, [segments, visitedEdges, lineData]);

    const topology = useLineTopology(lineId, segments, nodes, stats.visitedStations, visitedEdges, railData);

    const stationStats = useMemo(() => {
        const stationNodes = topology.nodes.filter(n => !n.isJoint);
        const total = stationNodes.length;
        const visited = stationNodes.filter(n => n.isVisited).length;
        return {
            total: total || stats.visitedStations.size,
            visited: visited
        };
    }, [topology.nodes, stats.visitedStations]);

    const routeGraph = useMemo(() => (railData ? buildRouteGraph(railData) : null), [railData]);

    /**
     * Turns a dragged sequence of diagram stations into a trip.
     *
     * Each hop is resolved against the local graph instead of one call to the
     * pathfinding function per hop. A skip-stop line is a single edge between
     * stations that are not consecutive on the local service, so asking a
     * remote shortest-path for it and dropping the answer when it came back
     * empty is why express lines recorded nothing at all.
     */
    const handlePathCreate = useCallback((path: string[]) => {
        if (!routeGraph || !onRecordTrip || path.length < 2) return;

        const lineNumericId = Number(lineName);
        const allowedLines = Number.isFinite(lineNumericId) ? new Set([lineNumericId]) : undefined;

        const combinedPath: string[] = [path[0]];
        const combinedGeometries: [number, number][][] = [];
        const combinedSectionIds: number[] = [];
        const seenSections = new Set<number>();
        let combinedDistance = 0;

        const addSections = (sectionIds: number[]) => {
            sectionIds.forEach(sid => {
                if (seenSections.has(sid)) return;
                seenSections.add(sid);
                combinedSectionIds.push(sid);
                combinedDistance += (routeGraph.sections.get(sid)?.length || 0) / 1000;
            });
        };

        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];

            // A single edge covers both the local case and the express skip.
            const edge = findEdge(routeGraph, from, to);
            if (edge) {
                addSections(edge.sectionIds);
                combinedPath.push(to);
                continue;
            }

            // Otherwise walk the line itself. Better than half of the hops in a
            // line diagram are not single graph edges, because the diagram
            // follows the line's station sequence while the graph follows
            // physical sections.
            const viaLine = findConnectingPath(routeGraph, from, to, { maxHops: 30, allowedLines });

            // Only leave the line to bridge a small gap, so a quirk in the data
            // never quietly records a long stretch of some other line.
            const bridge = viaLine || findConnectingPath(routeGraph, from, to, { maxHops: 4 });
            if (!bridge) continue;

            addSections(bridge.sectionIds);
            combinedPath.push(...bridge.stationIds.slice(1));
        }

        if (combinedSectionIds.length === 0) return;

        combinedGeometries.push(...geometriesForSections(routeGraph, combinedSectionIds));

        onRecordTrip({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            start: path[0],
            end: path[path.length - 1],
            startId: path[0],
            endId: path[path.length - 1],
            path: combinedPath,
            distance: Math.round(combinedDistance * 10) / 10,
            geometries: combinedGeometries,
            sectionIds: combinedSectionIds,
            waypoints: path
        });
    }, [routeGraph, onRecordTrip, lineName]);

    return (
        <div style={{ zIndex: Z.detailPane }} className="absolute bottom-0 left-0 right-0 max-h-[60vh] sm:max-h-[60vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800  flex flex-col p-3 sm:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[24px] sm:rounded-t-[32px] animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="flex flex-col gap-2 sm:gap-4 mb-2 sm:mb-6 flex-shrink-0">
                <div className="flex justify-between items-start gap-1.5 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <button
                            onClick={() => onToggleLine?.(lineId)}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-300 shadow-sm shrink-0
                                ${selectedLines.includes(lineId)
                                    ? 'bg-primary border-primary text-white shadow-primary/20'
                                    : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                            title={selectedLines.includes(lineId) ? t.hideLine : t.showLine}
                        >
                            <span className="material-symbols-outlined text-xl sm:text-2xl">
                                {selectedLines.includes(lineId) ? 'check' : 'add'}
                            </span>
                        </button>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                <div className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-full shrink-0" style={{ backgroundColor: lineColor }}></div>
                                <div className="flex items-baseline gap-1.5 sm:gap-2 m-0 overflow-hidden">
                                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate">
                                        {lineData ? getLocalizedName(lineData, language) : lineName}
                                    </span>
                                    {language !== 'ja' && lineData?.name && (
                                        <span className="text-[9px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 italic truncate">{lineData.name}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5 overflow-hidden">
                                <span className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest truncate">
                                    {companyData ? getLocalizedName(companyData, language) : company}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { onClose(); trackEvent('close_line_detail', 'ui_interaction', lineId); }}
                        className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 transition-all flex items-center justify-center active:scale-90"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        {/* Distance Completion */}
                        <div className="flex flex-col gap-0">
                            <div className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest">{t.completion}</div>
                            <div className="flex items-baseline text-sm sm:text-lg font-black leading-none">
                                <span className="text-slate-900 dark:text-white">{stats.visited}km</span>
                                <span className="text-slate-400 dark:text-slate-500">&nbsp;/ {stats.total}km</span>
                            </div>
                        </div>
                        {/* Station Count */}
                        <div className="flex flex-col gap-0 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
                            <div className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                {language === 'ja' ? '駅数' : (language === 'en' ? 'Stations' : '방문 역')}
                            </div>
                            <div className="flex items-baseline text-sm sm:text-lg font-black leading-none">
                                <span className="text-slate-900 dark:text-white">{stationStats.visited}</span>
                                <span className="text-slate-400 dark:text-slate-500">&nbsp;/ {stationStats.total}{language === 'ja' ? '駅' : (language === 'en' ? ' stations' : '개 역')}</span>
                            </div>
                        </div>
                    </div>
                    <div id="tube-minimap-portal" className="shrink-0"></div>
                </div>
            </div>
            <div ref={scrollContainerRef} className="flex-1 relative overflow-auto min-h-0 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <TubeMap
                    nodes={topology.nodes} edges={topology.edges} adj={topology.adj}
                    nodesById={topology.nodesById} edgeInfos={topology.edgeInfos}
                    visitedStations={stats.visitedStations} visitedEdges={visitedEdges}
                    lineColor={lineColor} onStationClick={onStationClick}
                    scrollContainerRef={scrollContainerRef} loops={topology.loops}
                    onPathCreate={handlePathCreate}
                />
            </div>
        </div>
    );
};

LineDetailPane.displayName = 'LineDetailPane';
export default LineDetailPane;

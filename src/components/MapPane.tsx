"use client";

import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { useMap, useMapEvents, Polyline } from 'react-leaflet';
import L, { LatLngBounds, LatLngExpression } from 'leaflet';

import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Stations from './Stations';
import RailroadLayer from './RailroadLayer';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { getLineColor } from '../lib/lineColors';
import { MapStyleSettings } from './MainPageClient';
import { trackEvent } from '../lib/gtag';
import MapControls from './MapControls';
import OffScreenIndicator from './OffScreenIndicator';

import { useRailData } from '../hooks/useRailData';
import { RoutingGraph } from '../lib/RoutingGraph';
import { RailData, Section } from '../types/railData';
import { useVisibleStations } from '../hooks/useVisibleStations';
import { useTripRecorder } from '../hooks/useTripRecorder';
import RulerOverlay from './RulerOverlay';
import { Trip } from '../types/trip';
import { useMapData } from '../hooks/useMapData';

interface MapPaneProps {
    selectedLines: string[];
    recordedTrips: Trip[];
    onRecordTrip?: (trip: Trip) => void;
    onRailroadClick?: (line: string) => void;
    onStationClick?: (name: string, lines?: string[]) => void;
    onLengthsCalculated?: (lengths: Record<string, number>) => void;
    onVisitedLengthsCalculated?: (lengths: Record<string, number>) => void;
    activeLine: string | null;
    onLineDetailData?: (data: {
        segments: LineSegment[],
        visitedEdges: Set<string>,
        visitedStations: Set<string>,
        nodes: Map<string, StationNode>,
        getShortestPath: (start: string, end: string, allowedLines?: string[]) => { path: string[], sectionIds: number[], distance: number, geometries: [number, number][][] } | null
    } | null) => void;
    zoomTarget?: { type: 'line' | 'station', id: string } | null;
    onZoomComplete?: () => void;
    onLineMappingCreated?: (mapping: Map<string, string>) => void;
    styleSettings: MapStyleSettings;

    onSetSelectedLines?: (lines: string[]) => void;
    onSetActiveLine?: (line: string | null) => void;
    isMobile: boolean;
    selectedStation?: string;
    onMapClick?: () => void;

    isEditMode?: boolean;
    draftTrip?: Trip | null;
    onDraftComplete?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    rulerTopOffset?: number;
    onTransitionStateChange?: (isPending: boolean) => void;
    showLabels?: boolean;
    onToggleLabels?: () => void;
    tripStartStationId?: string | null;
    onStationHover?: (id: string | null) => void;
}

const PANE_STYLES = {
    topTooltips: { zIndex: 1000, pointerEvents: 'none' as const, overflow: 'visible' },
    masterInteractions: { zIndex: 950, overflow: 'visible' },
    globalInteraction: { zIndex: 940, overflow: 'visible' },
    stationLabels: { zIndex: 880, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadLines: { zIndex: 820, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadCasing: { zIndex: 815, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadGlow: { zIndex: 810, pointerEvents: 'none' as const, overflow: 'visible' },
    uiElements: { zIndex: 900, pointerEvents: 'none' as const, overflow: 'visible' },
    background: { zIndex: 100, overflow: 'visible' },
};

const MapPane: React.FC<MapPaneProps> = ({
    selectedLines,
    recordedTrips,
    onRecordTrip,
    onRailroadClick,
    onStationClick,
    onLengthsCalculated,
    onVisitedLengthsCalculated,
    activeLine,
    onLineDetailData,
    zoomTarget,
    onZoomComplete,
    onLineMappingCreated,
    styleSettings,
    onSetSelectedLines,
    onSetActiveLine,
    isMobile,
    onMapClick,
    isEditMode = false,
    draftTrip,
    onDraftComplete,
    onDragUpdate,
    rulerTopOffset = 80,
    onTransitionStateChange,
    showLabels = false,
    onToggleLabels,
    tripStartStationId,
    onStationHover: onStationHoverExternal
}) => {
    const map = useMap();
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const moveEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        onTransitionStateChange?.(isPending);
    }, [isPending, onTransitionStateChange]);

    const { prefectures, municipalities } = useMapData();
    const { railData } = useRailData();

    const graph: RoutingGraph | null = useMemo(() => (railData ? new RoutingGraph(railData) : null), [railData]);

    const { lineIdMap, lineLengths, visitedLineLengths } = useMemo(() => {
        if (!graph || !railData) {
            return {
                lineIdMap: new Map<string, string>(),
                lineLengths: {},
                visitedLineLengths: {},
            };
        }

        const newVisitedLineLengths: Record<string, number> = {};

        const uniqueSectionIds = new Set<number>();
        recordedTrips.forEach(trip => {
            if (trip.sectionIds) {
                trip.sectionIds.forEach(sid => uniqueSectionIds.add(sid));
            }
        });

        const rawSections = (railData as unknown as RailData).sections.sections || [];
        uniqueSectionIds.forEach(sid => {
            const section = rawSections.find((s: Section) => s.id === sid);
            if (section) {
                const lineId = `${section.company_id}::${section.line_id}`;
                newVisitedLineLengths[lineId] = (newVisitedLineLengths[lineId] || 0) + (section.length / 1000);
            }
        });

        return {
            lineIdMap: graph.getLineIdMap(),
            lineLengths: graph.getLineLengths(),
            visitedLineLengths: newVisitedLineLengths,
        };
    }, [graph, recordedTrips, railData]);


    const { visitedStations, visitedSectionIds } = useMemo(() => {
        const stationSet = new Set<string>();
        const sectionSet = new Set<number>();
        if (!graph) return { visitedStations: stationSet, visitedSectionIds: sectionSet };

        recordedTrips.forEach(trip => {
            if (trip.path) {
                trip.path.forEach((nodeId: string) => {
                    stationSet.add(nodeId);
                });
            }
            if (trip.sectionIds) {
                trip.sectionIds.forEach(sid => sectionSet.add(sid));
            }
        });
        return { visitedStations: stationSet, visitedSectionIds: sectionSet };
    }, [recordedTrips, graph]);

    const { draftStationIds, draftSectionIds } = useMemo(() => {
        const stationSet = new Set<string>();
        const sectionSet = new Set<number>();
        if (draftTrip) {
            if (draftTrip.path) draftTrip.path.forEach(id => stationSet.add(id));
            if (draftTrip.sectionIds) draftTrip.sectionIds.forEach(id => sectionSet.add(id));
        }
        return { draftStationIds: stationSet, draftSectionIds: sectionSet };
    }, [draftTrip]);

    const lodLevel = useMemo(() => {
        if (zoomLevel <= 8) return 'low';
        if (zoomLevel <= 13) return 'mid';
        return 'high';
    }, [zoomLevel]);

    const railDataForMap = useMemo(() => {
        if (!railData) return null;
        if (!('lod' in railData.sections) || !railData.sections.lod) return railData;

        const lod = railData.sections.lod;
        const activeSections = lod[lodLevel];

        return {
            ...railData,
            sections: {
                ...railData.sections,
                sections: activeSections
            }
        };
    }, [railData, lodLevel]);

    const activePrefectures = useMemo(() => {
        if (!prefectures) return null;
        if (zoomLevel <= 8) return prefectures.low;
        if (zoomLevel <= 13) return prefectures.mid;
        return prefectures.high;
    }, [prefectures, zoomLevel]);

    const activeMunicipalities = useMemo(() => {
        if (!municipalities) return null;
        if (zoomLevel <= 9) return municipalities.low;
        if (zoomLevel <= 13) return municipalities.mid;
        return municipalities.high;
    }, [municipalities, zoomLevel]);

    const { visibleStations, effectiveZoom } = useVisibleStations({
        railroadNetwork: railData,
        mapBounds,
        zoomLevel,
        usedStationIds: visitedStations
    });

    const {
        dragStartStation,
        dragPath,
        handleStationMouseDown: rawHandleStationMouseDown,
        handleStationMouseUp
    } = useTripRecorder({
        graph: graph,
        visibleStations,
        onRecordTrip,
        isEditMode,
        onDraftComplete,
        onDragUpdate,
        selectedLines,
        activeLine
    });

    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        if (onSetActiveLine) onSetActiveLine(null);
        setHoveredLine(null);

        rawHandleStationMouseDown(id, coords);
    }, [rawHandleStationMouseDown, onSetActiveLine]);

    useEffect(() => {
        if (onLengthsCalculated) {
            onLengthsCalculated(lineLengths);
        }
    }, [lineLengths, onLengthsCalculated]);

    useEffect(() => {
        if (onVisitedLengthsCalculated) {
            onVisitedLengthsCalculated(visitedLineLengths);
        }
    }, [visitedLineLengths, onVisitedLengthsCalculated]);

    useEffect(() => {
        if (onLineMappingCreated && lineIdMap.size > 0) {
            onLineMappingCreated(lineIdMap);
        }
    }, [lineIdMap, onLineMappingCreated]);


    useEffect(() => {
        if (map) {
            const pane = map.getPane('station-labels');
            if (pane) {
                pane.style.visibility = isMoving ? 'hidden' : 'visible';
                pane.style.opacity = isMoving ? '0' : '1';
                pane.style.transition = 'opacity 0.2s ease, visibility 0.2s';
            }
        }
    }, [map, isMoving]);

    useEffect(() => {
        if (map) {
            const ensurePane = (name: string, style: React.CSSProperties) => {
                if (!map.getPane(name)) {
                    map.createPane(name);
                    const pane = map.getPane(name);
                    if (pane) {
                        Object.assign(pane.style, style);
                    }
                }
            };

            ensurePane('top-tooltips', PANE_STYLES.topTooltips);
            ensurePane('background', PANE_STYLES.background);
            ensurePane('railroad-glow', PANE_STYLES.railroadGlow);
            ensurePane('railroad-casing', PANE_STYLES.railroadCasing);
            ensurePane('railroad-lines', PANE_STYLES.railroadLines);
            ensurePane('ui-elements', PANE_STYLES.uiElements);
            ensurePane('station-labels', PANE_STYLES.stationLabels);
            ensurePane('master-interactions', PANE_STYLES.masterInteractions);
            ensurePane('globalInteraction', PANE_STYLES.globalInteraction);

            const timer = setTimeout(() => {
                setMapReady(true);
                setZoomLevel(map.getZoom());
                setMapBounds(map.getBounds());
                map.invalidateSize();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [map]);

    useMapEvents({
        load: () => setMapReady(true),
        click: () => {
            if (onSetActiveLine) onSetActiveLine(null);
            if (onMapClick) onMapClick();
        },
        zoomstart: () => setIsMoving(true),
        zoomend: (e) => {
            const newZoom = e.target.getZoom();
            startTransition(() => {
                setZoomLevel(newZoom);
            });
            setIsMoving(false);
        },
        movestart: () => setIsMoving(true),
        move: () => { },
        moveend: (e) => {
            const newBounds = e.target.getBounds();
            startTransition(() => {
                setMapBounds(newBounds);
                setIsMoving(false);
            });
            if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
        }
    });

    useEffect(() => {
        if (!onLineDetailData || !graph || !railData) {
            if (onLineDetailData) onLineDetailData(null);
            return;
        }

        const segments = activeLine ? graph.getLineSegments(activeLine, railData.hierarchy) : [];
        const visitedEdges = new Set<string>();
        const visitedStationNames = new Set<string>();

        if (activeLine) {
            recordedTrips.forEach(trip => {
                if (trip.path) {
                    trip.path.forEach((sid: string) => {
                        const node = graph.getNode(sid);
                        if (node && node.fullLineId === activeLine) {
                            visitedStationNames.add(node.name);
                        }
                    });

                    for (let i = 0; i < trip.path.length - 1; i++) {
                        const key = [trip.path[i], trip.path[i + 1]].sort().join('<->');
                        visitedEdges.add(key);
                    }
                }
            });
        }

        onLineDetailData({
            segments,
            visitedEdges,
            visitedStations: visitedStationNames,
            nodes: graph.getNodes(),
            getShortestPath: (start, end, allowedLines) => graph.getShortestPath(start, end, allowedLines),
        });
    }, [activeLine, graph, railData, recordedTrips, onLineDetailData]);

    const getColor = useCallback((lineKey: string) => getLineColor(lineKey, railData) || '#666', [railData]);

    const handleStationClick = useCallback((id: string, lines?: string[]) => {
        if (onStationClick) onStationClick(id, lines);
        const st = visibleStations ? visibleStations[id] : null;
        if (st) {
            trackEvent('station_click', 'interaction', st.name);
        } else {
            trackEvent('station_click', 'interaction', id);
        }
        if (isMobile || !visibleStations || !visibleStations[id] || !onSetSelectedLines) return;
        const connectedLines = visibleStations[id].lines || [];
        if (connectedLines.length > 0) {
            const newSelection = Array.from(new Set([...selectedLines, ...connectedLines]));
            onSetSelectedLines(newSelection);
        }
    }, [onStationClick, visibleStations, onSetSelectedLines, selectedLines, isMobile]);


    useEffect(() => {
        if (!zoomTarget || !mapReady || !map || !graph || !railData) return;

        const { type, id } = zoomTarget;
        let bounds: LatLngBounds | null = null;

        if (type === 'line') {
            const segments = graph.getLineSegments(id, railData.hierarchy);
            if (segments && segments.length > 0) {
                const latlngs = segments.flatMap((seg: LineSegment) => seg.geometry.map((c: [number, number]) => [c[1], c[0]] as [number, number]));
                bounds = L.latLngBounds(latlngs);
            }
        } else if (type === 'station') {
            const node = graph.getNode(id);
            if (node) {
                map.flyTo([node.coords[1], node.coords[0]], 15, { duration: 1.5 });
            }
        }

        if (bounds && bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
        onZoomComplete?.();
    }, [zoomTarget, mapReady, map, graph, onZoomComplete, railData]);

    if (!mapReady) return null;

    return (
        <>
            {!isMobile && <MapControls
                zoom={zoomLevel}
                showLabels={showLabels}
                onToggleLabels={onToggleLabels}
            />}

            {activePrefectures && (
                <JapanMap
                    key={`pref-${lodLevel}`}
                    prefectures={activePrefectures}
                    interactive={zoomLevel <= 8}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}
            {zoomLevel > 8 && activeMunicipalities && (
                <MunicipalMap
                    key={`muni-${lodLevel}`}
                    municipalities={activeMunicipalities}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}
            {zoomLevel > 8 && activePrefectures && (
                <JapanMap
                    key={`pref-outline-${lodLevel}`}
                    prefectures={activePrefectures}
                    outlineOnly={true}
                    interactive={false}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}

            {railDataForMap && <RailroadLayer
                key={`rail-lod-${lodLevel}`}
                railroadNetwork={railDataForMap}
                selectedLines={selectedLines}
                hoveredLine={hoveredLine}
                activeLine={activeLine}
                onRailroadClick={onRailroadClick || (() => { })}
                onRailroadHover={setHoveredLine}
                zoomLevel={zoomLevel}
                isMobile={isMobile}
                isMoving={isMoving || !!dragStartStation}
                isDragging={!!dragStartStation}
                usedSectionIds={visitedSectionIds}
                draftSectionIds={draftSectionIds}
            />}

            {visibleStations && railData &&
                <Stations
                    key={`stations-lod-${lodLevel}`}
                    processedStations={visibleStations}
                    effectiveZoom={effectiveZoom}
                    realZoom={zoomLevel}
                    getColor={getColor}
                    selectedLines={selectedLines}
                    activeLine={activeLine}
                    hoveredLine={hoveredLine}
                    visitedStations={visitedStations}
                    settings={styleSettings}
                    isMobile={isMobile}
                    showLabels={showLabels}
                    isMoving={isMoving || !!dragStartStation}
                    railData={railData}
                    mapBounds={mapBounds}
                    handleStationClick={handleStationClick}
                    handleStationMouseDown={handleStationMouseDown}
                    handleStationMouseUp={handleStationMouseUp}
                    onStationHover={(id) => {
                        if (!!dragStartStation) return;
                        setHoveredLine(id);
                        if (onStationHoverExternal) onStationHoverExternal(id);
                    }}
                    dragStartStation={dragStartStation || tripStartStationId || null}
                    draftStationIds={draftStationIds}
                />
            }

            {dragPath && dragPath.length > 0 && (
                <Polyline
                    positions={dragPath.map(segment => segment.map(c => [c[1], c[0]] as [number, number])).flat() as LatLngExpression[]}
                    pathOptions={{
                        color: '#007AFF',
                        weight: 12,
                        opacity: 0.5,
                        lineCap: 'round',
                        lineJoin: 'round',
                        pane: 'ui-elements'
                    }}
                    interactive={false}
                />
            )}
            {draftTrip && (
                <Polyline
                    positions={draftTrip.geometries.map((segment: number[][]) => segment.map((c: number[]) => [c[1], c[0]] as [number, number])).flat() as LatLngExpression[]}
                    pathOptions={{
                        color: '#007AFF',
                        weight: 12,
                        opacity: 0.6,
                        lineCap: 'round',
                        lineJoin: 'round',
                        pane: 'ui-elements'
                    }}
                    interactive={false}
                />
            )}

            {isMobile && isEditMode && (
                <RulerOverlay topOffset={rulerTopOffset} />
            )}

            {railData && <OffScreenIndicator
                map={map}
                mapBounds={mapBounds}
                dragStartStation={dragStartStation}
                visibleStations={visibleStations}
            />}
        </>
    );
};

export default memo(MapPane);

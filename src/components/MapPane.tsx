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
import FloatingTooltip from './FloatingTooltip';


import { useRailData } from '../hooks/useRailData';
import { RoutingGraph } from '../lib/RoutingGraph';
import { RailData, Section } from '../types/railData';
import { useVisibleStations } from '../hooks/useVisibleStations';
import { useTripRecorder } from '../hooks/useTripRecorder';
import { usePassengerGrid } from '../hooks/usePassengerGrid';

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


    draftTrip?: Trip | null;
    onDraftComplete?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;

    onTransitionStateChange?: (isPending: boolean) => void;
    showLabels?: boolean;
    onToggleLabels?: () => void;
    tripStartStationId?: string | null;
    onStationHover?: (id: string | null) => void;
    onPrefectureClick?: (name: string) => void;
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

    draftTrip,
    onDraftComplete,
    onDragUpdate,

    onTransitionStateChange,
    showLabels = false,
    onToggleLabels,
    tripStartStationId,
    onStationHover: onStationHoverExternal,
    selectedStation,
    onPrefectureClick
}) => {
    const map = useMap();
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [floatingTooltip, setFloatingTooltip] = useState<{ content: string | null; x: number; y: number; visible: boolean }>({ content: null, x: 0, y: 0, visible: false });
    const [isMoving, setIsMoving] = useState(false);
    const [isZooming, setIsZooming] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const moveEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const zoomEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const visitedLinePhysicalConnections = new Map<string, Set<string>>();

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
                const pairKey = [section.start, section.end].sort().join('<->');

                if (!newVisitedLineLengths[lineId]) {
                    newVisitedLineLengths[lineId] = 0;
                }
                if (!visitedLinePhysicalConnections.get(lineId)) {
                    visitedLinePhysicalConnections.set(lineId, new Set());
                }

                if (!visitedLinePhysicalConnections.get(lineId)!.has(pairKey)) {
                    newVisitedLineLengths[lineId] += (section.length / 1000);
                    visitedLinePhysicalConnections.get(lineId)!.add(pairKey);
                }
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

    const passengerGrid = usePassengerGrid();

    const { visibleStations, effectiveZoom } = useVisibleStations({
        railroadNetwork: railData,
        mapBounds,
        zoomLevel,
        usedStationIds: visitedStations,
        passengerGrid,
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

        onDraftComplete,
        onDragUpdate,
        selectedLines,
        activeLine
    });

    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        if (onSetActiveLine) onSetActiveLine(null);
        setHoveredLine(null);
        setFloatingTooltip(prev => ({ ...prev, visible: false }));

        rawHandleStationMouseDown(id, coords);
    }, [rawHandleStationMouseDown, onSetActiveLine]);

    const handleTooltipUpdate = useCallback((content: string | null, x: number, y: number) => {
        setFloatingTooltip({ content, x, y, visible: !!content });
    }, []);


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


    // Hide labels and show subtle fade when moving or switching LOD
    const [isLODChanging, setIsLODChanging] = useState(false);
    useEffect(() => {
        setIsLODChanging(true);
        const timer = setTimeout(() => setIsLODChanging(false), 300);
        return () => clearTimeout(timer);
    }, [lodLevel]);

    // Transition State: Covers moving, zooming, LOD switches, and React's pending state
    const isInteractionHidden = isMoving || isZooming || isLODChanging || isPending;

    // Internal state to manage the visual "reveal" of the map after transformations
    const [isSettled, setIsSettled] = useState(true);

    useEffect(() => {
        if (isInteractionHidden) {
            setIsSettled(false);
        } else {
            // Force a Canvas clear to prevent ghosting from previous frames
            const panesToClear = ['station-labels', 'railroad-lines', 'railroad-casing', 'railroad-glow'];
            panesToClear.forEach(p => {
                const pane = map.getPane(p);
                const canvas = pane?.querySelector('canvas');
                if (canvas instanceof HTMLCanvasElement) {
                    const ctx = canvas.getContext('2d');
                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
            });

            // Wait until React transitions and Canvas redraw have likely stabilized
            const timer = setTimeout(() => {
                setIsSettled(true);
            }, 120); // Settle time (roughly 2-3 frames + buffer)
            return () => clearTimeout(timer);
        }
    }, [isInteractionHidden, map]);

    const isVisibleToUser = !isInteractionHidden && isSettled;

    useEffect(() => {
        if (map) {
            const panes = ['station-labels', 'railroad-lines', 'railroad-casing', 'railroad-glow', 'top-tooltips'];
            panes.forEach(p => {
                const pane = map.getPane(p);
                if (pane) {
                    if (p === 'station-labels' || p === 'top-tooltips') {
                        // Strictly hide station dots, labels, and tooltips during any movement
                        // But keep them visible if we are currently dragging to draw a route
                        if (!isVisibleToUser && !dragStartStation) {
                            pane.style.transition = 'none';
                            pane.style.opacity = '0';
                            pane.style.visibility = 'hidden';
                        } else {
                            pane.style.transition = 'opacity 0.2s ease-out';
                            pane.style.opacity = '1';
                            pane.style.visibility = 'visible';
                        }
                    } else {
                        // Keep railroad lines/casing/glow visible but dimmed during transformations
                        // This provides moving context as the user requested
                        if (isInteractionHidden) {
                            pane.style.transition = 'opacity 0.1s ease-out';
                            pane.style.opacity = '0.4';
                        } else {
                            pane.style.transition = 'opacity 0.3s ease-out';
                            pane.style.opacity = '1';
                        }
                        pane.style.visibility = 'visible';
                    }
                }
            });
        }
    }, [map, isVisibleToUser, isInteractionHidden]);

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
            try {
                map?.closeTooltip?.();
            } catch (err) { /* ignore */ }
        },
        zoomstart: () => {
            setIsMoving(true);
            setIsZooming(true);
            try {
                map?.closeTooltip?.();
            } catch (err) { /* ignore */ }
        },
        zoomend: (e) => {
            const newZoom = e.target.getZoom();
            startTransition(() => {
                setZoomLevel(newZoom);
            });

            if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
            zoomEndTimeoutRef.current = setTimeout(() => {
                setIsMoving(false);
                setIsZooming(false);
            }, 400); // Further increased grace period for stable redraw
        },
        movestart: () => {
            setIsMoving(true);
            try {
                map?.closeTooltip?.();
            } catch (err) { /* ignore */ }
        },
        move: () => { },
        moveend: (e) => {
            const newBounds = e.target.getBounds();
            startTransition(() => {
                setMapBounds(newBounds);
            });

            if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
            moveEndTimeoutRef.current = setTimeout(() => {
                setIsMoving(false);
            }, 100);
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
                // Primary: Use sectionIds to get exact edges including joints
                if (trip.sectionIds && trip.sectionIds.length > 0) {
                    trip.sectionIds.forEach(sid => {
                        const section = graph.sectionsMap.get(Number(sid));
                        if (section) {
                            const key = [section.start, section.end].sort().join('<->');
                            visitedEdges.add(key);
                        }
                    });
                }

                // Secondary: Path-based nodes (for station stats & fallback)
                if (trip.path) {
                    trip.path.forEach((sid: string) => {
                        const node = graph.getNode(sid);
                        if (node && node.fullLineId === activeLine) {
                            visitedStationNames.add(node.name);
                        }
                    });

                    // Only backup if no sectionIds provided
                    if (!trip.sectionIds || trip.sectionIds.length === 0) {
                        for (let i = 0; i < trip.path.length - 1; i++) {
                            const key = [trip.path[i], trip.path[i + 1]].sort().join('<->');
                            visitedEdges.add(key);
                        }
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

    const isTransforming = isMoving || isZooming || isLODChanging || isPending || !!dragStartStation;

    if (!mapReady) return null;

    return (
        <>
            {!isMobile && <MapControls
                zoom={zoomLevel}
            />}

            {activePrefectures && (
                <JapanMap
                    key={`pref-solid-${zoomLevel <= 8 ? 'low' : zoomLevel <= 13 ? 'mid' : 'high'}`}
                    prefectures={activePrefectures}
                    interactive={zoomLevel <= 8}
                    onPrefectureClick={onPrefectureClick}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}
            {zoomLevel > 8 && activeMunicipalities && (
                <MunicipalMap
                    key={`muni-${zoomLevel <= 9 ? 'low' : zoomLevel <= 13 ? 'mid' : 'high'}`}
                    municipalities={activeMunicipalities}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}
            {zoomLevel > 8 && activePrefectures && (
                <JapanMap
                    key={`pref-outline-${zoomLevel <= 8 ? 'low' : zoomLevel <= 13 ? 'mid' : 'high'}`}
                    prefectures={activePrefectures}
                    outlineOnly={true}
                    interactive={false}
                    zoom={zoomLevel}
                    pane="background"
                />
            )}

            {railDataForMap && (
                <RailroadLayer
                    railroadNetwork={railDataForMap}
                    selectedLines={selectedLines}
                    hoveredLine={hoveredLine}
                    activeLine={activeLine}
                    onRailroadClick={onRailroadClick || (() => { })}
                    onRailroadHover={setHoveredLine}
                    zoomLevel={zoomLevel}
                    isMobile={isMobile}
                    isMoving={isTransforming}
                    isDragging={!!dragStartStation}
                    usedSectionIds={visitedSectionIds}
                    draftSectionIds={draftSectionIds}
                    settings={styleSettings}
                    onTooltipUpdate={handleTooltipUpdate}
                />

            )}

            {visibleStations && railData &&
                <Stations
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
                    isMoving={isInteractionHidden}
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
                    selectedStation={selectedStation}
                    onTooltipUpdate={handleTooltipUpdate}
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



            {railData && <OffScreenIndicator
                map={map}
                mapBounds={mapBounds}
                dragStartStation={dragStartStation}
                visibleStations={visibleStations}
            />
            }

            <FloatingTooltip {...floatingTooltip} />
        </>

    );
};

export default memo(MapPane);

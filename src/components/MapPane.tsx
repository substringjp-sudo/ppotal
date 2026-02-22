"use client";

import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { Language } from '../lib/translations';
import { useMap, useMapEvents, Pane, Polyline } from 'react-leaflet';
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
    language: Language;

    onSetSelectedLines?: (lines: string[]) => void;
    onSetActiveLine?: (line: string | null) => void;
    isMobile: boolean;
    selectedStation?: string; // Passed from parent
    onMapClick?: () => void;

    // New Props for Edit Mode
    isEditMode?: boolean;
    draftTrip?: Trip | null;
    onDraftComplete?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    rulerTopOffset?: number;
}

const PANE_STYLES = {
    topTooltips: { zIndex: 1000, pointerEvents: 'none' as const },
    globalInteraction: { zIndex: 950 }, // 상호작용 전용 투명 레이어
    stationLabels: { zIndex: 880, pointerEvents: 'none' as const },
    stationInteractions: { zIndex: 850, pointerEvents: 'none' as const }, // 시각 전용
    railroadLines: { zIndex: 820, pointerEvents: 'none' as const },    // 시각 전용
    railroadCasing: { zIndex: 815, pointerEvents: 'none' as const },
    railroadGlow: { zIndex: 810, pointerEvents: 'none' as const },
    uiElements: { zIndex: 818, pointerEvents: 'none' as const },
    background: { zIndex: 100 },
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
    language,
    onSetSelectedLines,
    onSetActiveLine,
    isMobile,
    onMapClick,
    isEditMode = false,
    draftTrip,
    onDraftComplete,
    onDragUpdate,
    rulerTopOffset = 80
}) => {
    // 1. Map Data & State
    const map = useMap();
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const moveEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { prefectures, municipalities } = useMapData();
    const { railData } = useRailData();

    // 2. Graph & Calculations
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

        // 1. Get unique section IDs from all trips
        const uniqueSectionIds = new Set<number>();
        recordedTrips.forEach(trip => {
            if (trip.sectionIds) {
                trip.sectionIds.forEach(sid => uniqueSectionIds.add(sid));
            }
        });

        // 2. Map unique sections to line IDs and sum their lengths
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

    // 3. Visible Stations (Spatial Culling)
    const { visibleStations, effectiveZoom } = useVisibleStations({
        railroadNetwork: railData,
        mapBounds,
        zoomLevel,
        lineIdMap,
        isMoving,
        usedStationIds: visitedStations
    });

    // 4. Interactions (Trip Recording / Dragging)
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

    // Wrap handleStationMouseDown to clear other highlights (User requirement)
    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        // Clear active highlights immediately
        if (onSetActiveLine) onSetActiveLine(null);
        setHoveredLine(null);

        // Call the original handler
        rawHandleStationMouseDown(id, coords);
    }, [rawHandleStationMouseDown, onSetActiveLine]);

    // Notify parent about calculations
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
            Promise.resolve().then(() => {
                setMapReady(true);
                setZoomLevel(map.getZoom());
                setMapBounds(map.getBounds());
                map.invalidateSize();
            });
        }
    }, [map]);

    // Map Events
    useMapEvents({
        load: () => setMapReady(true),
        click: () => {
            if (onSetActiveLine) onSetActiveLine(null);
            if (onMapClick) onMapClick();
        },
        zoomstart: () => setIsMoving(true),
        zoomend: (e) => {
            setZoomLevel(e.target.getZoom());
            setIsMoving(false);
        },
        movestart: () => setIsMoving(true),
        move: (e) => {
            if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
            moveEndTimeoutRef.current = setTimeout(() => {
                setMapBounds(e.target.getBounds());
            }, 100); // 100ms for more responsive updates during drag
        },
        moveend: (e) => {
            setMapBounds(e.target.getBounds());
            setIsMoving(false);
            if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
        }
    });

    // Handle Active Line Detail Data
    useEffect(() => {
        if (!activeLine || !graph || !railData || !onLineDetailData) {
            if (onLineDetailData) onLineDetailData(null);
            return;
        }

        const segments = graph.getLineSegments(activeLine, railData.hierarchy);
        const visitedEdges = new Set<string>();
        const visitedStationNames = new Set<string>();

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


    // Zoom Handling
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
            {!isMobile && <MapControls zoom={zoomLevel} />}
            <Pane name="top-tooltips" style={PANE_STYLES.topTooltips} />
            <Pane name="background" style={PANE_STYLES.background}>
                <JapanMap prefectures={prefectures} interactive={zoomLevel <= 8 && !isMoving} zoom={zoomLevel} />
                {zoomLevel > 8 && municipalities && <MunicipalMap municipalities={municipalities} zoom={zoomLevel} />}
                {zoomLevel > 8 && prefectures && <JapanMap prefectures={prefectures} outlineOnly={true} interactive={false} zoom={zoomLevel} />}
            </Pane>

            <Pane name="railroad-glow" style={PANE_STYLES.railroadGlow} />
            <Pane name="railroad-casing" style={PANE_STYLES.railroadCasing} />
            <Pane name="railroad-lines" style={PANE_STYLES.railroadLines} />
            <Pane name="station-interactions" style={PANE_STYLES.stationInteractions} />
            <Pane name="station-labels" style={PANE_STYLES.stationLabels} />
            <Pane name="globalInteraction" style={PANE_STYLES.globalInteraction} />

            {railData && <RailroadLayer
                railroadNetwork={railData}
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
            />}

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
                    language={language}
                    isMobile={isMobile}
                    isMoving={isMoving || !!dragStartStation} // Pass combined dragging state
                    railData={railData}
                    mapBounds={mapBounds}
                    handleStationClick={handleStationClick}
                    handleStationMouseDown={handleStationMouseDown}
                    handleStationMouseUp={handleStationMouseUp}
                    onStationHover={(id) => {
                        if (!!dragStartStation) return; // Suppress station-based line highlights during dragging
                        setHoveredLine(id);
                    }}
                    dragStartStation={dragStartStation}
                />
            }

            <Pane name="ui-elements" style={PANE_STYLES.uiElements}>
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
                            color: '#ff9800',
                            weight: 12,
                            opacity: 0.5,
                            lineCap: 'round',
                            lineJoin: 'round',
                            pane: 'ui-elements'
                        }}
                        interactive={false}
                    />
                )}
            </Pane>

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

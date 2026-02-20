"use client";

import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { Language } from '../lib/translations';
import { useMap, useMapEvents, Pane, Polyline } from 'react-leaflet';
import L, { LatLngBounds, LatLngExpression } from 'leaflet';

import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Stations from './Stations';
import RailroadLayer from './RailroadLayer';
import TripLayer from './TripLayer';
import { StationNode, LineSegment } from '../lib/graphUtils';
import { getLineColor } from '../lib/lineColors';
import { MapStyleSettings } from '../app/page';
import { trackEvent } from '../lib/gtag';
import MapControls from './MapControls';
import OffScreenIndicator from './OffScreenIndicator';

import { useRailData } from '../hooks/useRailData';
import { RoutingGraph } from '../lib/RoutingGraph';
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
        getShortestPath: (start: string, end: string, allowedLines?: string[]) => { path: string[], distance: number, geometries: [number, number][][] } | null
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

    // Routing Props
    routeStart?: string | null;
    routeEnd?: string | null;
    onRouteResult?: (result: any) => void;
}

const PANE_STYLES = {
    topTooltips: { zIndex: 1000 },
    stationInteract: { zIndex: 900 },
    uiElements: { zIndex: 850 },
    railroadLines: { zIndex: 820 },
    railroadCasing: { zIndex: 815 },
    railroadGlow: { zIndex: 810 },
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
    selectedStation,
    onMapClick,
    isEditMode = false,
    draftTrip,
    onDraftComplete,
    onDragUpdate,
    rulerTopOffset = 80,
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
        if (!graph) {
            return {
                lineIdMap: new Map<string, string>(),
                lineLengths: {},
                visitedLineLengths: {},
            };
        }
        const newVisitedLineLengths: Record<string, number> = {};
        recordedTrips.forEach(trip => {
            if (!trip.path) return;
            for (let i = 0; i < trip.path.length - 1; i++) {
                const node1Id = trip.path[i];
                const node2Id = trip.path[i + 1];

                const node1 = graph.getNode(node1Id);
                const edge = graph.getEdge(node1Id, node2Id);

                if (node1 && edge && node1.fullLineId) {
                    const lineId = node1.fullLineId;
                    newVisitedLineLengths[lineId] = (newVisitedLineLengths[lineId] || 0) + edge.distance;
                }
            }
        });

        return {
            lineIdMap: graph.getLineIdMap(),
            lineLengths: graph.getLineLengths(),
            visitedLineLengths: newVisitedLineLengths,
        };
    }, [graph, recordedTrips]);


    // 3. Visible Stations (Spatial Culling)
    const { visibleStations } = useVisibleStations({
        railroadNetwork: railData,
        mapBounds,
        zoomLevel,
        lineIdMap,
        isMoving
    });

    // 4. Interactions (Trip Recording / Dragging)
    const {
        dragStartStation,
        dragPath,
        handleStationMouseDown
    } = useTripRecorder({
        graph: graph as any,
        visibleStations,
        onRecordTrip,
        isEditMode,
        onDraftComplete,
        onDragUpdate
    });

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
            setMapReady(true);
            setZoomLevel(map.getZoom());
            setMapBounds(map.getBounds());
            map.invalidateSize();
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
        zoom: (e) => {
            const z = e.target.getZoom();
            if (Math.abs(z - zoomLevel) > 0.1) setZoomLevel(z);
        },
        zoomend: (e) => {
            setZoomLevel(e.target.getZoom());
            setIsMoving(false);
        },
        movestart: () => setIsMoving(true),
        move: (e) => {
            if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
            moveEndTimeoutRef.current = setTimeout(() => {
                setMapBounds(e.target.getBounds());
            }, 150);
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

    const handleRailroadClick = useCallback((line: string) => {
        if (onRailroadClick) onRailroadClick(line);
        if (onSetActiveLine) onSetActiveLine(line);
        trackEvent('line_click', 'interaction', line);
    }, [onRailroadClick, onSetActiveLine]);

    const handleRailroadHover = useCallback((lineId: string | null) => {
        if (isMobile) return;
        setHoveredLine(lineId);
    }, [isMobile]);

    const handleStationClick = useCallback((name: string, lines?: string[]) => {
        if (onStationClick) onStationClick(name, lines);
        trackEvent('station_click', 'interaction', name);
        if (isMobile || !visibleStations || !visibleStations[name] || !onSetSelectedLines) return;
        const connectedLines = visibleStations[name].lines || [];
        if (connectedLines.length > 0) {
            const newSelection = Array.from(new Set([...selectedLines, ...connectedLines]));
            onSetSelectedLines(newSelection);
        }
    }, [onStationClick, visibleStations, onSetSelectedLines, selectedLines, isMobile]);

    const visitedStations = useMemo(() => {
        const set = new Set<string>();
        if (!graph) return set;
        recordedTrips.forEach(trip => {
            if (trip.path) {
                trip.path.forEach((nodeId: string) => {
                    const node = graph.getNode(nodeId);
                    if (node && node.name) set.add(node.name);
                    else set.add(nodeId);
                });
            }
        });
        return set;
    }, [recordedTrips, graph]);

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
            const stationNodes = graph.getNodesByName(id);
            if (stationNodes.length > 0) {
                const node = stationNodes[0];
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
                <JapanMap prefectures={prefectures} getColor={getColor} interactive={zoomLevel <= 8 && !isMoving} zoom={zoomLevel} />
                {zoomLevel > 8 && municipalities && !isMoving && <MunicipalMap municipalities={municipalities} getColor={getColor} zoom={zoomLevel} />}
                {zoomLevel > 8 && prefectures && !isMoving && <JapanMap prefectures={prefectures} getColor={getColor} outlineOnly={true} interactive={false} zoom={zoomLevel} />}
            </Pane>

            <Pane name="railroad-glow" style={PANE_STYLES.railroadGlow} />
            <Pane name="railroad-casing" style={PANE_STYLES.railroadCasing} />
            <Pane name="railroad-lines" style={PANE_STYLES.railroadLines} />

            {railData && <RailroadLayer
                railroadNetwork={railData}
                selectedLines={selectedLines}
                hoveredLine={hoveredLine}
                activeLine={activeLine}
                onRailroadClick={handleRailroadClick}
                onRailroadHover={handleRailroadHover}
                zoomLevel={zoomLevel}
                isMobile={isMobile}
                isMoving={isMoving}
                language={language}
            />}

            <Pane name="ui-elements" style={PANE_STYLES.uiElements}>
                <TripLayer recordedTrips={recordedTrips} zoomLevel={zoomLevel} isMoving={isMoving} />
                {dragPath && dragPath.length > 0 && (
                    <Polyline
                        positions={dragPath.map(segment => segment.map(c => [c[1], c[0]] as [number, number])).flat() as LatLngExpression[]}
                        pathOptions={{
                            color: '#007AFF',
                            weight: 6 * (zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0),
                            opacity: 0.8,
                            dashArray: '10, 10',
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
                            weight: 6,
                            opacity: 0.9,
                            dashArray: '5, 10',
                            lineCap: 'round',
                            lineJoin: 'round',
                            pane: 'ui-elements'
                        }}
                        interactive={false}
                    />
                )}
            </Pane>

            <Pane name="station-interact" style={PANE_STYLES.stationInteract}>
                {visibleStations && railData &&
                    <Stations
                        processedStations={visibleStations}
                        highlightedStations={[]}
                        handleStationClick={handleStationClick}
                        zoom={zoomLevel}
                        getColor={getColor}
                        selectedLines={selectedLines}
                        activeLine={activeLine}
                        hoveredLine={hoveredLine}
                        onStationMouseDown={handleStationMouseDown}
                        onStationMouseUp={() => { }}
                        dragStartStation={dragStartStation}
                        onLineMappingCreated={onLineMappingCreated}
                        visitedStations={visitedStations}
                        settings={styleSettings}
                        language={language}
                        isMobile={isMobile}
                        selectedStation={selectedStation}
                        isEditMode={isEditMode}
                        isMoving={isMoving}
                        railData={railData}
                    />
                }
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

"use client";

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Language } from '../lib/translations';
import { useMap, useMapEvents, Pane, Polyline } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';

import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Stations from './Stations';
import RailroadLayer from './RailroadLayer';
import TripLayer from './TripLayer';
import { StationNode } from '../lib/graphUtils';
import { getOfficialColor } from '../lib/lineColors';
import { MapStyleSettings } from '../app/page';
import { trackEvent } from '../lib/gtag';
import MapControls from './MapControls';
import OffScreenIndicator from './OffScreenIndicator';

import { useMapData } from '../hooks/useMapData';
import { useRailroadGraph } from '../hooks/useRailroadGraph';
import { useVisibleStations } from '../hooks/useVisibleStations';
import { useTripRecorder } from '../hooks/useTripRecorder';
import RulerOverlay from './RulerOverlay';

interface MapPaneProps {
    selectedLines: string[];
    recordedTrips: any[];
    onRecordTrip?: (trip: any) => void;
    onRailroadClick?: (line: string) => void;
    onStationClick?: (name: string, lines?: string[]) => void;
    onLengthsCalculated?: (lengths: Record<string, number>) => void;
    onVisitedLengthsCalculated?: (lengths: Record<string, number>) => void;
    activeLine: string | null;
    zoomToLine?: string | null;
    zoomToStation?: string | null;
    onLineDetailData?: (data: {
        segments: any[],
        visitedEdges: Set<string>,
        visitedStations: Set<string>,
        nodes: Map<string, StationNode>,
        getShortestPath: any
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
    draftTrip?: any;
    onDraftComplete?: (trip: any) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    rulerTopOffset?: number;
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
    isEditMode = false, // Add default
    draftTrip,
    onDraftComplete,
    onDragUpdate,
    rulerTopOffset = 80 // Default fallback
}) => {
    // 1. Map Data & State
    const map = useMap();
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [highlightedStations, setHighlightedStations] = useState<string[]>([]);
    const [stationMapping, setStationMapping] = useState<Map<string, string>>(new Map());

    const { prefectures, municipalities, railroadNetwork, stationMasterList, hierarchy } = useMapData();

    // 2. Graph & Calculations
    const { graph, lineIdMap, lineLengths, visitedLineLengths } = useRailroadGraph(railroadNetwork, recordedTrips);

    // 3. Visible Stations (Spatial Culling)
    const { visibleStations } = useVisibleStations({
        railroadNetwork,
        mapBounds,
        zoomLevel,
        lineIdMap,
        hierarchy,
        stationMasterList
    });

    // 4. Interactions (Trip Recording / Dragging)
    const {
        dragStartStation,
        dragStartCoords,
        dragPath,
        handleStationMouseDown
    } = useTripRecorder({
        graph,
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

    // Initialize Map State
    useEffect(() => {
        if (map) {
            setMapReady(true);
            setZoomLevel(map.getZoom());
            setMapBounds(map.getBounds());

            // Allow map to update size when container changes (e.g. mobile bar)
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
        zoom: (e) => setZoomLevel(e.target.getZoom()),
        zoomend: (e) => setZoomLevel(e.target.getZoom()),
        move: (e) => setMapBounds(e.target.getBounds()),
        moveend: (e) => setMapBounds(e.target.getBounds())
    });

    // Handle Active Line Detail Data
    useEffect(() => {
        if (!activeLine || !graph || !onLineDetailData) {
            if (onLineDetailData) onLineDetailData(null);
            return;
        }

        const segments = graph.getLineSegments(activeLine);
        const visitedEdges = new Set<string>();
        const visitedStationNames = new Set<string>();

        recordedTrips.forEach(trip => {
            if (trip.path) {
                trip.path.forEach((sid: string) => {
                    const node = graph.nodes.get(sid);
                    if (node?.fullLineName === activeLine) {
                        visitedStationNames.add(node.name);
                    }
                });

                for (let i = 0; i < trip.path.length - 1; i++) {
                    const uId = trip.path[i];
                    const vId = trip.path[i + 1];
                    const nodeU = graph.nodes.get(uId);
                    const nodeV = graph.nodes.get(vId);

                    if (nodeU?.fullLineName === activeLine && nodeV?.fullLineName === activeLine) {
                        const key = [nodeU.name, nodeV.name].sort().join('<->');
                        visitedEdges.add(key);
                    }
                }
            }
        });

        onLineDetailData({
            segments,
            visitedEdges,
            visitedStations: visitedStationNames,
            nodes: graph.nodes,
            getShortestPath: (start: string, end: string, allowedLines?: string[]) => {
                return graph.getShortestPath(start, end, allowedLines);
            }
        });
    }, [activeLine, graph, recordedTrips, onLineDetailData]);

    const getColor = useCallback((lineKey: string) => {
        return getOfficialColor(lineKey) || '#666';
    }, []);

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

        if (isMobile) return;

        // Auto-select connected lines
        if (visibleStations && visibleStations[name] && onSetSelectedLines) {
            const connectedLines = visibleStations[name].lines || [];
            if (connectedLines.length > 0) {
                const newSelection = Array.from(new Set([...selectedLines, ...connectedLines]));
                onSetSelectedLines(newSelection);
            }
        }
    }, [onStationClick, visibleStations, onSetSelectedLines, selectedLines, isMobile]);

    const handleStationMouseUp = (name: string) => {
        // Redundant with global mouseup handler which handles snapping.
    };

    // Logic for Trip Recording from manual calls (e.g. LineDetailPane)
    // NOTE: This is distinct from 'mouse drag' recording which is handled in useTripRecorder
    const handleRecordTrip = (start: string, end: string, endCoordsOverride?: [number, number]) => {
        // Re-implement or access graph directly?
        // Need access to graph.
        if (!graph || !visibleStations || !visibleStations[end]) return;

        const endStationData = visibleStations[end];
        const endCoords: [number, number] = endCoordsOverride || [endStationData.centroid[1], endStationData.centroid[0]];

        // Need dragStartCoords?
        // Since this is called from UI (not drag), dragStartCoords is usually null.

        const pathData = graph.getShortestPathByName(
            start,
            end,
            selectedLines,
            undefined,
            endCoords
        );

        if (pathData && onRecordTrip) {
            onRecordTrip({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                start: start,
                end: end,
                ...pathData
            });
        }
    };

    const visitedStations = useMemo(() => {
        const set = new Set<string>();
        recordedTrips.forEach(trip => {
            if (trip.path) {
                trip.path.forEach((nodeId: string) => {
                    set.add(nodeId);
                });
            }
        });
        return set;
    }, [recordedTrips]);

    // Zoom Handling
    useEffect(() => {
        if (!zoomTarget || !mapReady || !railroadNetwork || !map) return;

        const { type, id } = zoomTarget;
        let bounds: LatLngBounds | null = null;

        if (type === 'line') {
            const route = railroadNetwork.routes.find((r: any) => r.id === zoomTarget.id);
            if (route) {
                bounds = L.latLngBounds([]);
                route.edges.forEach((edge: any) => {
                    edge.geometry.forEach((c: any) => bounds!.extend([c[1], c[0]]));
                });
            }
        } else if (type === 'station') {
            const stationName = zoomTarget.id;
            const allStations = Object.values(railroadNetwork.stations as Record<string, any>);
            const stationData = allStations.find(s => s.name === stationName);

            if (stationData) {
                const [lng, lat] = stationData.coords;
                map.flyTo([lat, lng], 15, { duration: 1.5 });
            }
        }

        if (bounds && bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }

        onZoomComplete?.();
    }, [zoomTarget, mapReady, railroadNetwork, map, onZoomComplete]);

    if (!mapReady) return null;

    return (
        <>
            {!isMobile && <MapControls zoom={zoomLevel} />}
            <Pane name="top-tooltips" style={PANE_STYLES.topTooltips} />
            <Pane name="background" style={PANE_STYLES.background}>
                <JapanMap
                    prefectures={prefectures}
                    onPrefectureClick={() => { }}
                    getColor={getColor}
                    interactive={zoomLevel <= 8}
                    zoom={zoomLevel}
                />
                {zoomLevel > 8 && municipalities && (
                    <MunicipalMap
                        municipalities={municipalities}
                        getColor={getColor}
                        zoom={zoomLevel}
                    />
                )}
                {zoomLevel > 8 && prefectures &&
                    <JapanMap
                        prefectures={prefectures}
                        getColor={getColor}
                        outlineOnly={true}
                        interactive={false}
                        zoom={zoomLevel}
                    />
                }
            </Pane>

            <Pane name="railroad-glow" style={PANE_STYLES.railroadGlow} />
            <Pane name="railroad-casing" style={PANE_STYLES.railroadCasing} />
            <Pane name="railroad-lines" style={PANE_STYLES.railroadLines} />

            <RailroadLayer
                railroadNetwork={railroadNetwork}
                selectedLines={selectedLines}
                hoveredLine={hoveredLine}
                activeLine={activeLine}
                onRailroadClick={handleRailroadClick}
                onRailroadHover={handleRailroadHover}
                zoomLevel={zoomLevel}
                isMobile={isMobile}
            />

            <Pane name="ui-elements" style={PANE_STYLES.uiElements}>
                <TripLayer recordedTrips={recordedTrips} zoomLevel={zoomLevel} />
                {dragPath && dragPath.length > 0 && (
                    <React.Fragment>
                        {dragPath.map((segment, idx) => (
                            <Polyline
                                key={`drag-path-${idx}`}
                                positions={segment.map(c => [c[1], c[0]])}
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
                        ))}
                    </React.Fragment>
                )}
                {draftTrip && (
                    <React.Fragment>
                        {draftTrip.geometries.map((segment: any, idx: number) => (
                            <Polyline
                                key={`draft-path-${idx}`}
                                positions={segment.map((c: any) => [c[1], c[0]])}
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
                        ))}
                    </React.Fragment>
                )}
            </Pane>

            <Pane name="station-interact" style={PANE_STYLES.stationInteract}>
                {visibleStations &&
                    <Stations
                        processedStations={visibleStations}
                        highlightedStations={highlightedStations}
                        handleStationClick={handleStationClick}
                        zoom={zoomLevel}
                        getColor={getColor}
                        selectedLines={selectedLines}
                        activeLine={activeLine}
                        hoveredLine={hoveredLine}
                        onStationMouseDown={handleStationMouseDown}
                        onStationMouseUp={handleStationMouseUp}
                        dragStartStation={dragStartStation}
                        onLineMappingCreated={onLineMappingCreated}
                        visitedStations={visitedStations} // Pass visitedStations
                        settings={styleSettings}
                        language={language}
                        isMobile={isMobile}
                        selectedStation={selectedStation}
                        isEditMode={isEditMode}
                    />
                }
            </Pane>

            {isMobile && isEditMode && (
                <RulerOverlay topOffset={rulerTopOffset} />
            )}

            <OffScreenIndicator
                map={map}
                mapBounds={mapBounds}
                dragStartStation={dragStartStation}
                visibleStations={visibleStations}
            />
        </>
    );
};

export default memo(MapPane);

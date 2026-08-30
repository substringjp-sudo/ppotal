"use client";

import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { useMap, useMapEvents, Polyline, CircleMarker, Marker } from 'react-leaflet';
import L, { LatLngBounds, LatLngExpression } from 'leaflet';

import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import AirportLayer from './AirportLayer';
import Stations from './Stations';
import RailroadLayer from './RailroadLayer';
import { StationNode, LineSegment, getSectionMap } from '../lib/graphUtils';
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
import { MOBILE_CHROME, LONG_PRESS_MS } from '../lib/mobile';
import { usePassengerGrid } from '../hooks/usePassengerGrid';

import { Trip } from '../types/trip';
import { useMapData } from '../hooks/useMapData';
import { useZoomBounce } from '../hooks/useZoomBounce';
import { useViewportSections } from '../hooks/useViewportSections';
import LandTileLayer from './LandTileLayer';
import { themeOf, isLattice } from '../lib/mapThemes';
import { Z } from '../lib/layers';

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
        getShortestPath: (start: string, end: string, allowedLines?: string[]) => Promise<{ path: string[], sectionIds: number[], distance: number, geometries: [number, number][][] } | null>
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
    leftBound?: number;
    rightBound?: number;
    isHoverLoading?: boolean;
    isRecordingLoading?: boolean;
    regionevelVisits?: any[];
}

const PANE_STYLES = {
    topTooltips: { zIndex: 1000, pointerEvents: 'none' as const, overflow: 'visible' },
    masterInteractions: { zIndex: 950, pointerEvents: 'none' as const, overflow: 'visible' },
    stationLabels: { zIndex: 880, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadLines: { zIndex: 820, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadCasing: { zIndex: 815, pointerEvents: 'none' as const, overflow: 'visible' },
    railroadGlow: { zIndex: 810, pointerEvents: 'none' as const, overflow: 'visible' },
    uiElements: { zIndex: 900, pointerEvents: 'none' as const, overflow: 'visible' },
    airportIcons: { zIndex: 870, pointerEvents: 'auto' as const, overflow: 'visible' },
    airports: { zIndex: 450, pointerEvents: 'auto' as const, overflow: 'visible' },
    background: { zIndex: 100, pointerEvents: 'none' as const, overflow: 'visible' },
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
    onPrefectureClick,
    leftBound,
    rightBound,
    isHoverLoading,
    isRecordingLoading,
    regionevelVisits
}) => {
    const map = useMap();
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const { triggerBounce } = useZoomBounce(map, { minZoom: 4, maxZoom: 18 });
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [floatingTooltip, setFloatingTooltip] = useState<{
        content: string | null;
        x: number;
        y: number;
        visible: boolean;
        priority: 'low' | 'high';
    }>({ content: null, x: 0, y: 0, visible: false, priority: 'low' });
    const [isMoving, setIsMoving] = useState(false);
    const [isZooming, setIsZooming] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const moveEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const boundsSettleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dragStartStationRef = useRef<string | null>(null);
    const zoomEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        onTransitionStateChange?.(isPending);
    }, [isPending, onTransitionStateChange]);

    const { prefectures, municipalities, airports } = useMapData();
    const { railData } = useRailData();

    // Apply paper-theme-active class for texture and filters
    useEffect(() => {
        if (!map) return;
        const container = map.getContainer();
        const theme = styleSettings.theme;
        if (theme === 'paper') {
            container.classList.add('paper-theme-active');
        } else {
            container.classList.remove('paper-theme-active');
        }
        return () => {
            container.classList.remove('paper-theme-active');
        };
    }, [map, styleSettings.theme]);

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

        const sectionMap = getSectionMap(railData);
        uniqueSectionIds.forEach(sid => {
            const section = sectionMap.get(sid);
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

    const lodSections = useMemo(() => {
        if (!railData) return null;
        if (!('lod' in railData.sections) || !railData.sections.lod) return railData.sections.sections;
        return railData.sections.lod[lodLevel];
    }, [railData, lodLevel]);

    // Only the sections that can be on screen reach Leaflet — see the hook.
    const sectionWindow = useViewportSections(lodSections, mapBounds);

    const railDataForMap = useMemo(() => {
        if (!railData) return null;
        return {
            ...railData,
            sections: {
                ...railData.sections,
                sections: sectionWindow.sections
            }
        };
    }, [railData, sectionWindow]);

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

    // Was stringified inline in the key, so it re-ran on every render — which,
    // now that renders track the map instead of being deferred, is every frame
    // of a pan.
    const municipalVisitKey = useMemo(
        () => `${regionevelVisits?.length || 0}-${JSON.stringify(regionevelVisits || []).slice(-50)}`,
        [regionevelVisits]
    );

    const theme = useMemo(() => themeOf(styleSettings.theme), [styleSettings.theme]);
    const landIsLattice = isLattice(styleSettings.landForm);

    // The tiles are sampled from the rail canvas, so anything that changes how
    // the rails look has to trigger a resample — not just which rails are
    // loaded, but their shape, their weight at this zoom, and which of them are
    // selected, active or already ridden.
    const railRevision = useMemo(
        () => `${sectionWindow.revision}|${styleSettings.shapeMode}|${zoomLevel}|${selectedLines.length}|${activeLine ?? ''}|${visitedSectionIds.size}`,
        [sectionWindow.revision, styleSettings.shapeMode, zoomLevel, selectedLines.length, activeLine, visitedSectionIds]
    );

    // The sea is the map container's own background, so it is set directly.
    useEffect(() => {
        const container = map?.getContainer();
        if (container) container.style.background = theme.sea;
    }, [map, theme]);

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
        handleStationMouseUp: rawHandleStationMouseUp,
        snapCandidate,
        pressCandidate
    } = useTripRecorder({
        railData,
        visibleStations,
        onRecordTrip,

        onDraftComplete,
        onDragUpdate,
        selectedLines,
        activeLine,
        isMobile
    });

    useEffect(() => {
        dragStartStationRef.current = dragStartStation;
    }, [dragStartStation]);

    useEffect(() => () => {
        if (boundsSettleTimeoutRef.current) clearTimeout(boundsSettleTimeoutRef.current);
        if (moveEndTimeoutRef.current) clearTimeout(moveEndTimeoutRef.current);
        if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
    }, []);

    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        if (onSetActiveLine) onSetActiveLine(null);
        setHoveredLine(null);
        setFloatingTooltip(prev => ({ ...prev, visible: false, content: null }));

        rawHandleStationMouseDown(id, coords);
    }, [rawHandleStationMouseDown, onSetActiveLine]);

    const handleStationMouseUp = useCallback((_id?: string) => {
        setFloatingTooltip(prev => ({ ...prev, visible: false, content: null, priority: 'low' }));
        setHoveredLine(null);
        rawHandleStationMouseUp();
    }, [rawHandleStationMouseUp]);

    const handleTooltipUpdate = useCallback((content: string | null, x: number, y: number, priority: 'low' | 'high' = 'high') => {
        if (styleSettings.landForm !== 'outline') {
            setFloatingTooltip(prev => prev.visible ? { ...prev, content: null, visible: false, priority: 'low' } : prev);
            return;
        }
        setFloatingTooltip(prev => {
            if (!content) {
                if (prev.visible && prev.priority === 'high' && priority === 'low') {
                    return prev;
                }
                return { ...prev, content: null, visible: false, priority: 'low' };
            }
            if (prev.visible && prev.priority === 'high' && priority === 'low') {
                return prev;
            }
            return { content, x, y, visible: true, priority };
        });
    }, [styleSettings.landForm]);


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


    // The map used to blank its own markers for ~half a second after every
    // zoom, and hand-clear the canvases, to hide how long the relayout took.
    // The relayout is now bounded by the viewport, so nothing needs hiding —
    // only the tooltips, which have no meaningful position mid-movement.
    useEffect(() => {
        if (!map) return;
        const pane = map.getPane('top-tooltips');
        if (!pane) return;
        const hide = isMoving && !dragStartStation;
        pane.style.transition = hide ? 'none' : 'opacity 0.15s ease-out';
        pane.style.opacity = hide ? '0' : '1';
        pane.style.visibility = hide ? 'hidden' : 'visible';
    }, [map, isMoving, dragStartStation]);

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
            ensurePane('airports', PANE_STYLES.airports);
            ensurePane('airportIcons', PANE_STYLES.airportIcons);
            ensurePane('railroad-glow', PANE_STYLES.railroadGlow);
            ensurePane('railroad-casing', PANE_STYLES.railroadCasing);
            ensurePane('railroad-lines', PANE_STYLES.railroadLines);
            ensurePane('ui-elements', PANE_STYLES.uiElements);
            ensurePane('station-labels', PANE_STYLES.stationLabels);
            ensurePane('master-interactions', PANE_STYLES.masterInteractions);

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
            // Zoom and bounds are applied together and without a transition:
            // the layers only hold what is on screen now, so this is cheap, and
            // deferring it is what used to leave the map a step behind the hand.
            setZoomLevel(e.target.getZoom());
            setMapBounds(e.target.getBounds());

            if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
            zoomEndTimeoutRef.current = setTimeout(() => {
                setIsMoving(false);
                setIsZooming(false);
            }, 60);
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

            // Recording auto-pans the map every animation frame; recomputing the
            // visible station set that often is what made long drags stutter.
            // Snapping reads the full graph, so coalescing here costs nothing.
            if (dragStartStationRef.current) {
                if (boundsSettleTimeoutRef.current) clearTimeout(boundsSettleTimeoutRef.current);
                boundsSettleTimeoutRef.current = setTimeout(() => {
                    startTransition(() => {
                        setMapBounds(map.getBounds());
                    });
                }, 250);
            } else {
                startTransition(() => {
                    setMapBounds(newBounds);
                });
            }

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


    /**
     * The vertical centre of the map a person can actually see.
     *
     * On a phone the bottom sheet covers the lower part of the map, so the
     * geometric centre of the viewport is often *behind* the sheet. Focusing a
     * station there is what made selecting one hide it under its own detail
     * pane. The offset is positive when the sheet covers more than the top
     * chrome does, meaning "put the map centre below the station".
     */
    const visibleCentreOffsetY = useCallback(() => {
        if (!isMobile || typeof window === 'undefined') return 0;
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--sheet-rest-h').trim();
        const sheet = parseFloat(raw);
        if (!Number.isFinite(sheet) || sheet <= 0) return 0;
        const topChrome = MOBILE_CHROME.topBar + MOBILE_CHROME.mapControls;
        return (sheet - topChrome) / 2;
    }, [isMobile]);

    /** `latlng` shifted so that focusing it leaves it in the uncovered strip. */
    const focusPoint = useCallback((lat: number, lon: number, zoom?: number) => {
        if (!map) return L.latLng(lat, lon);
        const offset = visibleCentreOffsetY();
        if (offset === 0) return L.latLng(lat, lon);
        const z = zoom ?? map.getZoom();
        const projected = map.project(L.latLng(lat, lon), z);
        return map.unproject(L.point(projected.x, projected.y + offset), z);
    }, [map, visibleCentreOffsetY]);

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
                map.flyTo(focusPoint(node.coords[1], node.coords[0], 15), 15, { duration: 1.5 });
            }
        }

        if (bounds && bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
        onZoomComplete?.();
    }, [zoomTarget, mapReady, map, graph, onZoomComplete, railData, focusPoint]);

    /**
     * Keep a selected station out from under the sheet.
     *
     * Selecting a station raises the detail sheet, which on a phone can cover
     * the very thing that was tapped. Rather than always recentring — which
     * yanks the map for a station that was already perfectly visible — this
     * only moves when the station has ended up outside the comfortable strip,
     * and pans rather than flies so the map does not appear to jump.
     */
    useEffect(() => {
        if (!isMobile || !selectedStation || !mapReady || !map || !graph) return;
        const node = graph.getNode(selectedStation);
        if (!node) return;

        // Let the sheet finish its detent animation, or the height read below
        // is the one it is moving away from.
        const timer = setTimeout(() => {
            const sheetRaw = getComputedStyle(document.documentElement)
                .getPropertyValue('--sheet-rest-h').trim();
            const sheet = parseFloat(sheetRaw);
            if (!Number.isFinite(sheet) || sheet <= 0) return;

            const size = map.getSize();
            const point = map.latLngToContainerPoint(L.latLng(node.coords[1], node.coords[0]));
            const topLimit = MOBILE_CHROME.topBar + MOBILE_CHROME.mapControls;
            const bottomLimit = size.y - sheet;
            // A margin so a station sitting right on the sheet's edge, where it
            // is technically visible but half-hidden by the shadow, still moves.
            const margin = 48;

            const comfortable =
                point.y >= topLimit + margin &&
                point.y <= bottomLimit - margin &&
                point.x >= margin &&
                point.x <= size.x - margin;
            if (comfortable) return;

            map.panTo(focusPoint(node.coords[1], node.coords[0]), { animate: true, duration: 0.45 });
        }, 320);

        return () => clearTimeout(timer);
    }, [isMobile, selectedStation, mapReady, map, graph, focusPoint]);

    /**
     * The filling ring shown while a station is being held.
     *
     * An SVG arc rather than a conic gradient: animating a gradient stop needs
     * a registered custom property, and `stroke-dashoffset` is animatable
     * everywhere. The duration comes from the same constant the timer uses, so
     * the gauge cannot drift out of step with the gesture it is reporting.
     */
    const pressGaugeIcon = useMemo(() => L.divIcon({
        className: 'press-gauge-marker',
        html: `<svg width="52" height="52" viewBox="0 0 52 52" class="press-gauge">
            <circle cx="26" cy="26" r="18" fill="rgba(0,122,255,0.10)" stroke="rgba(0,122,255,0.25)" stroke-width="3"/>
            <circle class="press-gauge-arc" cx="26" cy="26" r="18" fill="none"
                stroke="#007AFF" stroke-width="4" stroke-linecap="round"
                transform="rotate(-90 26 26)"
                style="animation-duration:${LONG_PRESS_MS}ms"/>
        </svg>`,
        iconSize: [52, 52],
        iconAnchor: [26, 26]
    }), []);

    const selectedStationIcon = useMemo(() => L.divIcon({
        className: 'selected-station-marker',
        html: '<span class="selected-station-ring"></span><span class="selected-station-dot"></span>',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    }), []);

    const isTransforming = isMoving || isZooming || isPending || !!dragStartStation;

    if (!mapReady) return null;

    return (
        <>
            {/* Zoom was desktop-only, which left a phone with pinch as the only
                way to change scale — and no way at all to tell what scale it was
                at. The controls are the same component; only where they sit and
                how big they are differ. */}
            <MapControls
                zoom={zoomLevel}
                minZoom={4}
                maxZoom={18}
                onBounce={triggerBounce}
                isMobile={isMobile}
            />

            {activePrefectures && (
                <JapanMap
                    key={`pref-solid-${zoomLevel <= 8 ? 'low' : zoomLevel <= 13 ? 'mid' : 'high'}`}
                    prefectures={activePrefectures}
                    interactive={zoomLevel <= 8}
                    onPrefectureClick={onPrefectureClick}
                    zoom={zoomLevel}
                    pane="background"
                    theme={theme}
                    shapeMode={styleSettings.shapeMode}
                    hidden={landIsLattice}
                />
            )}
            {zoomLevel > 8 && activeMunicipalities && (
                <MunicipalMap
                    key={`muni-${zoomLevel <= 9 ? 'low' : zoomLevel <= 13 ? 'mid' : 'high'}-${municipalVisitKey}`}
                    municipalities={activeMunicipalities}
                    zoom={zoomLevel}
                    pane="background"
                    regionevelVisits={regionevelVisits}
                    theme={theme}
                    hidden={landIsLattice}
                />
            )}
            {styleSettings.showAirports && airports && (
                <AirportLayer
                    data={airports}
                    zoom={zoomLevel}
                    pane="airports"
                    onTooltipUpdate={handleTooltipUpdate}
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
                    theme={theme}
                    shapeMode={styleSettings.shapeMode}
                    hidden={landIsLattice}
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
                    dataRevision={sectionWindow.revision}
                />

            )}

            {landIsLattice && (
                <LandTileLayer
                    prefectures={activePrefectures}
                    form={styleSettings.landForm}
                    theme={theme}
                    railRevision={railRevision}
                    sections={sectionWindow.sections}
                    railData={railData}
                    usedSectionIds={visitedSectionIds}
                    shapeMode={styleSettings.shapeMode}
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
                    isMoving={isMoving}
                    railData={railData}
                    mapBounds={mapBounds}
                    theme={theme}
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

            {/* 드래그 중인 경로 표시 (개별 세그먼트로 렌더링하여 강제 연결 방지) */}
            {dragPath && dragPath.length > 0 && (
                <>
                    {dragPath.map((segment, idx) => (
                        <Polyline
                            key={`drag-seg-${idx}`}
                            positions={segment.map(c => [c[1], c[0]] as [number, number])}
                            pathOptions={{
                                color: '#007AFF',
                                weight: 12,
                                opacity: idx === dragPath.length - 1 ? 0.3 : 0.5, // 지시선은 좀 더 투명하게
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'ui-elements'
                            }}
                            interactive={false}
                        />
                    ))}
                </>
            )}

            {/* The selected station.
                A DOM marker rather than a CircleMarker: the map runs with
                `preferCanvas`, and a canvas-drawn path has no element for a
                CSS class to land on, so the pulse never ran — the ring drew,
                but frozen. A divIcon is a real node, always above the canvas,
                and costs one element because only one station is ever
                selected. */}
            {selectedStation && railData?.stations?.[selectedStation] && !dragStartStation && (
                <Marker
                    key="selected-station"
                    position={[
                        railData.stations[selectedStation].lat,
                        railData.stations[selectedStation].lon
                    ]}
                    icon={selectedStationIcon}
                    interactive={false}
                    keyboard={false}
                    zIndexOffset={1000}
                />
            )}

            {/* The hold that starts a drawing, while it is filling. */}
            {pressCandidate && !dragStartStation && (
                <Marker
                    key="press-gauge"
                    position={[pressCandidate.lat, pressCandidate.lon]}
                    icon={pressGaugeIcon}
                    interactive={false}
                    keyboard={false}
                    zIndexOffset={1100}
                />
            )}

            {/* The station the drawing is about to reach, so the pull is visible. */}
            {dragStartStation && snapCandidate && railData?.stations?.[snapCandidate] && (
                <CircleMarker
                    key="drag-snap-hint"
                    center={[
                        railData.stations[snapCandidate].lat,
                        railData.stations[snapCandidate].lon
                    ]}
                    radius={11}
                    pathOptions={{
                        color: '#007AFF',
                        weight: 2.5,
                        opacity: 0.9,
                        fillColor: '#007AFF',
                        fillOpacity: 0.15,
                        className: 'drag-snap-hint',
                        pane: 'ui-elements'
                    }}
                    interactive={false}
                />
            )}

            {/* 클릭 프리뷰 경로 표시 (드래그 중이 아닐 때만) */}
            {!dragStartStation && draftTrip && (
                <>
                    {draftTrip.geometries.map((segment: number[][], idx: number) => (
                        <Polyline
                            key={`draft-seg-${idx}`}
                            positions={segment.map((c: number[]) => [c[1], c[0]] as [number, number])}
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
                    ))}
                </>
            )}



            {railData && <OffScreenIndicator
                map={map}
                mapBounds={mapBounds}
                dragStartStation={dragStartStation}
                visibleStations={visibleStations}
            />
            }

            <FloatingTooltip {...floatingTooltip} leftBound={leftBound} rightBound={rightBound} />

            {/* 실시간 경로 연산 중 로딩 표시 (호버 / 드래그) */}
            {isHoverLoading && (
                <div 
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: Z.mapOverlay,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(8px)',
                        padding: '10px 20px',
                        borderRadius: '20px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        pointerEvents: 'none'
                    }}
                    className="dark:bg-slate-900/85 dark:border-slate-800/40"
                >
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {"경로 조회 중..."}
                    </span>
                </div>
            )}

            {/* 여행 기록 저장 / 삭제 / 초기화 로딩 표시 (전체 영역 블러) */}
            {isRecordingLoading && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: Z.mapOverlay,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(5px)',
                        pointerEvents: 'auto'
                    }}
                    className="dark:bg-slate-950/40"
                >
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                            여행 기록 동기화 중...
                        </span>
                    </div>
                </div>
            )}

            {/* SVG Filters for Map Themes */}
            <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                    <filter id="ink-brush">
                        <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>
        </>

    );
};

export default memo(MapPane);

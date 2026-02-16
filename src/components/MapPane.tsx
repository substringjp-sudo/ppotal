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
import { RailroadGraph, StationNode, haversineDistance } from '../lib/graphUtils';
import { RoutingGraph, RouteResult } from '../lib/RoutingGraph';
import { getOfficialColor } from '../lib/lineColors';
import { normalizeKey } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';
import { trackEvent } from '../lib/gtag';

interface MapPaneProps {
    selectedLines: string[];
    recordedTrips: any[];
    onRecordTrip?: (trip: any) => void;
    onRailroadClick?: (line: string) => void;
    onStationClick?: (name: string) => void;
    onLengthsCalculated?: (lengths: Record<string, number>) => void;
    onVisitedLengthsCalculated?: (lengths: Record<string, number>) => void;
    activeLine: string | null;
    zoomToLine?: string | null;
    zoomToStation?: string | null;
    onLineDetailData?: (data: {
        segments: any[],
        visitedEdges: Set<string>,
        nodes: Map<string, StationNode>,
        getShortestPath: any
    } | null) => void;
    zoomTarget?: { type: 'line' | 'station', id: string } | null;
    onZoomComplete?: () => void;
    onLineMappingCreated?: (mapping: Map<string, string>) => void;
    styleSettings: MapStyleSettings;
    language: Language;
    routeStart?: string | null;
    routeEnd?: string | null;
    routeResult?: RouteResult | null;
    onRouteResult?: (result: RouteResult | null) => void;
    onSetSelectedLines?: (lines: string[]) => void;
    onSetActiveLine?: (line: string | null) => void;
}

import MapControls from './MapControls';
import html2canvas from 'html2canvas';

const PANE_STYLES = {
    topTooltips: { zIndex: 1000 },
    stationInteract: { zIndex: 900 }, // SHARED INTERACTION LAYER (Topmost)
    uiElements: { zIndex: 850 },      // Station dots
    railroadLines: { zIndex: 820 },    // Railroad colors
    railroadGlow: { zIndex: 810 },     // Railroad highlights
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
    routeStart,
    routeEnd,
    routeResult,
    onRouteResult,
    onSetSelectedLines,
    onSetActiveLine
}) => {
    const [prefectures, setPrefectures] = useState<any>(null);
    const [municipalities, setMunicipalities] = useState<any>(null);
    const [railroadNetwork, setRailroadNetwork] = useState<any>(null); // New systematic data
    const [stationMasterList, setStationMasterList] = useState<any>(null);
    const [hierarchy, setHierarchy] = useState<any>(null);
    const [stations, setStations] = useState<any>(null); // We might still use this for some metadata or keep it null
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});
    const [highlightedStations, setHighlightedStations] = useState<string[]>([]);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Graph and Recording State
    const [graph, setGraph] = useState<RailroadGraph | null>(null);
    const [routingGraph, setRoutingGraph] = useState<RoutingGraph | null>(null);
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    const dragStartStationRef = React.useRef(dragStartStation);
    const dragStartCoordsRef = React.useRef(dragStartCoords);

    useEffect(() => {
        dragStartStationRef.current = dragStartStation;
        dragStartCoordsRef.current = dragStartCoords;
    }, [dragStartStation, dragStartCoords]);

    const [dragPath, setDragPath] = useState<[number, number][][]>([]); // Changed type to geometry array

    const map = useMap();

    // Clear selection when clicking on empty map area
    useMapEvents({
        click: () => {
            onSetActiveLine?.(null);
        }
    });

    useEffect(() => {
        fetch('/data/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()).then(setPrefectures);
        fetch('/data/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()).then(setMunicipalities);
        fetch('/data/systematic_railroad_network.json').then(res => res.json()).then(setRailroadNetwork);
        fetch('/data/station_master_list.json').then(res => res.json()).then(setStationMasterList);
        fetch('/data/station_hierarchy.json').then(res => res.json()).then(setHierarchy);

        // Mark map as ready if we have the map instance
        if (map) {
            setMapReady(true);
            setZoomLevel(map.getZoom());
            setMapBounds(map.getBounds());
        }
    }, [map]);

    useEffect(() => {
        if (railroadNetwork) {
            const g = new RailroadGraph(railroadNetwork);
            setGraph(g);
            const rg = new RoutingGraph(railroadNetwork);
            setRoutingGraph(rg);
            console.log("RoutingGraph initialized with", rg.nodes.size, "nodes");
        }
    }, [railroadNetwork]);

    useEffect(() => {
        if (routingGraph && hierarchy) {
            routingGraph.buildTransferEdgesFromHierarchy(hierarchy);
            console.log("RoutingGraph updated with transfer edges from hierarchy");
        }
    }, [routingGraph, hierarchy]);

    // Routing Effect
    useEffect(() => {
        if (!routingGraph || !routeStart || !routeEnd) {
            // Clear visualization if start/end cleared?
            // But we might want to keep it until explictly cleared?
            // If props are null, we should probably clear.
            if ((!routeStart || !routeEnd) && onRouteResult) {
                onRouteResult(null);
            }
            return;
        }

        console.log(`Calculating route from ${routeStart} to ${routeEnd}`);
        const result = routingGraph.findRoute(routeStart, routeEnd);
        if (onRouteResult) {
            onRouteResult(result);
        }

    }, [routingGraph, routeStart, routeEnd, onRouteResult]);

    // Create a mapping from simplified ID to full ID (company::lineName)
    const lineIdMap = useMemo(() => {
        if (!railroadNetwork) return new Map<string, string>();
        const map = new Map<string, string>();
        railroadNetwork.routes.forEach((route: any) => {
            map.set(route.id, `${route.company}::${route.line}`);
        });
        return map;
    }, [railroadNetwork]);

    // Report mapping to parent in useEffect to avoid setState in render warning
    useEffect(() => {
        if (onLineMappingCreated && lineIdMap.size > 0) {
            onLineMappingCreated(lineIdMap);
        }
    }, [lineIdMap, onLineMappingCreated]);

    // Calculate line lengths for sidebar
    useEffect(() => {
        if (!railroadNetwork) return;
        const roundedLengths: Record<string, number> = {};
        railroadNetwork.routes.forEach((route: any) => {
            let totalLength = 0;
            route.edges.forEach((edge: any) => {
                totalLength += edge.distance;
            });
            const fullId = `${route.company}::${route.line}`;
            const normalizedId = normalizeKey(fullId);
            roundedLengths[normalizedId] = Math.round(totalLength * 10) / 10;
        });
        setLineLengths(roundedLengths);
        if (onLengthsCalculated) {
            onLengthsCalculated(roundedLengths);
        }
    }, [railroadNetwork, onLengthsCalculated]);

    // Calculate visited lengths
    useEffect(() => {
        if (!railroadNetwork) return;

        const visitedPerLine: Record<string, Set<string>> = {};
        const visitedDistances: Record<string, number> = {};

        recordedTrips.forEach(trip => {
            if (!trip.path || !trip.geometries) return;

            for (let i = 0; i < trip.path.length - 1; i++) {
                const uId = trip.path[i];
                const vId = trip.path[i + 1];

                // Extract line key from uId (company::line::name)
                const partsU = uId.split('::');
                const partsV = vId.split('::');

                if (partsU.length < 3 || partsV.length < 3) continue;

                const companyU = partsU[0];
                const lineU = partsU[1];
                const stationU = partsU[2];
                const companyV = partsV[0];
                const lineV = partsV[1];
                const stationV = partsV[2];

                // Only count if it's the same line (transfers are handles separately/not counted for railroad line progress)
                if (companyU === companyV && lineU === lineV) {
                    const simplifiedKey = `${companyU}::${lineU}`;
                    const lineKey = lineIdMap.get(simplifiedKey) || simplifiedKey;

                    if (!visitedPerLine[lineKey]) visitedPerLine[lineKey] = new Set();

                    // Edge unique ID: min-max of station names to be order-independent
                    const edgeId = [stationU, stationV].sort().join('<->');

                    if (!visitedPerLine[lineKey].has(edgeId)) {
                        visitedPerLine[lineKey].add(edgeId);

                        // Find the edge in railroadNetwork to get its distance
                        const route = railroadNetwork.routes.find((r: any) => r.id === simplifiedKey);
                        if (route) {
                            const edge = route.edges.find((e: any) =>
                                (e.from === uId && e.to === vId) || (e.from === vId && e.to === uId)
                            );
                            if (edge) {
                                visitedDistances[lineKey] = (visitedDistances[lineKey] || 0) + edge.distance;
                            }
                        }
                    }
                }
            }
        });

        // Round and report
        const roundedVisited: Record<string, number> = {};
        Object.entries(visitedDistances).forEach(([key, dist]) => {
            const normalizedKey = normalizeKey(key);
            roundedVisited[normalizedKey] = Math.round(dist * 10) / 10;
        });

        if (onVisitedLengthsCalculated) {
            onVisitedLengthsCalculated(roundedVisited);
        }
    }, [recordedTrips, railroadNetwork, onVisitedLengthsCalculated, lineIdMap]);

    // Handle Active Line Detail Data
    useEffect(() => {
        if (!activeLine || !graph || !onLineDetailData) {
            if (onLineDetailData) onLineDetailData(null);
            return;
        }

        const segments = graph.getLineSegments(activeLine);

        // Calculate visited edges for THIS line
        const visitedEdges = new Set<string>();
        const normalizedActiveLine = normalizeKey(activeLine);
        recordedTrips.forEach(trip => {
            if (trip.path) {
                for (let i = 0; i < trip.path.length - 1; i++) {
                    const u = trip.path[i];
                    const v = trip.path[i + 1];
                    const nodeU = graph.nodes.get(u);
                    const nodeV = graph.nodes.get(v);

                    if (nodeU?.fullLineName === activeLine && nodeV?.fullLineName === activeLine) {
                        visitedEdges.add([u, v].sort().join('<->'));
                    }
                }
            }
        });

        onLineDetailData({
            segments,
            visitedEdges,
            nodes: graph.nodes,
            getShortestPath: (start: string, end: string, allowedLines?: string[]) => {
                return graph.getShortestPath(start, end, allowedLines);
            }
        });
    }, [activeLine, graph, recordedTrips, onLineDetailData]);

    // Disable map dragging during station drag
    useEffect(() => {
        if (!map || !map.dragging) return;
        if (dragStartStation) {
            map.dragging.disable();
        } else {
            map.dragging.enable();
        }
    }, [map, dragStartStation]);

    // Optimization: Pre-calculate name-to-lines mapping from hierarchy once
    const nameToLogicalLines = useMemo(() => {
        const mapping = new Map<string, Set<string>>();
        if (!hierarchy) return mapping;

        Object.entries(hierarchy).forEach(([company, lines]: [string, any]) => {
            Object.entries(lines).forEach(([lineName, stations]: [string, any]) => {
                const fullLineKey = `${company}::${lineName}`;
                stations.forEach((sName: string) => {
                    if (!mapping.has(sName)) mapping.set(sName, new Set());
                    mapping.get(sName)!.add(fullLineKey);
                });
            });
        });
        return mapping;
    }, [hierarchy]);

    // Optimization: Pre-index station master list for fast lookup
    const platformLookup = useMemo(() => {
        const lookup = new Map<string, { platforms: any, group: string }>();
        if (!stationMasterList || !hierarchy) return lookup;

        Object.entries(hierarchy).forEach(([company, lines]: [string, any]) => {
            Object.entries(lines).forEach(([lineName, stations]: [string, any]) => {
                stations.forEach((hs: any) => {
                    if (hs.group && stationMasterList[hs.group]) {
                        const platforms = stationMasterList[hs.group].stations;
                        const myEntry = platforms.find((st: any) => st.line === lineName && st.name === hs.name && st.company === company);
                        if (myEntry && (myEntry.geometries || myEntry.platforms)) {
                            const key = `${company}::${lineName}::${hs.name}`;
                            lookup.set(key, {
                                platforms: myEntry.geometries || myEntry.platforms,
                                group: hs.group
                            });
                        }
                    }
                });
            });
        });
        return lookup;
    }, [stationMasterList, hierarchy]);

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !mapBounds || zoomLevel <= 8) return null;
        const data: Record<string, { nodes: any[], centroid: [number, number], lines: string[] }> = {};

        const bounds = {
            s: mapBounds.getSouth(),
            n: mapBounds.getNorth(),
            w: mapBounds.getWest(),
            e: mapBounds.getEast()
        };

        const stationEntries = Object.entries(railroadNetwork.stations);

        for (let i = 0; i < stationEntries.length; i++) {
            const [id, s] = stationEntries[i] as [string, any];
            if (!s || !s.coords || s.coords.length < 2) continue;
            const [lng, lat] = s.coords;

            // Spatial Culling
            if (lat < bounds.s || lat > bounds.n || lng < bounds.w || lng > bounds.e) continue;

            const parts = id.split('::');
            const company = parts[0];
            const lineSimplified = parts[1];
            const name = s.name;
            const simplifiedKey = `${company}::${lineSimplified}`;
            const key = lineIdMap.get(simplifiedKey) || simplifiedKey;

            // Fast lookup for platforms/group
            const enriched = platformLookup.get(`${company}::${lineSimplified}::${name}`);
            const platforms = enriched?.platforms || s.platforms;
            const group = enriched?.group;

            const node = { id, coord: [lat, lng] as [number, number], lineKey: key, platforms, group };

            if (!data[name]) {
                const logicalLines = Array.from(nameToLogicalLines.get(name) || []);
                const allLines = new Set([key, ...logicalLines]);
                data[name] = {
                    nodes: [node],
                    centroid: [lat, lng],
                    lines: Array.from(allLines)
                };
            } else {
                data[name].nodes.push(node);
                if (!data[name].lines.includes(key)) data[name].lines.push(key);

                const logicalLines = nameToLogicalLines.get(name);
                if (logicalLines) {
                    logicalLines.forEach(l => {
                        if (!data[name].lines.includes(l)) data[name].lines.push(l);
                    });
                }

                // Incremental centroid update is faster than reduce
                const n = data[name].nodes.length;
                data[name].centroid[0] = (data[name].centroid[0] * (n - 1) + lat) / n;
                data[name].centroid[1] = (data[name].centroid[1] * (n - 1) + lng) / n;
            }
        }
        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, lineIdMap, nameToLogicalLines, platformLookup]);

    const findNearestStation = useCallback((lat: number, lng: number) => {
        if (!visibleStations) return null;
        let nearest = null;
        let minDist = Infinity;
        // Search threshold in km (e.g. 20km for loose snapping)
        const threshold = 30;

        Object.entries(visibleStations).forEach(([name, data]) => {
            // Snapping logic:
            // 1. Regular dots snapping at low/medium zoom
            // 2. Platform segment snapping at high zoom (>= 14)

            if (selectedLines.length > 0) {
                const isVisible = data.lines.some((line: string) => selectedLines.includes(line));
                if (!isVisible) return;
            } else {
                return;
            }

            // Check distance to ALL nodes (dots)
            data.nodes.forEach(node => {
                const d = haversineDistance([lng, lat], [node.coord[1], node.coord[0]]);
                if (d < minDist && d < threshold) {
                    minDist = d;
                    nearest = name;
                }

                // If zoom is high, also check against platform geometries
                if (zoomLevel >= 14 && node.platforms) {
                    node.platforms.forEach((plat: [number, number][]) => {
                        for (let i = 0; i < plat.length - 1; i++) {
                            const p1 = plat[i];
                            const p2 = plat[i + 1];
                            // Distance from point to line segment
                            const dPlat = distToSegment([lng, lat], p1 as [number, number], p2 as [number, number]);
                            if (dPlat < minDist && dPlat < (threshold / 10)) { // Much tighter snapping for platforms
                                minDist = dPlat;
                                nearest = name;
                            }
                        }
                    });
                }
            });
        });
        return nearest;
    }, [visibleStations, selectedLines, zoomLevel]);

    const distToSegment = (p: [number, number], v: [number, number], w: [number, number]) => {
        const l2 = Math.pow(v[0] - w[0], 2) + Math.pow(v[1] - w[1], 2);
        if (l2 === 0) return haversineDistance(p, v);
        let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        return haversineDistance(p, [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]);
    };

    const lastNearestRef = React.useRef<string | null>(null);

    // Drag State for Snake Logic
    const dragState = React.useRef<{
        waypoints: string[];
        segments: { path: string[], geometries: [number, number][][], distance: number }[];
    }>({ waypoints: [], segments: [] });

    // Ref for visibleStations to access in event handlers without stale closures
    const visibleStationsRef = React.useRef(visibleStations);
    useEffect(() => {
        visibleStationsRef.current = visibleStations;
    }, [visibleStations]);

    // Auto-scroll refs
    const scrollVelocityRef = React.useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const lastContainerPointRef = React.useRef<L.Point | null>(null);
    const animationFrameRef = React.useRef<number | null>(null);
    const lastLayerPointRef = React.useRef<L.Point | null>(null);

    const updateDragPath = (mapInstance: L.Map, currentLayerPoint: L.Point, currentLatLng: L.LatLng) => {
        const currentDragStation = dragStartStationRef.current;
        const prevLayerPoint = lastLayerPointRef.current;
        const stations = visibleStationsRef.current;

        if (currentDragStation && graph && prevLayerPoint && stations) {
            // 1. Detect stations along the mouse trajectory (Segment prev -> curr)
            const candidates: { name: string, dist: number, projDist: number }[] = [];

            // Optimization: Define a bounding box for the segment with padding
            const padding = 30; // 30px hit radius
            const minX = Math.min(prevLayerPoint.x, currentLayerPoint.x) - padding;
            const maxX = Math.max(prevLayerPoint.x, currentLayerPoint.x) + padding;
            const minY = Math.min(prevLayerPoint.y, currentLayerPoint.y) - padding;
            const maxY = Math.max(prevLayerPoint.y, currentLayerPoint.y) + padding;

            Object.entries(stations).forEach(([name, data]) => {
                const stLatLng = L.latLng(data.centroid[0], data.centroid[1]);
                const stPoint = mapInstance.latLngToLayerPoint(stLatLng);

                // AABB check
                if (stPoint.x >= minX && stPoint.x <= maxX && stPoint.y >= minY && stPoint.y <= maxY) {
                    const d = L.LineUtil.pointToSegmentDistance(stPoint, prevLayerPoint, currentLayerPoint);
                    if (d < 20) {
                        const distFromStart = prevLayerPoint.distanceTo(stPoint);
                        candidates.push({ name, dist: d, projDist: distFromStart });
                    }
                }
            });

            candidates.sort((a, b) => a.projDist - b.projDist);

            const { waypoints, segments } = dragState.current;
            if (waypoints.length === 0) waypoints.push(currentDragStation);

            candidates.forEach(c => {
                const lastWaypoint = waypoints[waypoints.length - 1];
                if (c.name === lastWaypoint) return;

                if (waypoints.length > 1 && c.name === waypoints[waypoints.length - 2]) {
                    waypoints.pop();
                    segments.pop();
                } else {
                    const pathData = graph.getShortestPathByName(lastWaypoint, c.name);

                    if (pathData) {
                        // Heuristic: Prevent jumping to geometrically close but topologically distant stations
                        const lastStData = stations[lastWaypoint];
                        const currStData = stations[c.name];
                        let isValid = true;

                        if (lastStData && currStData) {
                            const crowDist = haversineDistance(lastStData.centroid, currStData.centroid);
                            const railDist = pathData.distance;

                            // 1. Hard cap on single-step distance (e.g., 100km). 
                            // Unless it's a huge zoom level, you shouldn't drag 100km in one frame.
                            if (railDist > 100) isValid = false;

                            // 2. Detour Ratio for close stations
                            // If visually close (< 5km) but rail distance is effectively a detour (> 4x), ignore.
                            // This prevents jumping between parallel lines or nearby unconnected stations.
                            // We add 0.1 to crowDist to avoid division by zero.
                            if (isValid && crowDist < 5 && railDist > 3.0 && (railDist / (crowDist + 0.05)) > 4.0) {
                                isValid = false;
                            }
                        }

                        if (isValid) {
                            waypoints.push(c.name);
                            segments.push({
                                path: pathData.path,
                                geometries: pathData.geometries,
                                distance: pathData.distance
                            });
                        }
                    }
                }
            });

            // Update UI
            let allGeoms = segments.flatMap(s => s.geometries);
            const lastWaypoint = waypoints[waypoints.length - 1];
            if (stations[lastWaypoint]) {
                const startCoords = stations[lastWaypoint].centroid;
                const cursorCoords: [number, number] = [currentLatLng.lat, currentLatLng.lng];
                allGeoms = [...allGeoms, [startCoords, cursorCoords]];
            }

            setDragPath(allGeoms);
        }

        // Always update lastLayerPoint
        lastLayerPointRef.current = currentLayerPoint;
    };

    // Auto-scroll Loop
    useEffect(() => {
        if (!dragStartStation) return;

        const loop = () => {
            const velocity = scrollVelocityRef.current;
            if ((velocity.x !== 0 || velocity.y !== 0) && map && lastContainerPointRef.current) {
                // Pan map
                map.panBy([velocity.x, velocity.y], { animate: false });

                // Recalculate positions after pan
                // The mouse container point is static (relative to viewport), but latlng changes
                const containerPoint = lastContainerPointRef.current;
                const newLatLng = map.containerPointToLatLng(containerPoint);
                const newLayerPoint = map.latLngToLayerPoint(newLatLng);

                // We need to update the snake path because the "cursor latlng" changed
                // AND we might have panned over new stations.
                // Note: pointToSegmentDistance uses LayerPoints.
                // When panning, the map layer moves.
                // We simulated a move from 'lastLayerPoint' (which was correct for previous frame) to 'newLayerPoint'.
                // This correctly represents the "movement" of the cursor relative to the map.

                updateDragPath(map, newLayerPoint, newLatLng);
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [map, dragStartStation]); // Only run loop when dragging
    // Note: updateDragPath uses refs (graph, etc), so it's safe to call in loop.
    // However, setDragPath might trigger re-render, but that's what we want.

    useMapEvents({
        load: () => setMapReady(true),
        click: (e) => {
            if (onSetActiveLine) {
                onSetActiveLine(null);
            }
        },
        zoom: (e) => setZoomLevel(e.target.getZoom()),
        zoomend: (e) => setZoomLevel(e.target.getZoom()),
        move: (e) => setMapBounds(e.target.getBounds()),
        moveend: (e) => setMapBounds(e.target.getBounds()),
        mousemove: (e) => {
            const currentDragStation = dragStartStationRef.current;
            const mapInstance = e.target;

            // Track mouse pos for auto-scroll
            lastContainerPointRef.current = e.containerPoint;

            // Calculate Scroll Velocity
            if (currentDragStation) {
                const { x, y } = e.containerPoint;
                const { x: w, y: h } = mapInstance.getSize();
                const threshold = 50;
                const speed = 10; // Pixels per frame

                let vx = 0;
                let vy = 0;

                if (x < threshold) vx = -speed;
                else if (x > w - threshold) vx = speed;

                if (y < threshold) vy = -speed;
                else if (y > h - threshold) vy = speed;

                scrollVelocityRef.current = { x: vx, y: vy };
            } else {
                scrollVelocityRef.current = { x: 0, y: 0 };
            }

            if (currentDragStation && graph && mapInstance) {
                updateDragPath(mapInstance, e.layerPoint, e.latlng);
            } else {
                lastLayerPointRef.current = e.layerPoint;
            }
        },
        mouseup: (e) => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation && graph) {
                const { waypoints, segments } = dragState.current;

                if (segments.length > 0 && onRecordTrip) {
                    // Merge segments
                    const fullPath: string[] = [];
                    const fullGeoms: [number, number][][] = [];
                    let totalDist = 0;

                    segments.forEach((seg, idx) => {
                        if (idx === 0) {
                            fullPath.push(...seg.path);
                        } else {
                            fullPath.push(...seg.path.slice(1));
                        }
                        fullGeoms.push(...seg.geometries);
                        totalDist += seg.distance;
                    });

                    // Check if mouse up is on a valid station that wasn't added yet (final snap)
                    // (The mousemove trace logic usually catches it, but just in case)
                    // ... Optional: Explicit point-in-circle check for end station if needed.

                    onRecordTrip({
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        start: waypoints[0],
                        end: waypoints[waypoints.length - 1],
                        path: fullPath,
                        distance: totalDist,
                        geometries: fullGeoms
                    });
                }
            }
            // Reset
            setDragStartStation(null);
            setDragStartCoords(null);
            setDragPath([]);
            dragState.current = { waypoints: [], segments: [] };
            lastLayerPointRef.current = null;
            if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
        }
    });

    const mapInstanceRef = React.useRef<L.Map | null>(null);
    useEffect(() => { if (map) mapInstanceRef.current = map; }, [map]);

    const getColor = useCallback((lineKey: string) => {
        return getOfficialColor(lineKey) || '#666';
    }, []);

    const handleRailroadClick = useCallback((line: string) => {
        if (onRailroadClick) onRailroadClick(line);
        if (onSetActiveLine) onSetActiveLine(line);
        trackEvent('line_click', 'interaction', line);
    }, [onRailroadClick, onSetActiveLine]);

    const handleStationClick = useCallback((name: string) => {
        if (onStationClick) onStationClick(name);
        trackEvent('station_click', 'interaction', name);

        // Auto-select connected lines
        if (visibleStations && visibleStations[name] && onSetSelectedLines) {
            const connectedLines = visibleStations[name].lines || [];
            if (connectedLines.length > 0) {
                // Clean up line names if needed? Assuming IDs are correct.
                const newSelection = Array.from(new Set([...selectedLines, ...connectedLines]));
                onSetSelectedLines(newSelection);
            }
        }
    }, [onStationClick, visibleStations, onSetSelectedLines, selectedLines]);

    const handleStationMouseDown = (name: string, coords: [number, number]) => {
        setDragStartStation(name);
        setDragStartCoords(coords);
        setDragPath([]);

        // Fix: Update refs immediately so mousemove/mouseup handlers see it in the same event loop
        dragStartStationRef.current = name;
        dragStartCoordsRef.current = coords;

        dragState.current = {
            waypoints: [name],
            segments: []
        };

        // Initialize trajectory start point
        if (map) {
            map.dragging.disable();
            const latLng = L.latLng(coords[0], coords[1]);
            // Use try-catch or check if map is ready, though map object exists here
            try {
                lastLayerPointRef.current = map.latLngToLayerPoint(latLng);
            } catch (e) {
                console.warn("Failed to project initial point", e);
            }
        }
    };

    // Disable map dragging while making a path
    useEffect(() => {
        if (!map) return;
        if (dragStartStation) {
            map.dragging.disable();
        } else {
            map.dragging.enable();
        }
    }, [map, dragStartStation]);

    const handleRecordTrip = (start: string, end: string, endCoordsOverride?: [number, number]) => {
        if (!graph || !visibleStations || !visibleStations[end]) return;

        const endStationData = visibleStations[end];
        // Use centroid if no override, but override is preferred for platform-exact snapping
        const endCoords: [number, number] = endCoordsOverride || [endStationData.centroid[1], endStationData.centroid[0]];

        const pathData = graph.getShortestPathByName(
            start,
            end,
            selectedLines,
            dragStartCoords || undefined,
            endCoords
        );

        if (pathData) {
            if (onRecordTrip) {
                onRecordTrip({
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ensure unique key
                    start: start,
                    end: end,
                    ...pathData
                });
            }
        }
    };
    const handleStationMouseUp = (name: string) => {
        // Redundant with global mouseup handler which handles snapping.
    };

    // Moved OffScreenIndicator outside


    const visitedStations = useMemo(() => {
        const set = new Set<string>();
        recordedTrips.forEach(trip => {
            if (trip.path) {
                trip.path.forEach((nodeId: string) => {
                    set.add(nodeId);
                });
            }
            // If trip.start/end are indices or names, they might need mapping back to IDs if they aren't already.
            // But usually path includes them.
        });
        return set;
    }, [recordedTrips]);


    // Zoom to line/station
    useEffect(() => {
        if (!zoomTarget || !mapReady || !railroadNetwork) return;

        if (zoomTarget.type === 'line') {
            const route = railroadNetwork.routes.find((r: any) => r.id === zoomTarget.id);
            if (route) {
                const bounds = L.latLngBounds([]);
                route.edges.forEach((edge: any) => {
                    edge.geometry.forEach((c: any) => bounds.extend([c[1], c[0]]));
                });
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
                }
            }
        } else if (zoomTarget.type === 'station') {
            const stationName = zoomTarget.id;
            const allStations = Object.values(railroadNetwork.stations as Record<string, any>);
            const stationData = allStations.find(s => s.name === stationName);

            if (stationData) {
                const [lng, lat] = stationData.coords;
                map.flyTo([lat, lng], 15, { duration: 1.5 });
            }
        }

        onZoomComplete?.();
    }, [zoomTarget, mapReady, railroadNetwork, map, onZoomComplete]);

    const exportMap = async () => {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) return;

        // Hide controls temporarily
        const controls = document.querySelectorAll('.leaflet-control, .map-custom-control');
        controls.forEach(c => (c as HTMLElement).style.display = 'none');

        try {
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                backgroundColor: '#a0c4ff'
            } as any);
            const link = document.createElement('a');
            link.download = `jprail-map-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
            trackEvent('export_map', 'engagement', 'png');
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            controls.forEach(c => (c as HTMLElement).style.display = '');
        }
    };

    if (!mapReady) return null;

    return (
        <>
            <MapControls zoom={zoomLevel} />
            {/* Managed Pane for Tooltips to ensure they are on top of everything */}
            <Pane name="top-tooltips" style={PANE_STYLES.topTooltips} />

            <button
                onClick={exportMap}
                className="map-custom-control"
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '250px', // Adjusted to not overlap sidebar if any
                    zIndex: 1000,
                    padding: '10px 16px',
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <span>📸</span> EXPORT MAP
            </button>
            {/* Background Layer: Prefectures & Municipalities */}

            {/* 1. Background Layer */}
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

            {/* 2. Railroad Visual & Interaction Layers (Managed inside specialized panes) */}
            <Pane name="railroad-glow" style={PANE_STYLES.railroadGlow} />
            <Pane name="railroad-lines" style={PANE_STYLES.railroadLines} />

            <RailroadLayer
                railroadNetwork={railroadNetwork}
                selectedLines={selectedLines}
                hoveredLine={hoveredLine}
                activeLine={activeLine}
                onRailroadClick={handleRailroadClick}
                onRailroadHover={setHoveredLine}
                zoomLevel={zoomLevel}
            />

            {/* 3. UI Elements Pane (Station dots, labels) */}
            <Pane name="ui-elements" style={PANE_STYLES.uiElements}>
                <TripLayer recordedTrips={recordedTrips} zoomLevel={zoomLevel} />

                {dragPath && dragPath.length > 0 && (
                    <React.Fragment>
                        {dragPath.map((segment, idx) => (
                            <Polyline
                                key={`drag-path-${idx}`}
                                positions={segment.map(c => [c[1], c[0]])} // [lng, lat] to [lat, lng]
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
            </Pane>

            {/* 4. Station Interaction Pane (Topmost interaction) */}
            <Pane name="station-interact" style={PANE_STYLES.stationInteract}>
                {/* This pane handles station hitboxes. Stations component will render markers into ui-elements 
                    and interaction logic into this pane via the 'pane' prop in individual markers. */}
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
                        visitedStations={visitedStations}
                        settings={styleSettings}
                        language={language}
                    />
                }
            </Pane>




            <OffScreenIndicator
                map={map}
                mapBounds={mapBounds}
                dragStartStation={dragStartStation}
                visibleStations={visibleStations}
            />
        </>
    );
};

const OffScreenIndicator = ({ map, mapBounds, dragStartStation, visibleStations }: any) => {
    if (!dragStartStation || !visibleStations || !visibleStations[dragStartStation] || !map) return null;

    const { centroid } = visibleStations[dragStartStation];
    const latLng = L.latLng(centroid[0], centroid[1]);

    // Safety check: is map ready/loaded?
    if (mapBounds && mapBounds.contains(latLng)) return null;

    let containerPoint;
    try {
        if (!(map as any)._loaded) return null;
        const center = map.getCenter();
        if (!center || center.lat === undefined) return null;
        containerPoint = map.latLngToContainerPoint(latLng);
    } catch (e) {
        return null; // Silent fail if map is mid-transition or not ready
    }
    const { x: width, y: height } = map.getSize();

    // Clamp to edges
    const edgePadding = 20;
    const clampedX = Math.max(edgePadding, Math.min(width - edgePadding, containerPoint.x));
    const clampedY = Math.max(edgePadding, Math.min(height - edgePadding, containerPoint.y));

    const angle = Math.atan2(containerPoint.y - height / 2, containerPoint.x - width / 2) * (180 / Math.PI);

    return (
        <div style={{
            position: 'fixed',
            left: clampedX,
            top: clampedY,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            zIndex: 1000,
            color: '#FF00FF',
            fontSize: '24px',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
            userSelect: 'none'
        }}>
            ➤
        </div>
    );
};

export default memo(MapPane);

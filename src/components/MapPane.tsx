"use client";

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useMap, useMapEvents, Pane, Polyline } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Railroads from './Railroads';
import Stations from './Stations';
import { RailroadGraph, StationNode, haversineDistance } from '../lib/graphUtils';
import { getOfficialColor } from '../lib/lineColors';
import { normalizeKey } from '../lib/lineUtils';
import { MapStyleSettings } from '../app/page';

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
    onLineMappingCreated?: (map: Map<string, string>) => void;
}

import MapControls from './MapControls';
import html2canvas from 'html2canvas';

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
    onLineMappingCreated
}) => {
    const [prefectures, setPrefectures] = useState<any>(null);
    const [municipalities, setMunicipalities] = useState<any>(null);
    const [railroadNetwork, setRailroadNetwork] = useState<any>(null); // New systematic data
    const [stations, setStations] = useState<any>(null); // We might still use this for some metadata or keep it null
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});
    const [highlightedStations, setHighlightedStations] = useState<string[]>([]);

    // Graph and Recording State
    const [graph, setGraph] = useState<RailroadGraph | null>(null);
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    const dragStartStationRef = React.useRef(dragStartStation);
    const dragStartCoordsRef = React.useRef(dragStartCoords);

    useEffect(() => {
        dragStartStationRef.current = dragStartStation;
        dragStartCoordsRef.current = dragStartCoords;
    }, [dragStartStation, dragStartCoords]);

    const [dragPath, setDragPath] = useState<[number, number][]>([]);
    const [previewPath, setPreviewPath] = useState<any>(null); // To show the "expected" line

    const map = useMap();

    const colorPalette = useMemo(() => [
        "#1B4F72", "#7B241C", "#186A3B", "#7D6608", "#4A235A",
        "#145A32", "#512E5F", "#0E6251", "#78281F", "#1B2631"
    ], []);

    const getColor = useCallback((name: string) => {
        if (!name) return "#CCCCCC";

        const official = getOfficialColor(name);
        if (official) return official;

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colorPalette[Math.abs(hash) % colorPalette.length];
    }, [colorPalette]);

    const [mapReady, setMapReady] = useState(false);
    const [hierarchy, setHierarchy] = useState<any>(null); // Add hierarchy state

    useEffect(() => {
        if (!map) return;

        const handleReady = () => {
            try {
                const center = map.getCenter();
                if (center && center.lat !== undefined) {
                    setZoomLevel(map.getZoom());
                    setMapBounds(map.getBounds());
                    setMapReady(true);
                }
            } catch (e) {
                // Not quite ready yet
            }
        };

        if ((map as any)._loaded) {
            handleReady();
        } else {
            map.whenReady(handleReady);
        }

        fetch('/geoBoundaries-JPN-ADM1_simplified.geojson').then(res => res.json()).then(data => {
            const getBounds = (coords: any) => {
                let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
                coords.flat(Infinity).forEach((c: number, i: number) => {
                    if (i % 2 === 0) { if (c < minLng) minLng = c; if (c > maxLng) maxLng = c; }
                    else { if (c < minLat) minLat = c; if (c > maxLat) maxLat = c; }
                });
                return [[minLat, minLng], [maxLat, maxLng]];
            };
            data.features.forEach((f: any) => f.properties.bounds = getBounds(f.geometry.coordinates));
            setPrefectures(data);
        });
        fetch('/geoBoundaries-JPN-ADM2_simplified.geojson').then(res => res.json()).then(setMunicipalities);
        fetch('/systematic_railroad_network.json').then(res => res.json()).then(setRailroadNetwork).catch(console.error);
        fetch('/station_hierarchy.json').then(res => res.json()).then(setHierarchy).catch(console.error); // Fetch hierarchy
    }, [map]);

    // Build graph when data is loaded
    useEffect(() => {
        if (railroadNetwork) {
            const builtGraph = new RailroadGraph();
            builtGraph.loadFromSystematicJson(railroadNetwork);
            setGraph(builtGraph);
            console.log('Graph loaded from systematic network with', builtGraph.nodes.size, 'nodes');
        }
    }, [railroadNetwork]);

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
            roundedLengths[fullId] = Math.round(totalLength * 10) / 10;
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
            getShortestPath: graph.getShortestPathByName.bind(graph)
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

    const visibleStations = useMemo(() => {
        if (!railroadNetwork || !mapBounds || zoomLevel <= 8) return null;
        const data: Record<string, { nodes: { id: string, coord: [number, number], lineKey: string, platforms?: [number, number][][] }[], centroid: [number, number], lines: string[] }> = {};

        Object.entries(railroadNetwork.stations as Record<string, any>).forEach(([id, s]) => {
            const parts = id.split('::');
            const company = parts[0];
            const lineSimplified = parts[1];
            const name = s.name;
            const simplifiedKey = `${company}::${lineSimplified}`;
            const key = lineIdMap.get(simplifiedKey) || simplifiedKey;
            const [lng, lat] = s.coords;

            if (lat >= mapBounds.getSouth() && lat <= mapBounds.getNorth() &&
                lng >= mapBounds.getWest() && lng <= mapBounds.getEast()) {

                const coord: [number, number] = [lat, lng];
                const node = { id, coord, lineKey: key, platforms: s.platforms };

                if (!data[name]) {
                    data[name] = { nodes: [node], centroid: coord, lines: [key] };
                } else {
                    data[name].nodes.push(node);
                    if (!data[name].lines.includes(key)) data[name].lines.push(key);

                    // Recalculate centroid
                    const n = data[name].nodes.length;
                    const latSum = data[name].nodes.reduce((sum, n) => sum + n.coord[0], 0);
                    const lngSum = data[name].nodes.reduce((sum, n) => sum + n.coord[1], 0);
                    data[name].centroid = [latSum / n, lngSum / n];
                }
            }
        });
        return data;
    }, [railroadNetwork, mapBounds, zoomLevel, lineIdMap]);

    const findNearestStation = useCallback((lat: number, lng: number) => {
        if (!visibleStations) return null;
        let nearest = null;
        let minDist = Infinity;
        // Search threshold in km (e.g. 20km for loose snapping)
        const threshold = 30;

        Object.entries(visibleStations).forEach(([name, data]) => {
            // Only snap to visible stations (those on selected lines)
            if (selectedLines.length > 0) {
                const isVisible = data.lines.some((line: string) => selectedLines.includes(line));
                if (!isVisible) return;
            } else {
                return;
            }

            // Check distance to ALL nodes
            data.nodes.forEach(node => {
                const d = haversineDistance([lng, lat], [node.coord[1], node.coord[0]]);
                if (d < minDist && d < threshold) {
                    minDist = d;
                    nearest = name;
                }
            });
        });
        return nearest;
    }, [visibleStations, selectedLines]);

    const lastNearestRef = React.useRef<string | null>(null);
    const previewPathRef = React.useRef<any>(null);

    // Sync previewPathRef to allow mousemove to check current state without re-binding
    useEffect(() => {
        previewPathRef.current = previewPath;
    }, [previewPath]);

    useMapEvents({
        zoomend: (e) => setZoomLevel(e.target.getZoom()),
        moveend: (e) => setMapBounds(e.target.getBounds()),
        mousemove: (e) => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation) {
                // Predictive Highlighting
                const nearest = findNearestStation(e.latlng.lat, e.latlng.lng);

                // Only update if target station changed
                if (nearest === lastNearestRef.current) return;
                lastNearestRef.current = nearest;

                // If we have a nearest station that is NOT the start station...
                if (nearest && nearest !== currentDragStation && graph) {
                    const endStationData = visibleStations![nearest];
                    if (!endStationData) {
                        setPreviewPath(null);
                        return;
                    }

                    const endCoords: [number, number] = [endStationData.centroid[1], endStationData.centroid[0]];

                    const pathData = graph.getShortestPathByName(
                        currentDragStation,
                        nearest,
                        selectedLines,
                        dragStartCoordsRef.current || undefined,
                        endCoords
                    );

                    setPreviewPath(pathData);
                } else {
                    setPreviewPath(null);
                }
            } else {
                if (previewPathRef.current) setPreviewPath(null);
                lastNearestRef.current = null;
            }
        },
        mouseup: (e) => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation) {
                const nearest = findNearestStation(e.latlng.lat, e.latlng.lng);
                if (nearest && nearest !== currentDragStation) {
                    handleRecordTrip(currentDragStation, nearest);
                }
            }
            // Always reset drag state on mouseup
            setDragStartStation(null);
            setDragStartCoords(null);
            setDragPath([]);
            setPreviewPath(null);
            lastNearestRef.current = null;
        }
    });

    const handleRailroadClick = useCallback((line: string) => {
        if (onRailroadClick) onRailroadClick(line);
    }, [onRailroadClick]);

    const handleStationClick = useCallback((name: string) => {
        if (onStationClick) onStationClick(name);
    }, [onStationClick]);

    const handleStationMouseDown = (name: string, coords: [number, number]) => {
        setDragStartStation(name);
        setDragStartCoords(coords);
        setDragPath([]);
        setPreviewPath(null);
    };

    const handleRecordTrip = (start: string, end: string) => {
        if (!graph || !visibleStations || !visibleStations[end]) return;

        const endStationData = visibleStations[end];
        const endCoords: [number, number] = [endStationData.centroid[1], endStationData.centroid[0]];

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

    // Function to get color from node ID (company::line::station)
    const getLineColorFromNode = (nodeId: string) => {
        if (!nodeId) return '#000';
        const parts = nodeId.split('::');
        if (parts.length >= 2) {
            const key = `${parts[0]}::${parts[1]}`;
            return getColor(key);
        }
        return '#000';
    };

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
            const lineFeatures = railroadNetwork.features.filter((f: any) => f.properties.id === zoomTarget.id);
            if (lineFeatures.length > 0) {
                const bounds = L.latLngBounds([]);
                lineFeatures.forEach((f: any) => {
                    const coords = f.geometry.type === 'LineString'
                        ? f.geometry.coordinates
                        : f.geometry.coordinates.flat(1);
                    coords.forEach((c: any) => bounds.extend([c[1], c[0]]));
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
            });
            const link = document.createElement('a');
            link.download = `jprail-map-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
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

            <Pane name="background" style={{ zIndex: 100 }}>
                <JapanMap
                    prefectures={prefectures}
                    onPrefectureClick={() => { }} // Disabled click effect
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

            {/* Interaction Layer: Railroads & Recorded Trips */}
            <Pane name="interactive-elements" style={{ zIndex: 200 }}>
                <Railroads
                    railroadNetwork={railroadNetwork}
                    selectedLines={selectedLines}
                    recordedTrips={recordedTrips}
                    onRailroadClick={onRailroadClick}
                    getColor={getColor}
                    zoom={zoomLevel}
                    isDragging={!!dragStartStation}
                    activeLine={activeLine}
                />

                {previewPath && (
                    <Polyline
                        positions={previewPath.geometries.map((g: [number, number][]) => g.map(pt => [pt[1], pt[0]]))}
                        pathOptions={{
                            color: '#FF00FF',
                            weight: (zoomLevel > 11 ? 10 : (zoomLevel > 9 ? 7 : 4)) * styleSettings.unvisited.weight,
                            opacity: 0.5,
                            interactive: false
                        }}
                    />
                )}

                {recordedTrips.map((trip, tripIdx) => {
                    // Validation Guard: Ensure trip data is valid and has geometries
                    if (!trip || !trip.geometries || !Array.isArray(trip.geometries) || !trip.path) return null;

                    const tripKey = trip.id || `trip-${tripIdx}-${trip.start}-${trip.end}`;

                    return (
                        <React.Fragment key={tripKey}>
                            {trip.geometries.map((g: [number, number][], i: number) => {
                                // Double check nested geometry array
                                if (!Array.isArray(g)) return null;

                                // Ensure coordinates are valid [lon, lat] and converted to [lat, lon]
                                const positions = g
                                    .filter(pt => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
                                    .map(pt => [pt[1], pt[0]] as [number, number]);

                                if (positions.length < 2) return null;

                                const startNodeId = trip.path[i];
                                const color = getLineColorFromNode(startNodeId);

                                return (
                                    <React.Fragment key={`${tripKey}-seg-${i}`}>
                                        <Polyline
                                            positions={positions}
                                            pathOptions={{
                                                color: '#2ecc71', // Green Glow/Outline
                                                weight: ((zoomLevel > 11 ? 12 : (zoomLevel > 9 ? 8 : 5)) * styleSettings.visited.weight) + 4,
                                                opacity: 1,
                                                interactive: false
                                            }}
                                        />
                                        <Polyline
                                            positions={positions}
                                            pathOptions={{
                                                color: color, // Official Line Color
                                                weight: (zoomLevel > 11 ? 12 : (zoomLevel > 9 ? 8 : 5)) * styleSettings.visited.weight,
                                                opacity: 1,
                                                lineCap: 'butt',
                                                interactive: false
                                            }}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </Pane>

            {/* Top Layer: Stations */}
            <Pane name="ui-elements" style={{ zIndex: 300 }}>
                {visibleStations &&
                    <Stations
                        processedStations={visibleStations}
                        highlightedStations={highlightedStations}
                        handleStationClick={onStationClick || (() => { })}
                        zoom={zoomLevel}
                        getColor={getColor}
                        selectedLines={selectedLines}
                        activeLine={activeLine}
                        onStationMouseDown={handleStationMouseDown}
                        onStationMouseUp={handleStationMouseUp}
                        dragStartStation={dragStartStation}
                        visitedStations={visitedStations}
                        styleSettings={styleSettings}
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

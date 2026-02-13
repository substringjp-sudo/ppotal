"use client";

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useMap, useMapEvents, Pane, Polyline } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import JapanMap from './JapanMap';
import MunicipalMap from './MunicipalMap';
import Railroads from './Railroads';
import Stations from './Stations';
import { buildGraph, RailroadGraph, haversineDistance } from '../lib/graphUtils';

interface MapPaneProps {
    selectedLines: string[];
    onRailroadClick?: (line: string) => void;
    onStationClick?: (name: string) => void;
    onLengthsCalculated?: (lengths: Record<string, number>) => void;
}

const MapPane: React.FC<MapPaneProps> = ({ selectedLines, onRailroadClick, onStationClick, onLengthsCalculated }) => {
    const [prefectures, setPrefectures] = useState<any>(null);
    const [municipalities, setMunicipalities] = useState<any>(null);
    const [railroads, setRailroads] = useState<any>(null);
    const [stations, setStations] = useState<any>(null);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
    const [lineLengths, setLineLengths] = useState<Record<string, number>>({});
    const [highlightedStations, setHighlightedStations] = useState<string[]>([]);

    // Graph and Recording State
    const [graph, setGraph] = useState<RailroadGraph | null>(null);
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const dragStartStationRef = React.useRef(dragStartStation);

    useEffect(() => {
        dragStartStationRef.current = dragStartStation;
    }, [dragStartStation]);

    const [dragPath, setDragPath] = useState<[number, number][]>([]);
    const [previewPath, setPreviewPath] = useState<any>(null); // To show the "expected" line
    const [recordedTrips, setRecordedTrips] = useState<any[]>([]);

    const map = useMap();

    const colorPalette = useMemo(() => [
        "#FFC300", "#FF5733", "#C70039", "#900C3F", "#581845",
        "#DAF7A6", "#3A8DDE", "#2F6FAD", "#245282", "#1A3557"
    ], []);

    const getColor = useCallback((name: string) => {
        if (!name) return "#CCCCCC";
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colorPalette[Math.abs(hash) % colorPalette.length];
    }, [colorPalette]);

    useEffect(() => {
        if (map) {
            setZoomLevel(map.getZoom());
            setMapBounds(map.getBounds());
            // setMapBounds(map.getBounds()); // Removed duplicate
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
        fetch('/N02-22_RailroadSection.geojson').then(res => res.json()).then(setRailroads);
        fetch('/N02-22_Station.geojson').then(res => res.json()).then(setStations).catch(console.error);
    }, [map]);

    // Build graph when data is loaded
    useEffect(() => {
        if (stations && railroads) {
            const builtGraph = buildGraph(stations, railroads);
            setGraph(builtGraph);
            console.log('Graph built with', builtGraph.nodes.size, 'nodes');
        }
    }, [stations, railroads]);

    // Calculate line lengths for sidebar
    useEffect(() => {
        if (!railroads) return;

        const lengths: Record<string, number> = {};
        railroads.features.forEach((feature: any) => {
            const company = feature.properties.N02_004;
            const line = feature.properties.N02_003;
            const key = `${company}::${line}`;

            let featureLength = 0;
            const geom = feature.geometry;
            if (!geom) return;

            if (geom.type === 'LineString') {
                for (let i = 0; i < geom.coordinates.length - 1; i++) {
                    featureLength += haversineDistance(geom.coordinates[i], geom.coordinates[i + 1]);
                }
            } else if (geom.type === 'MultiLineString') {
                geom.coordinates.forEach((lineString: any) => {
                    for (let i = 0; i < lineString.length - 1; i++) {
                        featureLength += haversineDistance(lineString[i], lineString[i + 1]);
                    }
                });
            }

            lengths[key] = (lengths[key] || 0) + featureLength;
        });

        const roundedLengths: Record<string, number> = {};
        for (const key in lengths) {
            roundedLengths[key] = Math.round(lengths[key] * 10) / 10;
        }

        setLineLengths(roundedLengths);
        if (onLengthsCalculated) {
            onLengthsCalculated(roundedLengths);
        }
    }, [railroads, onLengthsCalculated]);

    // Disable map dragging during station drag
    useEffect(() => {
        if (!map) return;
        if (dragStartStation) {
            map.dragging.disable();
        } else {
            map.dragging.enable();
        }
    }, [map, dragStartStation]);

    const visibleStations = useMemo(() => {
        if (!stations || !mapBounds || zoomLevel <= 8) return null;
        const data: Record<string, any> = {};
        stations.features.forEach((s: any) => {
            const geom = s.geometry;
            if (!geom) return;

            let rawCoords = geom.coordinates;
            const lat = geom.type === 'LineString' ? (rawCoords[0][1] + rawCoords[rawCoords.length - 1][1]) / 2 : rawCoords[1];
            const lng = geom.type === 'LineString' ? (rawCoords[0][0] + rawCoords[rawCoords.length - 1][0]) / 2 : rawCoords[0];

            if (lat >= mapBounds.getSouth() && lat <= mapBounds.getNorth() &&
                lng >= mapBounds.getWest() && lng <= mapBounds.getEast()) {
                const name = s.properties.N02_005;
                const company = s.properties.N02_004;
                const line = s.properties.N02_003;
                const key = `${company}::${line}`;

                if (!data[name]) data[name] = { coords: [lat, lng], lines: [] };
                if (!data[name].lines.includes(key)) data[name].lines.push(key);
            }
        });
        return data;
    }, [stations, mapBounds, zoomLevel]);

    // Helper to find nearest station to a point
    const findNearestStation = useCallback((lat: number, lng: number) => {
        if (!visibleStations) return null;
        let nearest = null;
        let minDist = Infinity;
        // Search threshold in km (e.g. 20km for loose snapping)
        const threshold = 30;

        Object.entries(visibleStations).forEach(([name, data]) => {
            // Only snap to visible stations (those on selected lines)
            // If selectedLines is empty, arguably nothing is visible, so don't snap?
            // Or maybe everything? Current logic hides everything if empty.
            if (selectedLines.length > 0) {
                const isVisible = data.lines.some((line: string) => selectedLines.includes(line));
                if (!isVisible) return;
            } else {
                return; // No lines selected -> no stations visible -> no snapping
            }

            const d = haversineDistance([lng, lat], [data.coords[1], data.coords[0]]);
            if (d < minDist && d < threshold) {
                minDist = d;
                nearest = name;
            }
        });
        return nearest;
    }, [visibleStations, selectedLines]);

    useMapEvents({
        zoomend: (e) => setZoomLevel(e.target.getZoom()),
        moveend: (e) => setMapBounds(e.target.getBounds()),
        mousemove: (e) => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation) {
                setDragPath(prev => [...prev, [e.latlng.lng, e.latlng.lat]]);

                // Predictive Highlighting
                const nearest = findNearestStation(e.latlng.lat, e.latlng.lng);
                if (nearest && nearest !== currentDragStation && graph) {
                    // Calculate shortest path to nearest
                    const startNodes = Array.from(graph.nodes.keys()).filter(id => id.endsWith(`::${currentDragStation}`));
                    const endNodes = Array.from(graph.nodes.keys()).filter(id => id.endsWith(`::${nearest}`));

                    if (startNodes.length > 0 && endNodes.length > 0) {
                        let bestPathResult: any = null;
                        startNodes.forEach(s => {
                            endNodes.forEach(e => {
                                const res = graph.getShortestPath(s, e);
                                if (res && (!bestPathResult || res.distance < bestPathResult.distance)) {
                                    bestPathResult = res;
                                }
                            });
                        });
                        if (bestPathResult) {
                            setPreviewPath(bestPathResult);
                        }
                    }
                } else {
                    setPreviewPath(null);
                }
            }
        },
        mouseup: (e) => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation) {
                // Loose release snap
                const nearest = findNearestStation(e.latlng.lat, e.latlng.lng);
                if (nearest && nearest !== currentDragStation) {
                    handleRecordTrip(currentDragStation, nearest);
                }
                setDragStartStation(null);
                setDragPath([]);
                setPreviewPath(null);
            }
        }
    });

    const handlePrefectureClick = useCallback((prefName: string) => {
        const prefFeature = prefectures?.features.find((f: any) => f.properties.shapeName === prefName);
        if (prefFeature?.properties.bounds) map.fitBounds(prefFeature.properties.bounds);
    }, [prefectures, map]);

    const handleRailroadClick = useCallback((line: string) => {
        if (onRailroadClick) onRailroadClick(line);
    }, [onRailroadClick]);

    const handleStationClick = useCallback((name: string) => {
        // setHighlightedStations(prev =>
        //     prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        // );
        // User requested to remove the "enlarge on click" effect.
        if (onStationClick) onStationClick(name);
    }, [onStationClick]);

    const handleStationMouseDown = (name: string) => {
        setDragStartStation(name);
        setDragPath([]);
        setPreviewPath(null);
    };

    const handleRecordTrip = (start: string, end: string) => {
        if (graph) {
            const startNodes = Array.from(graph.nodes.keys()).filter(id => id.endsWith(`::${start}`));
            const endNodes = Array.from(graph.nodes.keys()).filter(id => id.endsWith(`::${end}`));

            if (startNodes.length > 0 && endNodes.length > 0) {
                let bestPathResult: any = null;
                startNodes.forEach(s => {
                    endNodes.forEach(e => {
                        const res = graph.getShortestPath(s, e);
                        if (res && (!bestPathResult || res.distance < bestPathResult.distance)) {
                            bestPathResult = res;
                        }
                    });
                });

                if (bestPathResult) {
                    setRecordedTrips(prev => [...prev, {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ensure unique key
                        start: start,
                        end: end,
                        ...bestPathResult
                    }]);
                }
            }
        }
    };

    const handleStationMouseUp = (name: string) => {
        // Redundant with global mouseup handler which handles snapping.
    };

    const OffScreenIndicator = () => {
        const activeStation = dragStartStation;
        if (!activeStation || !visibleStations || !visibleStations[activeStation]) return null;

        const { coords } = visibleStations[activeStation];
        const latLng = L.latLng(coords[0], coords[1]);

        if (mapBounds?.contains(latLng)) return null;

        const containerPoint = map.latLngToContainerPoint(latLng);
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
                    if (nodeId.includes('::')) {
                        const parts = nodeId.split('::');
                        if (parts.length >= 3) {
                            set.add(parts[2]);
                        }
                    }
                });
            }
            set.add(trip.start);
            set.add(trip.end);
        });
        return set;
    }, [recordedTrips]);

    return (
        <>
            <Pane name="prefecture-fill" style={{ zIndex: 410 }}>
                <JapanMap
                    prefectures={prefectures}
                    onPrefectureClick={handlePrefectureClick}
                    getColor={getColor}
                    interactive={zoomLevel <= 8}
                    zoom={zoomLevel}
                />
            </Pane>
            <Pane name="municipal-lines" style={{ zIndex: 412 }}>
                {zoomLevel > 8 && municipalities && (
                    <MunicipalMap
                        municipalities={municipalities}
                        getColor={getColor}
                        zoom={zoomLevel}
                    />
                )}
            </Pane>
            <Pane name="prefecture-outline" style={{ zIndex: 415 }}>
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
            <Pane name="railroads" style={{ zIndex: 420 }}>
                <Railroads
                    railroads={railroads}
                    selectedLines={selectedLines}
                    onRailroadClick={handleRailroadClick}
                    getColor={getColor}
                    zoom={zoomLevel}
                />
            </Pane>
            <Pane name="recorded-trips" style={{ zIndex: 430 }}>
                {dragPath.length > 1 && (
                    <Polyline
                        positions={dragPath.map(p => [p[1], p[0]])}
                        pathOptions={{
                            color: '#000000',
                            weight: 3,
                            opacity: 0.8,
                            dashArray: '5, 10'
                        }}
                    />
                )}

                {previewPath && (
                    <Polyline
                        positions={previewPath.geometries.map((g: [number, number][]) => g.map(pt => [pt[1], pt[0]]))}
                        pathOptions={{
                            color: '#FF00FF',
                            weight: 6,
                            opacity: 0.5,
                        }}
                    />
                )}

                {recordedTrips.map(trip => (
                    <React.Fragment key={trip.id}>
                        {trip.geometries.map((g: [number, number][], i: number) => {
                            const startNodeId = trip.path[i];
                            const color = getLineColorFromNode(startNodeId);

                            return (
                                <React.Fragment key={i}>
                                    <Polyline
                                        positions={g.map(pt => [pt[1], pt[0]])}
                                        pathOptions={{
                                            color: color,
                                            weight: 8,
                                            opacity: 1,
                                            lineCap: 'butt'
                                        }}
                                    />
                                    <Polyline
                                        positions={g.map(pt => [pt[1], pt[0]])}
                                        pathOptions={{
                                            color: '#000000',
                                            weight: 2,
                                            opacity: 1,
                                        }}
                                    />
                                </React.Fragment>
                            )
                        })}
                    </React.Fragment>
                ))}
            </Pane>
            <Pane name="stations" style={{ zIndex: 500 }}>
                {visibleStations &&
                    <Stations
                        processedStations={visibleStations}
                        highlightedStations={highlightedStations}
                        handleStationClick={handleStationClick}
                        zoom={zoomLevel}
                        getColor={getColor}
                        selectedLines={selectedLines}
                        onStationMouseDown={handleStationMouseDown}
                        onStationMouseUp={handleStationMouseUp}
                        dragStartStation={dragStartStation}
                        visitedStations={visitedStations}
                    />
                }
            </Pane>
            <OffScreenIndicator />
        </>
    );
};

export default memo(MapPane);

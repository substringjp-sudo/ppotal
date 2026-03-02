import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { haversineDistance } from '../lib/graphUtils';
import { ProcessedStation } from '../types/mapTypes';
import { Trip } from '../types/trip';

interface GraphLike {
    getShortestPath(startId: string, endId: string, allowedLines?: string[]): {
        path: string[],
        sectionIds: number[],
        distance: number,
        geometries: [number, number][][]
    } | null;
}

interface UseTripRecorderProps {
    graph: GraphLike | null;
    visibleStations: Record<string, ProcessedStation> | null;
    onRecordTrip?: (trip: Trip) => void;

    onDraftComplete?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    selectedLines?: string[];
    activeLine?: string | null;
}

export const useTripRecorder = ({
    graph,
    visibleStations,
    onRecordTrip,

    onDraftComplete,
    onDragUpdate,
    selectedLines = [],
    activeLine = null
}: UseTripRecorderProps) => {
    const map = useMap();
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    const [dragPath, setDragPath] = useState<[number, number][][]>([]);

    const dragStartStationRef = useRef(dragStartStation);
    const visibleStationsRef = useRef(visibleStations);

    // Auto-scroll refs
    const scrollVelocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const lastContainerPointRef = useRef<L.Point | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastLayerPointRef = useRef<L.Point | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    // Drag State for Snake Logic
    const dragState = useRef<{
        waypoints: string[];
        segments: { path: string[], geometries: [number, number][][], distance: number, sectionIds: number[] }[];
    }>({ waypoints: [], segments: [] });

    useEffect(() => {
        dragStartStationRef.current = dragStartStation;
    }, [dragStartStation]);

    useEffect(() => {
        visibleStationsRef.current = visibleStations;
    }, [visibleStations]);

    useEffect(() => { if (map) mapInstanceRef.current = map; }, [map]);

    // Disable map dragging during station drag
    useEffect(() => {
        if (!map || !map.dragging) return;
        if (dragStartStation) {
            map.dragging.disable();
        } else {
            map.dragging.enable();
        }
    }, [map, dragStartStation]);

    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        // Validation: Only allow starting from visible lines
        const stations = visibleStationsRef.current;
        if (stations && stations[id]) {
            const data = stations[id];
            const selectionSet = new Set(selectedLines);
            const isNoneExplicitlySelected = selectionSet.has("__NONE__");
            const isFilterActive = isNoneExplicitlySelected || selectionSet.size > 0;

            const isStationVisible = data.lines?.some((l: string) =>
                selectionSet.has(l) || activeLine === l || !isFilterActive
            );

            if (!isStationVisible && !data.isJoint) return;
        }

        setDragStartStation(id);
        setDragStartCoords(coords);
        setDragPath([]);

        dragStartStationRef.current = id;

        dragState.current = {
            waypoints: [id],
            segments: []
        };

        if (onDragUpdate) onDragUpdate([id]);

        if (map) {
            map.dragging.disable();
            const latLng = L.latLng(coords[0], coords[1]);
            try {
                lastLayerPointRef.current = map.latLngToLayerPoint(latLng);
            } catch (e) {
                console.warn("Failed to project initial point", e);
            }
        }
    }, [map, onDragUpdate, selectedLines, activeLine]);

    const updateDragPath = useCallback((mapInstance: L.Map, currentLayerPoint: L.Point, currentLatLng: L.LatLng) => {
        const currentDragStation = dragStartStationRef.current;
        const prevLayerPoint = lastLayerPointRef.current;
        const stations = visibleStationsRef.current;

        if (currentDragStation && graph && prevLayerPoint && stations) {
            const candidates: { id: string, dist: number, projDist: number }[] = [];
            const padding = 30;
            const minX = Math.min(prevLayerPoint.x, currentLayerPoint.x) - padding;
            const maxX = Math.max(prevLayerPoint.x, currentLayerPoint.x) + padding;
            const minY = Math.min(prevLayerPoint.y, currentLayerPoint.y) - padding;
            const maxY = Math.max(prevLayerPoint.y, currentLayerPoint.y) + padding;

            Object.entries(stations).forEach(([id, data]) => {
                const stLatLng = L.latLng(data.centroid[0], data.centroid[1]);
                const stPoint = mapInstance.latLngToLayerPoint(stLatLng);

                if (stPoint.x >= minX && stPoint.x <= maxX && stPoint.y >= minY && stPoint.y <= maxY) {
                    // Filter: Only allow stations that are on visible lines
                    const selectionSet = new Set(selectedLines);
                    const isNoneExplicitlySelected = selectionSet.has("__NONE__");
                    const isFilterActive = isNoneExplicitlySelected || selectionSet.size > 0;

                    const isStationVisible = data.lines?.some((l: string) =>
                        selectionSet.has(l) || activeLine === l || !isFilterActive
                    );

                    if (!isStationVisible && !data.isJoint) return;

                    const d = L.LineUtil.pointToSegmentDistance(stPoint, prevLayerPoint, currentLayerPoint);
                    if (d < 20) {
                        const distFromStart = prevLayerPoint.distanceTo(stPoint);
                        candidates.push({ id, dist: d, projDist: distFromStart });
                    }
                }
            });

            candidates.sort((a, b) => a.projDist - b.projDist);

            const { waypoints, segments } = dragState.current;
            if (waypoints.length === 0) waypoints.push(currentDragStation);

            let changed = false;

            candidates.forEach(c => {
                const lastWaypoint = waypoints[waypoints.length - 1];
                if (c.id === lastWaypoint) return;

                const existingIndex = waypoints.indexOf(c.id);
                if (existingIndex !== -1 && existingIndex < waypoints.length - 1) {
                    // Backtracking: Scrub everything after the first occurrence of this station
                    // This creates an "eraser" effect when moving the cursor back over the path
                    const popCount = waypoints.length - 1 - existingIndex;
                    for (let k = 0; k < popCount; k++) {
                        waypoints.pop();
                        segments.pop();
                    }
                    changed = true;
                } else {
                    const lastStData = stations[lastWaypoint];
                    const currStData = stations[c.id];
                    const pathData = graph.getShortestPath(
                        lastWaypoint,
                        c.id,
                        selectedLines
                    );

                    if (pathData) {
                        let isValid = true;

                        if (lastStData && currStData) {
                            const crowDist = haversineDistance(lastStData.centroid, currStData.centroid);
                            const railDist = pathData.distance;

                            // 1. Jump constraints (relaxed as per user request)
                            // Allow if either one is reasonable (e.g., long but direct gap, or short but busy line)
                            // We increase these to be very lenient while still preventing accidental "teleports"
                            const isDistanceOk = railDist <= 120;
                            const isSectionOk = (pathData.sectionIds?.length || 0) <= 50;

                            if (!isDistanceOk && !isSectionOk) {
                                isValid = false;
                            }

                            // 2. Extra safety: distance-to-displacement ratio
                            // If the rail route is more than 5x the crow-flies distance and over 10km, block it.
                            if (isValid && crowDist < 10 && (railDist / (crowDist + 0.01)) > 5.0) {
                                isValid = false;
                            }

                            // 3. Prevent extreme detours
                            if (isValid && railDist > crowDist * 3 + 10) {
                                isValid = false;
                            }
                        }

                        if (isValid) {
                            waypoints.push(c.id);
                            segments.push({
                                path: pathData.path,
                                geometries: pathData.geometries,
                                distance: pathData.distance,
                                sectionIds: pathData.sectionIds
                            });
                            changed = true;
                        }
                    }
                }
            });

            if (changed && onDragUpdate) {
                onDragUpdate([...waypoints]);
            }

            let allGeoms = segments.flatMap((s: { geometries: [number, number][][] }) => s.geometries);
            const lastWaypoint = waypoints[waypoints.length - 1];
            if (stations[lastWaypoint]) {
                const startCoords = stations[lastWaypoint].centroid; // [lat, lon]
                const cursorCoords: [number, number] = [currentLatLng.lat, currentLatLng.lng];

                // Store as [lon, lat] to match graph geometries for MapPane.tsx polyline mapping
                allGeoms = [...allGeoms, [[startCoords[1], startCoords[0]], [cursorCoords[1], cursorCoords[0]]]];
            }

            setDragPath(allGeoms);
        }

        lastLayerPointRef.current = currentLayerPoint;
    }, [graph, selectedLines, activeLine, onDragUpdate]);

    // Auto-scroll Loop
    useEffect(() => {
        if (!dragStartStation) return;

        const loop = () => {
            const velocity = scrollVelocityRef.current;
            if ((velocity.x !== 0 || velocity.y !== 0) && map && lastContainerPointRef.current) {
                map.panBy([velocity.x, velocity.y], { animate: false });

                const containerPoint = lastContainerPointRef.current;
                const newLatLng = map.containerPointToLatLng(containerPoint);
                const newLayerPoint = map.latLngToLayerPoint(newLatLng);

                updateDragPath(map, newLayerPoint, newLatLng);
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [map, dragStartStation, updateDragPath]);

    const handleEnd = useCallback(() => {
        const currentDragStation = dragStartStationRef.current;
        if (currentDragStation && graph) {
            const { waypoints, segments } = dragState.current;
            const lastWaypoint = waypoints[waypoints.length - 1];
            const lastStData = visibleStationsRef.current?.[lastWaypoint];
            const isEndingOnJoint = lastStData?.isJoint;

            if (segments.length > 0 && !isEndingOnJoint) {
                const fullPath: string[] = [];
                const fullGeoms: [number, number][][] = [];
                const fullSectionIds: number[] = [];
                let totalDist = 0;

                segments.forEach((seg, idx) => {
                    if (idx === 0) fullPath.push(...seg.path);
                    else fullPath.push(...seg.path.slice(1));
                    fullGeoms.push(...seg.geometries);
                    fullSectionIds.push(...(seg.sectionIds || []));
                    totalDist += seg.distance;
                });

                const trip = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    start: waypoints[0],
                    end: waypoints[waypoints.length - 1],
                    startId: waypoints[0],
                    endId: waypoints[waypoints.length - 1],
                    path: fullPath,
                    distance: totalDist,
                    geometries: fullGeoms,
                    waypoints: waypoints,
                    sectionIds: Array.from(new Set(fullSectionIds)) // Uniquify
                };

                if (onRecordTrip) {
                    onRecordTrip(trip);
                }
            }
        }

        // Reset State
        setDragStartStation(null);
        setDragStartCoords(null);
        setDragPath([]);
        dragState.current = { waypoints: [], segments: [] };
        lastLayerPointRef.current = null;
        if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
    }, [graph, onRecordTrip, onDraftComplete]);

    // Handle Global Mouse/Touch Move/Up
    useEffect(() => {
        if (!map) return;

        const handleMove = (containerPoint: L.Point, layerPoint: L.Point, latlng: L.LatLng) => {
            const currentDragStation = dragStartStationRef.current;
            lastContainerPointRef.current = containerPoint;

            if (currentDragStation) {
                const { x, y } = containerPoint;
                const { x: w, y: h } = map.getSize();
                const threshold = 70;
                const speed = 10;

                // Detect overlay panel boundaries for left/right edge panning
                // The map extends full width behind the panels, so we need to
                // trigger edge scrolling at the panel boundaries, not the raw container edges
                let leftEdge = 0;
                let rightEdge = w;

                try {
                    // Find the left sidebar (first aside with w-[350px])
                    const leftSidebar = document.querySelector('aside.w-\\[350px\\]');
                    if (leftSidebar) {
                        const rect = leftSidebar.getBoundingClientRect();
                        const mapRect = map.getContainer().getBoundingClientRect();
                        leftEdge = rect.right - mapRect.left;
                    }
                    // Find the right sidebar (aside with w-[320px])
                    const rightSidebar = document.querySelector('aside.w-\\[320px\\]');
                    if (rightSidebar) {
                        const rect = rightSidebar.getBoundingClientRect();
                        const mapRect = map.getContainer().getBoundingClientRect();
                        rightEdge = rect.left - mapRect.left;
                    }
                } catch {
                    // Fallback: use raw container edges
                }

                let vx = 0;
                let vy = 0;

                if (x < leftEdge + threshold) vx = -speed;
                else if (x > rightEdge - threshold) vx = speed;

                if (y < threshold) vy = -speed;
                else if (y > h - threshold) vy = speed;

                scrollVelocityRef.current = { x: vx, y: vy };
                if (graph) updateDragPath(map, layerPoint, latlng);
            } else {
                scrollVelocityRef.current = { x: 0, y: 0 };
                lastLayerPointRef.current = layerPoint;
            }
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => {
            handleMove(e.containerPoint, e.layerPoint, e.latlng);
        };

        const onMouseUp = () => handleEnd();

        // Window-level mousemove: catches mouse events even when cursor is over
        // overlay panels (which have pointer-events-auto and block Leaflet events).
        // This is essential for edge panning to work at panel boundaries.
        const onWindowMouseMove = (e: MouseEvent) => {
            if (!dragStartStationRef.current) return;

            const container = map.getContainer();
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const containerPoint = L.point(x, y);
            const latlng = map.containerPointToLatLng(containerPoint);
            const layerPoint = map.latLngToLayerPoint(latlng);

            handleMove(containerPoint, layerPoint, latlng);
        };

        const onWindowMouseUp = () => {
            if (dragStartStationRef.current) handleEnd();
        };

        const onTouchMove = (e: TouchEvent) => {
            if (dragStartStationRef.current) {
                // Only prevent default if we are dragging
                e.preventDefault();
                const touch = e.touches[0];
                const container = map.getContainer();
                const rect = container.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                const containerPoint = L.point(x, y);
                const latlng = map.containerPointToLatLng(containerPoint);
                const layerPoint = map.latLngToLayerPoint(latlng);

                handleMove(containerPoint, layerPoint, latlng);
            }
        };

        const onTouchEnd = () => handleEnd();

        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);

        // Window-level listeners to catch events that panels intercept
        window.addEventListener('mousemove', onWindowMouseMove);
        window.addEventListener('mouseup', onWindowMouseUp);

        // Native listeners for valid touch handling
        const container = map.getContainer();
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onWindowMouseMove);
            window.removeEventListener('mouseup', onWindowMouseUp);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
        };
    }, [map, graph, handleEnd, updateDragPath]);

    return {
        dragStartStation,
        dragStartCoords,
        dragPath,
        handleStationMouseDown,
        handleStationMouseUp: handleEnd
    };
};

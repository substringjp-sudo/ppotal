import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { RailroadGraph, haversineDistance } from '../lib/graphUtils';

interface UseTripRecorderProps {
    graph: RailroadGraph | null;
    visibleStations: any;
    onRecordTrip?: (trip: any) => void;
    isEditMode?: boolean;
    onDraftComplete?: (trip: any) => void;
    onDragUpdate?: (waypoints: string[]) => void;
}

export const useTripRecorder = ({
    graph,
    visibleStations,
    onRecordTrip,
    isEditMode = false,
    onDraftComplete,
    onDragUpdate
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
    }, [map, onDragUpdate]);

    const updateDragPath = (mapInstance: L.Map, currentLayerPoint: L.Point, currentLatLng: L.LatLng) => {
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

            Object.entries(stations).forEach(([id, data]: [string, any]) => {
                const stLatLng = L.latLng(data.centroid[0], data.centroid[1]);
                const stPoint = mapInstance.latLngToLayerPoint(stLatLng);

                if (stPoint.x >= minX && stPoint.x <= maxX && stPoint.y >= minY && stPoint.y <= maxY) {
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

                if (waypoints.length > 1 && c.id === waypoints[waypoints.length - 2]) {
                    waypoints.pop();
                    segments.pop();
                    changed = true;
                } else {
                    const lastStData = stations[lastWaypoint];
                    const currStData = stations[c.id];
                    const pathData = graph.getShortestPath(
                        lastWaypoint,
                        c.id,
                        null
                    );

                    if (pathData) {
                        let isValid = true;

                        if (lastStData && currStData) {
                            const crowDist = haversineDistance(lastStData.centroid, currStData.centroid);
                            const railDist = pathData.distance;

                            if (railDist > 100) isValid = false;
                            if (isValid && crowDist < 5 && railDist > 3.0 && (railDist / (crowDist + 0.05)) > 4.0) {
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

            let allGeoms = segments.flatMap(s => s.geometries);
            const lastWaypoint = waypoints[waypoints.length - 1];
            if (stations[lastWaypoint]) {
                const startCoords = stations[lastWaypoint].centroid;
                const cursorCoords: [number, number] = [currentLatLng.lat, currentLatLng.lng];
                allGeoms = [...allGeoms, [startCoords, cursorCoords]];
            }

            setDragPath(allGeoms);
        }

        lastLayerPointRef.current = currentLayerPoint;
    };

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
    }, [map, dragStartStation]);

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

                let vx = 0;
                let vy = 0;

                if (x < threshold) vx = -speed;
                else if (x > w - threshold) vx = speed;

                if (y < threshold) vy = -speed;
                else if (y > h - threshold) vy = speed;

                scrollVelocityRef.current = { x: vx, y: vy };
                if (graph) updateDragPath(map, layerPoint, latlng);
            } else {
                scrollVelocityRef.current = { x: 0, y: 0 };
                lastLayerPointRef.current = layerPoint;
            }
        };

        const handleEnd = () => {
            const currentDragStation = dragStartStationRef.current;
            if (currentDragStation && graph) {
                const { waypoints, segments } = dragState.current;

                if (segments.length > 0) {
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
                        path: fullPath,
                        distance: totalDist,
                        geometries: fullGeoms,
                        waypoints: waypoints,
                        sectionIds: Array.from(new Set(fullSectionIds)) // Uniquify
                    };

                    if (isEditMode && onDraftComplete) {
                        // In edit mode, we return the draft but don't clear path immediately if needed?
                        // Actually, if we clear path, the 'draft' line disappears.
                        // We probably want the hook to reset, and the parent to render the 'draft' line using the returned trip.
                        onDraftComplete(trip);
                    } else if (!isEditMode && onRecordTrip) {
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
            if (map) map.dragging.enable();
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => {
            handleMove(e.containerPoint, e.layerPoint, e.latlng);
        };

        const onMouseUp = () => handleEnd();

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

        // Native listeners for valid touch handling
        const container = map.getContainer();
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
        };
    }, [map, graph, isEditMode, onRecordTrip, onDraftComplete]);

    return {
        dragStartStation,
        dragStartCoords,
        dragPath,
        handleStationMouseDown
    };
};

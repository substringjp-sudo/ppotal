import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ProcessedStation } from '../types/mapTypes';
import { RailData } from '../types/railData';
import { Trip } from '../types/trip';
import {
    advanceTrail,
    buildSnapIndex,
    createTrail,
    DragTrail,
    SnapIndex
} from '../lib/dragRouting';

interface UseTripRecorderProps {
    railData: RailData | null;
    visibleStations: Record<string, ProcessedStation> | null;
    onRecordTrip?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    onDraftComplete?: (trip: Trip) => void;
    selectedLines?: string[];
    activeLine?: string | null;
}

export const useTripRecorder = ({
    railData,
    visibleStations,
    onRecordTrip,
    onDragUpdate,
    onDraftComplete,
    selectedLines = [],
    activeLine = null
}: UseTripRecorderProps) => {
    const map = useMap();
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    const [dragPath, setDragPath] = useState<[number, number][][]>([]);

    const dragStartStationRef = useRef<string | null>(null);
    const visibleStationsRef = useRef(visibleStations);
    const snapIndexRef = useRef<SnapIndex | null>(null);

    const scrollVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastContainerPointRef = useRef<L.Point | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastLayerPointRef = useRef<L.Point | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    const dragState = useRef<DragTrail>(createTrail(''));
    const headingRef = useRef<{ x: number; y: number } | null>(null);
    /** Where the guide line should point, and where it is drawn right now. */
    const guideTargetRef = useRef<[number, number] | null>(null);
    const guideShownRef = useRef<[number, number] | null>(null);
    const [snapCandidate, setSnapCandidate] = useState<string | null>(null);

    useEffect(() => {
        visibleStationsRef.current = visibleStations;
    }, [visibleStations]);

    useEffect(() => {
        snapIndexRef.current = railData ? buildSnapIndex(railData) : null;
    }, [railData]);

    useEffect(() => {
        if (map) mapInstanceRef.current = map;
    }, [map]);

    useEffect(() => {
        if (!map || !map.dragging) return;
        if (dragStartStation) map.dragging.disable();
        else map.dragging.enable();
    }, [map, dragStartStation]);

    /**
     * Line ids the user has filtered the map down to, or null for "no filter".
     * Filtering the *edge* you would ride is stricter than the old check, which
     * only asked whether a station touched a selected line.
     */
    const allowedLinesRef = useRef<Set<number> | null>(null);
    useEffect(() => {
        // An empty selection means "no filter". A selection that resolves to no
        // real line — the __NONE__ sentinel — means the map is showing nothing,
        // so nothing should be draggable either.
        if (selectedLines.length === 0 && !activeLine) {
            allowedLinesRef.current = null;
            return;
        }

        const ids = new Set<number>();
        [...selectedLines, ...(activeLine ? [activeLine] : [])].forEach(key => {
            const raw = key.includes('::') ? key.split('::')[1] : key;
            const id = Number(raw);
            if (Number.isFinite(id) && id > 0) ids.add(id);
        });

        allowedLinesRef.current = ids;
    }, [selectedLines, activeLine]);

    const isEdgeAllowed = useCallback((lineIds: number[]) => {
        const allowed = allowedLinesRef.current;
        if (!allowed) return true;
        return lineIds.some(id => allowed.has(id));
    }, []);

    /** Repaints the route plus the eased guide line. */
    const redraw = useCallback(() => {
        const index = snapIndexRef.current;
        const trail = dragState.current;
        if (!index || !dragStartStationRef.current) return;

        const head = index.byId.get(trail.waypoints[trail.waypoints.length - 1]);
        const shown = guideShownRef.current;
        const guide: [number, number][][] = head && shown ? [[[head.lon, head.lat], shown]] : [];
        setDragPath([...trail.drawn, ...guide]);
    }, []);

    const redrawRef = useRef(redraw);
    useEffect(() => { redrawRef.current = redraw; }, [redraw]);

    const pointOf = useCallback((mapInstance: L.Map, stationId: string): L.Point | null => {
        const station = snapIndexRef.current?.byId.get(stationId);
        if (!station) return null;
        return mapInstance.latLngToLayerPoint(L.latLng(station.lat, station.lon));
    }, []);

    const handleStationMouseDown = useCallback(
        (id: string, coords: [number, number]) => {
            const index = snapIndexRef.current;
            // Only stations the graph can route from can start a drag; otherwise
            // the gesture would swallow the map pan and then draw nothing.
            if (!index || !index.byId.has(id)) return;

            const stations = visibleStationsRef.current;
            const data = stations?.[id];
            if (data && !data.isJoint) {
                const allowed = allowedLinesRef.current;
                if (allowed) {
                    const onSelectedLine = data.lines?.some(key => {
                        const raw = key.includes('::') ? key.split('::')[1] : key;
                        return allowed.has(Number(raw));
                    });
                    if (!onSelectedLine) return;
                }
            }

            dragStartStationRef.current = id;
            setDragStartStation(id);
            setDragStartCoords(coords);
            setDragPath([]);
            dragState.current = createTrail(id);
            headingRef.current = null;
            guideTargetRef.current = [coords[1], coords[0]];
            guideShownRef.current = [coords[1], coords[0]];
            setSnapCandidate(null);

            onDragUpdate?.([id]);
            if (map) {
                map.dragging.disable();
                lastLayerPointRef.current = map.latLngToLayerPoint(L.latLng(coords[0], coords[1]));
            }
        },
        [map, onDragUpdate]
    );

    const updateDragPath = useCallback(
        (mapInstance: L.Map, currentLayerPoint: L.Point, currentLatLng: L.LatLng) => {
            const index = snapIndexRef.current;
            if (!dragStartStationRef.current || !index) return;

            // Direction of travel, smoothed so a shaky hand does not flip it.
            const previousPoint = lastLayerPointRef.current;
            if (previousPoint) {
                const dx = currentLayerPoint.x - previousPoint.x;
                const dy = currentLayerPoint.y - previousPoint.y;
                const length = Math.hypot(dx, dy);
                if (length > 1.5) {
                    const smoothing = 0.35;
                    const previousHeading = headingRef.current;
                    const blended = previousHeading
                        ? {
                              x: previousHeading.x * (1 - smoothing) + (dx / length) * smoothing,
                              y: previousHeading.y * (1 - smoothing) + (dy / length) * smoothing
                          }
                        : { x: dx / length, y: dy / length };
                    const size = Math.hypot(blended.x, blended.y) || 1;
                    headingRef.current = { x: blended.x / size, y: blended.y / size };
                }
            }

            const trail = dragState.current;
            const result = advanceTrail(index, trail, {
                project: id => pointOf(mapInstance, id),
                projectLatLon: (lat, lon) => mapInstance.latLngToLayerPoint(L.latLng(lat, lon)),
                cursor: currentLayerPoint,
                heading: headingRef.current,
                cursorLat: currentLatLng.lat,
                cursorLon: currentLatLng.lng,
                isEdgeAllowed
            });

            // The guide line ends on the track beside the cursor rather than at
            // the cursor itself, so the route reads as being drawn along the
            // rails instead of trailing a straight tether behind the pointer.
            const snapped = result.anchor
                ? mapInstance.layerPointToLatLng(L.point(result.anchor.x, result.anchor.y))
                : currentLatLng;
            guideTargetRef.current = [snapped.lng, snapped.lat];

            setSnapCandidate(previous => (previous === result.candidate ? previous : result.candidate));
            if (result.changed) onDragUpdate?.([...trail.waypoints]);

            lastLayerPointRef.current = currentLayerPoint;
            redrawRef.current();
        },
        [isEdgeAllowed, onDragUpdate, pointOf]
    );

    const updateDragPathRef = useRef(updateDragPath);
    useEffect(() => {
        updateDragPathRef.current = updateDragPath;
    }, [updateDragPath]);

    useEffect(() => {
        if (!dragStartStation || !map) return;

        const loop = () => {
            const velocity = scrollVelocityRef.current;
            if ((velocity.x !== 0 || velocity.y !== 0) && lastContainerPointRef.current) {
                map.panBy([velocity.x, velocity.y], { animate: false });
                const latlng = map.containerPointToLatLng(lastContainerPointRef.current);
                updateDragPathRef.current(map, map.latLngToLayerPoint(latlng), latlng);
            }

            // Ease the guide line towards where it should point instead of
            // teleporting it, which is what made the magnet feel like a snap
            // rather than a pull.
            const target = guideTargetRef.current;
            if (target) {
                const shown = guideShownRef.current;
                if (!shown) {
                    guideShownRef.current = [...target] as [number, number];
                    redrawRef.current();
                } else {
                    const ease = 0.28;
                    const nextLon = shown[0] + (target[0] - shown[0]) * ease;
                    const nextLat = shown[1] + (target[1] - shown[1]) * ease;
                    const settled =
                        Math.abs(target[0] - nextLon) < 1e-7 && Math.abs(target[1] - nextLat) < 1e-7;
                    guideShownRef.current = settled ? ([...target] as [number, number]) : [nextLon, nextLat];
                    redrawRef.current();
                }
            }

            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [map, dragStartStation]);

    const handleEnd = useCallback(() => {
        if (!dragStartStationRef.current) return;
        dragStartStationRef.current = null;

        const { waypoints, segments } = dragState.current;

        if (segments.length > 0 && segments.length === waypoints.length - 1) {
            const fullPath: string[] = [];
            const fullGeoms: [number, number][][] = [];
            const fullSectionIds: number[] = [];
            let totalDistance = 0;

            segments.forEach((segment, index) => {
                if (index === 0) fullPath.push(...segment.path);
                else fullPath.push(...segment.path.slice(1));

                fullGeoms.push(...segment.geometries);
                fullSectionIds.push(...segment.sectionIds);
                totalDistance += segment.distance;
            });

            onRecordTrip?.({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                start: waypoints[0],
                end: waypoints[waypoints.length - 1],
                startId: waypoints[0],
                endId: waypoints[waypoints.length - 1],
                path: fullPath,
                distance: Math.round(totalDistance * 10) / 10,
                geometries: fullGeoms,
                waypoints: [...waypoints],
                sectionIds: Array.from(new Set(fullSectionIds))
            });
            onDraftComplete?.(null as never);
        }

        setDragStartStation(null);
        setDragStartCoords(null);
        setDragPath([]);
        dragState.current = createTrail('');
        headingRef.current = null;
        guideTargetRef.current = null;
        guideShownRef.current = null;
        setSnapCandidate(null);
        lastLayerPointRef.current = null;
        scrollVelocityRef.current = { x: 0, y: 0 };
        if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
    }, [onRecordTrip, onDraftComplete]);

    const handleEndRef = useRef(handleEnd);
    useEffect(() => {
        handleEndRef.current = handleEnd;
    }, [handleEnd]);

    useEffect(() => {
        if (!map) return;

        const handleMove = (containerPoint: L.Point, layerPoint: L.Point, latlng: L.LatLng) => {
            lastContainerPointRef.current = containerPoint;
            if (!dragStartStationRef.current) {
                scrollVelocityRef.current = { x: 0, y: 0 };
                lastLayerPointRef.current = layerPoint;
                return;
            }

            // Edge scrolling accelerates with how far past the edge the cursor
            // is, so crossing the country no longer creeps at a fixed 10px.
            const { x, y } = containerPoint;
            const { x: width, y: height } = map.getSize();
            const margin = 70;
            const speed = (overshoot: number) =>
                Math.min(38, 6 + Math.round((overshoot / margin) * 32));

            let vx = 0;
            let vy = 0;
            if (x < margin) vx = -speed(margin - x);
            else if (x > width - margin) vx = speed(x - (width - margin));
            if (y < margin) vy = -speed(margin - y);
            else if (y > height - margin) vy = speed(y - (height - margin));

            scrollVelocityRef.current = { x: vx, y: vy };
            updateDragPathRef.current(map, layerPoint, latlng);
        };

        const onMouseMove = (e: L.LeafletMouseEvent) =>
            handleMove(e.containerPoint, e.layerPoint, e.latlng);
        const onMouseUp = () => handleEndRef.current();
        const onTouchMove = (e: TouchEvent) => {
            if (!dragStartStationRef.current) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
            const latlng = map.containerPointToLatLng(point);
            handleMove(point, map.latLngToLayerPoint(latlng), latlng);
        };

        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        const container = map.getContainer();
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onMouseUp);
        // A drag that ends outside the map must still settle.
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onMouseUp);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [map]);

    return {
        dragStartStation,
        dragStartCoords,
        dragPath,
        handleStationMouseDown,
        handleStationMouseUp: handleEnd,
        /** Station the drawing is currently pulling towards, for the snap hint. */
        snapCandidate
    };
};

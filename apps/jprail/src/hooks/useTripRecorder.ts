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

            const trail = dragState.current;
            const changed = advanceTrail(index, trail, {
                project: id => pointOf(mapInstance, id),
                projectLatLon: (lat, lon) => mapInstance.latLngToLayerPoint(L.latLng(lat, lon)),
                cursor: currentLayerPoint,
                strokeStart: lastLayerPointRef.current ?? currentLayerPoint,
                cursorLat: currentLatLng.lat,
                cursorLon: currentLatLng.lng,
                isEdgeAllowed
            });

            // Rubber band from the trail's head to the cursor.
            const head = index.byId.get(trail.waypoints[trail.waypoints.length - 1]);
            const indicator: [number, number][][] = head
                ? [[[head.lon, head.lat], [currentLatLng.lng, currentLatLng.lat]]]
                : [];

            setDragPath([...trail.drawn, ...indicator]);
            if (changed) onDragUpdate?.([...trail.waypoints]);

            lastLayerPointRef.current = currentLayerPoint;
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
        handleStationMouseUp: handleEnd
    };
};

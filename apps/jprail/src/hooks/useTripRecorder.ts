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
    querySnapBox,
    DragTrail,
    SnapIndex
} from '../lib/dragRouting';
import {
    LONG_PRESS_MS,
    LONG_PRESS_CANCEL_PX,
    TOUCH_HIT_RADIUS_PX,
    haptic
} from '../lib/mobile';
import { isActive as edgePanActive, step as edgePanStep } from '../lib/edgePan';
import {
    PointerKind,
    acceptsMouseDown,
    normalisePointerType,
    prefersCoarsePointer
} from '../lib/pointerInput';

interface UseTripRecorderProps {
    railData: RailData | null;
    visibleStations: Record<string, ProcessedStation> | null;
    onRecordTrip?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    onDraftComplete?: (trip: Trip) => void;
    selectedLines?: string[];
    activeLine?: string | null;
    /**
     * Layout only. Which *gesture* starts a drawing is decided per event from
     * `PointerEvent.pointerType`, not from the width of the window — see
     * `lib/pointerInput`. Kept so callers that pass it still compile.
     *
     * @deprecated 그리기 진입은 창 너비가 아니라 짚은 방식으로 가른다.
     */
    isMobile?: boolean;
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

    /**
     * Sub-pixel carry for the edge pan.
     *
     * The pan is a speed in pixels per second, so a frame is rarely a whole
     * number of pixels. Rounding each frame away would make a slow crawl stop
     * dead; keeping the remainder lets 0.4px/frame still travel.
     */
    const panCarryRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastPanTickRef = useRef<number | null>(null);
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

    /**
     * The station a finger is currently holding, before the hold completes.
     * Drives the gauge; cleared the moment the gesture is cancelled or armed.
     */
    const [pressCandidate, setPressCandidate] = useState<{ id: string; lat: number; lon: number } | null>(null);
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

    /** What the user last touched the map with, and when a finger last left it. */
    const pointerKindRef = useRef<PointerKind>('unknown');
    const lastTouchAtRef = useRef<number | null>(null);
    /** Only consulted when the browser gives no `pointerType` to go on. */
    const coarseRef = useRef(false);
    useEffect(() => { coarseRef.current = prefersCoarsePointer(); }, []);

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

    /**
     * Start drawing from a station, whatever opened the door.
     *
     * Unguarded on purpose: the hold path has already decided a finger meant
     * this, so it must not be second-guessed by the same check that keeps a
     * *mouse* event from starting a second drawing.
     */
    const beginDrag = useCallback(
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

    /**
     * A station was pressed with a pointing device.
     *
     * Only a real mouse starts a drawing here. A finger reaches drawing through
     * the hold below — and the browser's compatibility `mousedown`, fired a
     * moment after that same finger lifts, would otherwise start a second one
     * over the tap the user already finished.
     */
    const handleStationMouseDown = useCallback(
        (id: string, coords: [number, number]) => {
            if (!acceptsMouseDown(
                pointerKindRef.current, coarseRef.current, lastTouchAtRef.current, Date.now()
            )) return;
            beginDrag(id, coords);
        },
        [beginDrag]
    );

    /** Nearest routable station to a screen point, or null if none is close. */
    const stationAtPoint = useCallback((containerPoint: L.Point): { id: string; lat: number; lon: number } | null => {
        const index = snapIndexRef.current;
        const mapInstance = mapInstanceRef.current;
        if (!index || !mapInstance) return null;

        const centre = mapInstance.containerPointToLatLng(containerPoint);
        // A degree box wide enough to cover the hit radius at this zoom. Derived
        // from the map rather than assumed, so it stays correct as you zoom.
        const edge = mapInstance.containerPointToLatLng(
            L.point(containerPoint.x + TOUCH_HIT_RADIUS_PX, containerPoint.y + TOUCH_HIT_RADIUS_PX)
        );
        const dLat = Math.abs(edge.lat - centre.lat);
        const dLon = Math.abs(edge.lng - centre.lng);

        const candidates = querySnapBox(
            index,
            centre.lat - dLat, centre.lat + dLat,
            centre.lng - dLon, centre.lng + dLon
        );
        if (candidates.length === 0) return null;

        // The box is square in degrees; the real test is distance in pixels,
        // so the hit area is round and does not stretch near the poles.
        let best: { id: string; lat: number; lon: number } | null = null;
        let bestDist = TOUCH_HIT_RADIUS_PX;
        for (const station of candidates) {
            const point = mapInstance.latLngToContainerPoint(L.latLng(station.lat, station.lon));
            const dist = Math.hypot(point.x - containerPoint.x, point.y - containerPoint.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { id: station.id, lat: station.lat, lon: station.lon };
            }
        }
        return best;
    }, []);

    const cancelPress = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        pressOriginRef.current = null;
        setPressCandidate(prev => (prev ? null : prev));
    }, []);

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
            const now = performance.now();
            const previous = lastPanTickRef.current;
            lastPanTickRef.current = now;
            // A frame the browser skipped must not become one long jump, so the
            // step is capped at what a very slow frame would have been.
            const seconds = previous === null ? 0 : Math.min(0.05, (now - previous) / 1000);

            const point = lastContainerPointRef.current;
            const size = map.getSize();
            if (point && seconds > 0 && edgePanActive(point.x, point.y, size.x, size.y)) {
                const [dx, dy] = edgePanStep(point.x, point.y, size.x, size.y, seconds);
                const carry = panCarryRef.current;
                const wantX = carry.x + dx;
                const wantY = carry.y + dy;
                // Whole pixels keep the tiles crisp; the fraction is carried.
                const panX = Math.trunc(wantX);
                const panY = Math.trunc(wantY);
                panCarryRef.current = { x: wantX - panX, y: wantY - panY };
                if (panX !== 0 || panY !== 0) {
                    map.panBy([panX, panY], { animate: false });
                    const latlng = map.containerPointToLatLng(point);
                    updateDragPathRef.current(map, map.latLngToLayerPoint(latlng), latlng);
                }
            } else {
                panCarryRef.current = { x: 0, y: 0 };
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
        panCarryRef.current = { x: 0, y: 0 };
        lastPanTickRef.current = null;
        if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
    }, [onRecordTrip, onDraftComplete]);

    const handleEndRef = useRef(handleEnd);
    useEffect(() => {
        handleEndRef.current = handleEnd;
    }, [handleEnd]);

    // The touch listeners below are bound once per map, so they reach the
    // current callbacks through refs rather than re-binding on every render.
    const stationAtPointRef = useRef(stationAtPoint);
    useEffect(() => { stationAtPointRef.current = stationAtPoint; }, [stationAtPoint]);

    const cancelPressRef = useRef(cancelPress);
    useEffect(() => { cancelPressRef.current = cancelPress; }, [cancelPress]);

    const startDragRef = useRef(beginDrag);
    useEffect(() => { startDragRef.current = beginDrag; }, [beginDrag]);

    // A hold left armed when the component goes away would fire into nothing.
    useEffect(() => () => {
        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    }, []);

    useEffect(() => {
        if (!map) return;

        const handleMove = (containerPoint: L.Point, layerPoint: L.Point, latlng: L.LatLng) => {
            lastContainerPointRef.current = containerPoint;
            if (!dragStartStationRef.current) {
                lastLayerPointRef.current = layerPoint;
                return;
            }

            // Where the map pans is read from this position by the frame loop
            // (`lib/edgePan`), so nothing is computed here: a hand held still
            // inside the band keeps the map moving, which a per-event ramp
            // could not do.
            updateDragPathRef.current(map, layerPoint, latlng);
        };

        const onMouseMove = (e: L.LeafletMouseEvent) =>
            handleMove(e.containerPoint, e.layerPoint, e.latlng);
        const onMouseUp = () => handleEndRef.current();
        const onTouchEndAll = () => {
            lastTouchAtRef.current = Date.now();
            cancelPressRef.current();
            handleEndRef.current();
        };
        const onTouchMove = (e: TouchEvent) => {
            lastTouchAtRef.current = Date.now();
            if (!dragStartStationRef.current) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
            const latlng = map.containerPointToLatLng(point);
            handleMove(point, map.latLngToLayerPoint(latlng), latlng);
        };

        /**
         * Hold a station to start drawing.
         *
         * On a phone the drag gesture cannot begin on contact, because that is
         * how the map pans. So contact only *arms* it: if the finger stays
         * within a few pixels for `LONG_PRESS_MS`, the same drag the desktop
         * starts on mousedown takes over, and everything below this — the
         * trail, the snapping, the edge scrolling — is already shared.
         *
         * Nothing is preventDefault-ed while waiting. A hold that turns into a
         * pan has to stay a pan.
         */
        const onTouchStart = (e: TouchEvent) => {
            // No width test. A `touchstart` *is* a finger, and a touchscreen
            // laptop is as much a finger as a phone — gating this on the size
            // of the window is what kept drawing out of reach there.
            pointerKindRef.current = 'touch';
            lastTouchAtRef.current = Date.now();
            if (dragStartStationRef.current) return;
            // A second finger means a pinch, which is a zoom, not a draw.
            if (e.touches.length !== 1) { cancelPressRef.current(); return; }

            const touch = e.touches[0];
            const rect = map.getContainer().getBoundingClientRect();
            const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);

            const station = stationAtPointRef.current(point);
            if (!station) return;

            pressOriginRef.current = { x: touch.clientX, y: touch.clientY };
            setPressCandidate(station);

            pressTimerRef.current = setTimeout(() => {
                pressTimerRef.current = null;
                pressOriginRef.current = null;
                setPressCandidate(null);
                // The buzz is the confirmation that the hold took, so it fires
                // with the state change rather than after the first movement.
                haptic('select');
                startDragRef.current(station.id, [station.lat, station.lon]);
            }, LONG_PRESS_MS);
        };

        const onTouchMoveArmed = (e: TouchEvent) => {
            const origin = pressOriginRef.current;
            if (!origin || !e.touches.length) return;
            const touch = e.touches[0];
            if (Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > LONG_PRESS_CANCEL_PX) {
                cancelPressRef.current();
            }
        };

        // Capture, so the kind of pointer is known before any handler that
        // might act on it — including Leaflet's own.
        const onPointerDown = (e: PointerEvent) => {
            const kind = normalisePointerType(e.pointerType);
            pointerKindRef.current = kind;
            if (kind === 'touch' || kind === 'pen') lastTouchAtRef.current = Date.now();
        };

        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        const container = map.getContainer();
        container.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
        container.addEventListener('touchstart', onTouchStart, { passive: true });
        container.addEventListener('touchmove', onTouchMoveArmed, { passive: true });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEndAll);
        container.addEventListener('touchcancel', onTouchEndAll);
        // A drag that ends outside the map must still settle.
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            container.removeEventListener('pointerdown', onPointerDown, { capture: true });
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMoveArmed);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEndAll);
            container.removeEventListener('touchcancel', onTouchEndAll);
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
        snapCandidate,
        /** Station being held, while the hold is still filling. */
        pressCandidate
    };
};

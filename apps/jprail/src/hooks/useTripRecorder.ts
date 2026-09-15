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
    reverseTrail,
    stationPath,
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
    Point as ScreenPoint,
    distanceToSegment,
    touchedStations as measureTouched,
    touchedForFoundRoute,
    unsureCount as countUnsure
} from '../lib/spanCertainty';
import { CandidateRoute, findCandidateRoutesAsync } from '../lib/routeSearch';
import {
    PointerKind,
    acceptsMouseDown,
    normalisePointerType,
    prefersCoarsePointer
} from '../lib/pointerInput';

/** How far the cursor must move before the trail records another point. */
const TRAIL_STEP_PX = 2;

/**
 * How near an end of a finished drawing counts as grabbing its handle (px).
 * The app's `SpanDrawing.GRIP_RADIUS_DP`.
 */
export const GRIP_RADIUS_PX = 26;

/** A press that moves less than this, and ends sooner than this, is a tap. */
const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 500;

/**
 * How long a drawing just put away can be taken back (ms).
 *
 * Tapping empty map is easy to do by accident — it is also how you dismiss
 * things — so keeping it must be as easy to undo as it was to trigger. The
 * app's `SAVED_UNDO_WINDOW_MS`.
 */
export const UNDO_WINDOW_MS = 6000;

/**
 * How still a finished drawing has to be before other ways round are offered
 * (ms). The app's `SPAN_IDLE_BEFORE_DETOURS_MS`.
 *
 * Offering them straight away would put grey lines under a hand that is still
 * working. They are for the moment the hand stops.
 */
export const DETOUR_IDLE_MS = 900;

/** At most this many. A handful to glance at, not a list to read. */
export const MAX_DETOURS = 3;

/** How near a grey line a tap counts as picking it (px). */
const DETOUR_TAP_PX = 22;

export type SpanEnd = 'start' | 'finish';

/**
 * A drawing the user has finished but not yet put away.
 *
 * Letting go of a drawing used to record it on the spot. It does not any more:
 * the drawing stays on the map with a handle at each end, so the ends can be
 * pulled to the right stations before it is kept. Tapping an empty part of the
 * map is what says "that's it" — the same gesture that means "nothing here" on
 * every other map.
 */
export interface HeldSpan {
    /**
     * What to call it, when something already named it — a route found from
     * two stations arrives as "A → B".
     *
     * Dropped the moment an end is pulled somewhere else: the name described
     * *those* two stations, and keeping it on a different pair would be a
     * label that lies. The list falls back to the ends' own names.
     */
    name?: string;
    /** Exactly what was drawn, so picking it up again continues rather than re-routes. */
    trail: DragTrail;
    /** Stations the cursor really passed. The rest the app filled in. */
    touched: Set<string>;
    path: string[];
    /** Stations on it the cursor never passed. */
    unsureCount: number;
    /** Track the cursor went over, and track the app filled in. */
    sure: [number, number][][];
    unsure: [number, number][][];
    start: { id: string; lat: number; lon: number };
    finish: { id: string; lat: number; lon: number };
    distance: number;
    sectionIds: number[];
    geometries: [number, number][][];
}

/**
 * A route that arrived already found rather than drawn — a search result, or
 * one of the grey ways offered beside a drawing.
 */
export interface FoundRoute {
    path: string[];
    sectionIds: number[];
    geometries: [number, number][][];
    distance: number;
    name?: string;
}

/** Hops the cursor went over, split from hops the app filled in. */
function splitByCertainty(trail: DragTrail, touched: ReadonlySet<string>) {
    const sure: [number, number][][] = [];
    const unsure: [number, number][][] = [];
    trail.segments.forEach(segment => {
        const bucket = segment.path.every(id => touched.has(id)) ? sure : unsure;
        bucket.push(...segment.geometries);
    });
    return { sure, unsure };
}

interface UseTripRecorderProps {
    railData: RailData | null;
    visibleStations: Record<string, ProcessedStation> | null;
    onRecordTrip?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    onDraftComplete?: (trip: Trip) => void;
    /** Takes back what the last tap put away. */
    onDeleteTrip?: (id: string) => void;
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
    onDeleteTrip,
    selectedLines = [],
    activeLine = null
}: UseTripRecorderProps) => {
    const map = useMap();
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    /** Track the user drew over herself. */
    const [dragPath, setDragPath] = useState<[number, number][][]>([]);
    /** Track the app filled in where the cursor never went. Drawn dashed. */
    const [dragPathUnsure, setDragPathUnsure] = useState<[number, number][][]>([]);
    /** The eased tether from the head of the drawing to the cursor. */
    const [dragGuide, setDragGuide] = useState<[number, number][][]>([]);
    /** How many stations on the drawing the cursor never passed. */
    const [unsureCount, setUnsureCount] = useState(0);
    /** A finished drawing, still on the map and still editable. */
    const [heldSpan, setHeldSpan] = useState<HeldSpan | null>(null);
    /** What the last tap put away, so it can be taken back. */
    const [lastRecorded, setLastRecorded] = useState<Trip | null>(null);
    /** Other ways between the same two stations, offered once the hand stops. */
    const [detours, setDetours] = useState<CandidateRoute[]>([]);

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

    /**
     * Where the cursor has been, in world coordinates, and the same path
     * projected to the screen.
     *
     * World coordinates are the record because the map moves underneath: with
     * edge panning, a trail kept in screen pixels would point at the wrong
     * ground a second later, and stations the user really did pass would come
     * out as "filled in". The projection is cached and only rebuilt when the
     * zoom changes, since panning does not move layer points.
     */
    const trailWorldRef = useRef<[number, number][]>([]);
    const trailScreenRef = useRef<ScreenPoint[]>([]);
    const trailZoomRef = useRef<number | null>(null);
    /** Stations the cursor has passed, and the path as it was one move ago. */
    const touchedRef = useRef<Set<string>>(new Set());
    const knownPathRef = useRef<Set<string>>(new Set());

    const heldSpanRef = useRef<HeldSpan | null>(null);
    const detoursRef = useRef<CandidateRoute[]>([]);
    useEffect(() => { detoursRef.current = detours; }, [detours]);
    /**
     * True while the working trail is turned around.
     *
     * A trail only grows at its head, so pulling the *starting* end means
     * drawing a reversed copy and turning it back when the hand lifts. The
     * drawing the user sees never changes direction.
     */
    const reversedRef = useRef(false);
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
        const container = map.getContainer();
        if (dragStartStation) {
            map.dragging.disable();
            // Leaflet's own `touch-action: none` comes from the class it adds
            // for map dragging — which we just took away. Without this the
            // page itself scrolls under a finger that is drawing.
            container.style.touchAction = 'none';
        } else {
            map.dragging.enable();
            container.style.touchAction = '';
        }
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

    /**
     * Repaints the route plus the eased guide line.
     *
     * A hop is drawn solid only if the cursor passed *every* station on it. A
     * hop the router filled in — a skip-stop edge, or a jump across a gap —
     * has stations nobody touched, and drawing it like the rest would claim a
     * memory the user never had.
     */
    const redraw = useCallback(() => {
        const index = snapIndexRef.current;
        const trail = dragState.current;
        if (!index || !dragStartStationRef.current) return;

        const { sure, unsure } = splitByCertainty(trail, touchedRef.current);

        const head = index.byId.get(trail.waypoints[trail.waypoints.length - 1]);
        const shown = guideShownRef.current;
        setDragPath(sure);
        setDragPathUnsure(unsure);
        setDragGuide(head && shown ? [[[head.lon, head.lat], shown]] : []);
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
            reversedRef.current = false;
            // A new drawing replaces the one still sitting on the map.
            setHeldSpan(null);
            heldSpanRef.current = null;
            setDetours([]);
            // The station you started from is one you certainly remember.
            trailWorldRef.current = [[coords[1], coords[0]]];
            trailScreenRef.current = [];
            trailZoomRef.current = null;
            touchedRef.current = new Set([id]);
            knownPathRef.current = new Set([id]);
            setDragPathUnsure([]);
            setDragGuide([]);
            setUnsureCount(0);
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
    /**
     * Records where the cursor is and hands back the whole trail in screen
     * coordinates, ready to be measured against.
     */
    const noteCursor = useCallback((mapInstance: L.Map, lat: number, lon: number): ScreenPoint[] => {
        const zoom = mapInstance.getZoom();
        const point = mapInstance.latLngToLayerPoint(L.latLng(lat, lon));
        // Panning does not move layer points, so the cache survives an edge
        // pan untouched. A zoom does move them, and then it is rebuilt.
        if (trailZoomRef.current !== zoom) {
            trailZoomRef.current = zoom;
            trailScreenRef.current = trailWorldRef.current.map(([wlon, wlat]) => {
                const at = mapInstance.latLngToLayerPoint(L.latLng(wlat, wlon));
                return { x: at.x, y: at.y };
            });
        }

        const last = trailScreenRef.current[trailScreenRef.current.length - 1];
        if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= TRAIL_STEP_PX) {
            trailWorldRef.current.push([lon, lat]);
            trailScreenRef.current.push({ x: point.x, y: point.y });
        } else {
            // Still the current position, even when it is too small a move to
            // keep: the last point of the trail is what "where the cursor is
            // now" means to the certainty rule.
            trailScreenRef.current[trailScreenRef.current.length - 1] = { x: point.x, y: point.y };
            trailWorldRef.current[trailWorldRef.current.length - 1] = [lon, lat];
        }
        return trailScreenRef.current;
    }, []);

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

            // Which stations the user actually passed, measured against the
            // whole trail rather than the points that happened to be sampled —
            // so the same sweep gives the same answer drawn fast or slow.
            const screenTrail = noteCursor(mapInstance, currentLatLng.lat, currentLatLng.lng);
            const fullPath = stationPath(trail);
            touchedRef.current = measureTouched({
                path: fullPath,
                previous: touchedRef.current,
                known: knownPathRef.current,
                project: id => {
                    const at = pointOf(mapInstance, id);
                    return at ? { x: at.x, y: at.y } : null;
                },
                trail: screenTrail
            });
            knownPathRef.current = new Set(fullPath);
            const unsure = countUnsure(fullPath, touchedRef.current);
            setUnsureCount(previous => (previous === unsure ? previous : unsure));

            setSnapCandidate(previous => (previous === result.candidate ? previous : result.candidate));
            if (result.changed) onDragUpdate?.([...trail.waypoints]);

            lastLayerPointRef.current = currentLayerPoint;
            redrawRef.current();
        },
        [isEdgeAllowed, noteCursor, onDragUpdate, pointOf]
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

    /**
     * Packs a finished trail into something that can sit on the map and still
     * be picked up. Returns null when there is nothing to keep.
     */
    const holdFrom = useCallback((
        trail: DragTrail,
        touched: Set<string>,
        name?: string
    ): HeldSpan | null => {
        const index = snapIndexRef.current;
        if (!index) return null;
        const { waypoints, segments } = trail;
        if (segments.length === 0 || segments.length !== waypoints.length - 1) return null;

        const path = stationPath(trail);
        const start = index.byId.get(path[0]);
        const finish = index.byId.get(path[path.length - 1]);
        if (!start || !finish) return null;

        return {
            name,
            trail,
            touched,
            path,
            unsureCount: countUnsure(path, touched),
            ...splitByCertainty(trail, touched),
            start: { id: start.id, lat: start.lat, lon: start.lon },
            finish: { id: finish.id, lat: finish.lat, lon: finish.lon },
            distance: Math.round(segments.reduce((sum, s) => sum + s.distance, 0) * 10) / 10,
            sectionIds: Array.from(new Set(segments.flatMap(s => s.sectionIds))),
            geometries: segments.flatMap(s => s.geometries)
        };
    }, []);

    const handleEnd = useCallback(() => {
        if (!dragStartStationRef.current) return;
        dragStartStationRef.current = null;

        // Turn a reversed working copy back before anyone looks at it, so the
        // drawing keeps the direction it was first drawn in.
        const drawn = reversedRef.current ? reverseTrail(dragState.current) : dragState.current;
        reversedRef.current = false;
        const span = holdFrom(drawn, touchedRef.current);
        // Nothing left to hold means the ends were pulled back together; the
        // drawing is gone rather than kept empty.
        setHeldSpan(span);
        heldSpanRef.current = span;
        setDetours([]);

        setDragStartStation(null);
        setDragStartCoords(null);
        setDragPath([]);
        setDragPathUnsure([]);
        setDragGuide([]);
        setUnsureCount(0);
        trailWorldRef.current = [];
        trailScreenRef.current = [];
        trailZoomRef.current = null;
        touchedRef.current = new Set();
        knownPathRef.current = new Set();
        dragState.current = createTrail('');
        headingRef.current = null;
        guideTargetRef.current = null;
        guideShownRef.current = null;
        setSnapCandidate(null);
        lastLayerPointRef.current = null;
        panCarryRef.current = { x: 0, y: 0 };
        lastPanTickRef.current = null;
        if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
    }, [holdFrom]);

    const handleEndRef = useRef(handleEnd);
    useEffect(() => {
        handleEndRef.current = handleEnd;
    }, [handleEnd]);

    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearUndoTimer = () => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
    };
    useEffect(() => clearUndoTimer, []);

    /** Put the held drawing away as a trip. */
    const commitHeld = useCallback(() => {
        const span = heldSpanRef.current;
        if (!span) return;
        const trip: Trip = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            name: span.name,
            // When it was kept, not when it was ridden — `date` stays empty
            // because a drawing does not say which day it was.
            createdAt: new Date().toISOString(),
            start: span.start.id,
            end: span.finish.id,
            startId: span.start.id,
            endId: span.finish.id,
            path: span.path,
            distance: span.distance,
            geometries: span.geometries,
            waypoints: [...span.trail.waypoints],
            sectionIds: span.sectionIds,
            // Kept in the path's own order, so reading the record back does
            // not depend on how a Set happened to iterate.
            touched: span.path.filter(id => span.touched.has(id))
        };
        setHeldSpan(null);
        heldSpanRef.current = null;
        setDetours([]);
        onRecordTrip?.(trip);
        onDraftComplete?.(null as never);
        setLastRecorded(trip);
        clearUndoTimer();
        undoTimerRef.current = setTimeout(() => setLastRecorded(null), UNDO_WINDOW_MS);
    }, [onRecordTrip, onDraftComplete]);

    /** Take the last one back, and leave it on the map to carry on editing. */
    const undoLastRecorded = useCallback(() => {
        const trip = lastRecorded;
        if (!trip) return;
        clearUndoTimer();
        setLastRecorded(null);
        onDeleteTrip?.(trip.id);
    }, [lastRecorded, onDeleteTrip]);

    const dismissLastRecorded = useCallback(() => {
        clearUndoTimer();
        setLastRecorded(null);
    }, []);

    /** Which end of the held drawing a press landed on, if either. */
    const gripAt = useCallback((containerPoint: L.Point): SpanEnd | null => {
        const span = heldSpanRef.current;
        const mapInstance = mapInstanceRef.current;
        if (!span || !mapInstance) return null;
        const near = (at: { lat: number; lon: number }) => {
            const point = mapInstance.latLngToContainerPoint(L.latLng(at.lat, at.lon));
            return Math.hypot(point.x - containerPoint.x, point.y - containerPoint.y) <= GRIP_RADIUS_PX;
        };
        // When the two ends sit on top of each other — a there-and-back — the
        // finishing end is the one that answers, since that is the one the
        // hand just left.
        if (near(span.finish)) return 'finish';
        if (near(span.start)) return 'start';
        return null;
    }, []);

    /**
     * Pick a finished drawing back up by one of its ends.
     *
     * Unlike starting a drawing, this needs no hold: a handle is an explicit
     * thing to grab, so grabbing it cannot be mistaken for panning the map.
     */
    const resumeFromGrip = useCallback((end: SpanEnd): boolean => {
        const span = heldSpanRef.current;
        const mapInstance = mapInstanceRef.current;
        if (!span || !mapInstance) return false;

        const working = end === 'start' ? reverseTrail(span.trail) : span.trail;
        reversedRef.current = end === 'start';
        const head = end === 'start' ? span.start : span.finish;

        dragState.current = working;
        dragStartStationRef.current = working.waypoints[0];
        setDragStartStation(working.waypoints[0]);
        setDragStartCoords([head.lat, head.lon]);
        // Everything already drawn stays as certain as it was; only what the
        // hand does from here can change that.
        touchedRef.current = new Set(span.touched);
        knownPathRef.current = new Set(span.path);
        trailWorldRef.current = [[head.lon, head.lat]];
        trailScreenRef.current = [];
        trailZoomRef.current = null;
        headingRef.current = null;
        guideTargetRef.current = [head.lon, head.lat];
        guideShownRef.current = [head.lon, head.lat];
        setSnapCandidate(null);
        setUnsureCount(countUnsure(span.path, span.touched));
        setHeldSpan(null);
        heldSpanRef.current = null;
        setDetours([]);

        mapInstance.dragging.disable();
        lastLayerPointRef.current = mapInstance.latLngToLayerPoint(L.latLng(head.lat, head.lon));
        redrawRef.current();
        return true;
    }, []);

    /**
     * Other ways between the same two stations, once the hand has stopped.
     *
     * Only ever *offered* — drawn grey, off to the side of what the user drew.
     * A drawing is a memory, and the app replacing it with something it
     * believes more would be the app overwriting the memory. So the search
     * answers beside the drawing rather than instead of it, and only a tap
     * takes one.
     */
    useEffect(() => {
        if (!heldSpan || !railData) return;
        if (heldSpan.start.id === heldSpan.finish.id) return;
        const from = railData.stations?.[heldSpan.start.id];
        const to = railData.stations?.[heldSpan.finish.id];
        if (!from || !to) return;

        let live = true;
        const timer = setTimeout(async () => {
            const result = await findCandidateRoutesAsync([from, to], railData).catch(() => null);
            // The drawing may have moved on while the search ran; a late
            // answer to an old question is worse than none.
            if (!live || !result) return;
            const drawn = heldSpan.path.join('\u0000');
            const seen = new Set<string>([drawn]);
            const others: CandidateRoute[] = [];
            for (const candidate of result.legs[0]?.candidates ?? []) {
                const key = candidate.stationIds.join('\u0000');
                if (candidate.stationIds.length < 2 || seen.has(key)) continue;
                seen.add(key);
                others.push(candidate);
                if (others.length >= MAX_DETOURS) break;
            }
            setDetours(others);
        }, DETOUR_IDLE_MS);

        return () => { live = false; clearTimeout(timer); };
    }, [heldSpan, railData]);

    /**
     * Put a route that was *found* rather than drawn onto the map, editable.
     *
     * Finding two stations and getting the answer recorded on the spot leaves
     * nothing to correct — and the middle of that answer is a guess the user
     * never made. So it lands like a drawing instead: handles on both ends,
     * grey alternatives beside it, and nothing kept until a tap on empty map
     * says so.
     *
     * Only the two ends count as remembered. The rest is the search's, so it
     * goes on dashed, the same as any stretch a hand skipped.
     */
    const holdFoundRoute = useCallback((route: FoundRoute): boolean => {
        const index = snapIndexRef.current;
        if (!index) return false;
        const path = route.path;
        if (path.length < 2) return false;
        if (!index.byId.has(path[0]) || !index.byId.has(path[path.length - 1])) return false;

        const trail: DragTrail = {
            waypoints: [path[0], path[path.length - 1]],
            segments: [{
                path: [...path],
                sectionIds: [...route.sectionIds],
                geometries: route.geometries.map(g => [...g]),
                distance: route.distance
            }],
            drawn: route.geometries.map(g => [...g]),
            usedSections: new Set(route.sectionIds)
        };
        const span = holdFrom(trail, touchedForFoundRoute(path), route.name);
        if (!span) return false;
        setHeldSpan(span);
        heldSpanRef.current = span;
        setDetours([]);
        return true;
    }, [holdFrom]);

    /** Take one of the offered ways instead of what was drawn. */
    const adoptDetour = useCallback((candidate: CandidateRoute) => {
        holdFoundRoute({
            path: candidate.stationIds,
            sectionIds: candidate.sectionIds,
            geometries: candidate.geometries,
            distance: candidate.distance,
            // The ends do not move, so whatever named it still names it.
            name: heldSpanRef.current?.name
        });
    }, [holdFoundRoute]);

    /** Which offered way a tap landed on, if any. */
    const detourAt = useCallback((containerPoint: L.Point): CandidateRoute | null => {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return null;
        const at = { x: containerPoint.x, y: containerPoint.y };
        let best: CandidateRoute | null = null;
        let bestDistance = DETOUR_TAP_PX;
        for (const candidate of detoursRef.current) {
            for (const line of candidate.geometries) {
                for (let i = 1; i < line.length; i += 1) {
                    const a = mapInstance.latLngToContainerPoint(L.latLng(line[i - 1][1], line[i - 1][0]));
                    const b = mapInstance.latLngToContainerPoint(L.latLng(line[i][1], line[i][0]));
                    const d = distanceToSegment(at, { x: a.x, y: a.y }, { x: b.x, y: b.y });
                    if (d < bestDistance) { bestDistance = d; best = candidate; }
                }
            }
        }
        return best;
    }, []);

    const detourAtRef = useRef(detourAt);
    useEffect(() => { detourAtRef.current = detourAt; }, [detourAt]);
    const adoptDetourRef = useRef(adoptDetour);
    useEffect(() => { adoptDetourRef.current = adoptDetour; }, [adoptDetour]);

    const gripAtRef = useRef(gripAt);
    useEffect(() => { gripAtRef.current = gripAt; }, [gripAt]);
    const resumeFromGripRef = useRef(resumeFromGrip);
    useEffect(() => { resumeFromGripRef.current = resumeFromGrip; }, [resumeFromGrip]);
    const commitHeldRef = useRef(commitHeld);
    useEffect(() => { commitHeldRef.current = commitHeld; }, [commitHeld]);

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

        const container = map.getContainer();
        const pointAt = (clientX: number, clientY: number) => {
            const rect = container.getBoundingClientRect();
            return L.point(clientX - rect.left, clientY - rect.top);
        };

        /**
         * Fingers currently on the glass, and the one the drawing is following.
         *
         * Capturing that one on the *container* is what keeps a long drawing
         * alive. Without it the browser sends every later event to whatever
         * element the finger first landed on — often a rail line drawn as SVG —
         * and when the map pans far enough for that layer to be redrawn, the
         * element is gone and the events go nowhere. The drawing then freezes
         * mid-stroke and can never be finished, which is exactly what drawing
         * to the edge of the screen makes happen.
         */
        const down = new Set<number>();
        let captured: number | null = null;
        /** Where a press started, so a press that never travelled reads as a tap. */
        let pressedAt: { x: number; y: number; at: number } | null = null;
        const release = () => {
            if (captured === null) return;
            try { container.releasePointerCapture(captured); } catch { /* already gone */ }
            captured = null;
        };

        /**
         * Hold a station to start drawing.
         *
         * On a phone the drag gesture cannot begin on contact, because that is
         * how the map pans. So contact only *arms* it: if the finger stays
         * within a few pixels for `LONG_PRESS_MS`, the same drag a mouse starts
         * on mousedown takes over, and everything below this — the trail, the
         * snapping, the edge panning — is already shared.
         *
         * Nothing is preventDefault-ed while waiting. A hold that turns into a
         * pan has to stay a pan.
         */
        const onPointerDown = (e: PointerEvent) => {
            const kind = normalisePointerType(e.pointerType);
            pointerKindRef.current = kind;
            pressedAt = { x: e.clientX, y: e.clientY, at: Date.now() };

            // A handle on a finished drawing is grabbed the same way whatever
            // is doing the grabbing, and with no hold: it is a thing put there
            // to be pulled, so pulling it cannot be mistaken for a pan.
            if (!dragStartStationRef.current) {
                const grip = gripAtRef.current(pointAt(e.clientX, e.clientY));
                if (grip) {
                    if (kind !== 'mouse') {
                        down.add(e.pointerId);
                        try { container.setPointerCapture(e.pointerId); captured = e.pointerId; } catch { /* gone */ }
                        haptic('select');
                    }
                    resumeFromGripRef.current(grip);
                    return;
                }
            }

            if (kind === 'mouse') return;

            lastTouchAtRef.current = Date.now();
            down.add(e.pointerId);
            if (dragStartStationRef.current) return;
            // A second finger means a pinch, which is a zoom, not a draw.
            if (down.size !== 1) { cancelPressRef.current(); return; }

            const station = stationAtPointRef.current(pointAt(e.clientX, e.clientY));
            if (!station) return;

            pressOriginRef.current = { x: e.clientX, y: e.clientY };
            setPressCandidate(station);

            const pointerId = e.pointerId;
            pressTimerRef.current = setTimeout(() => {
                pressTimerRef.current = null;
                pressOriginRef.current = null;
                setPressCandidate(null);
                if (!down.has(pointerId)) return;
                try { container.setPointerCapture(pointerId); captured = pointerId; } catch { /* gone */ }
                // The buzz is the confirmation that the hold took, so it fires
                // with the state change rather than after the first movement.
                haptic('select');
                startDragRef.current(station.id, [station.lat, station.lon]);
            }, LONG_PRESS_MS);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (pressedAt && Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > TAP_SLOP_PX) {
                pressedAt = null;
            }
            if (normalisePointerType(e.pointerType) === 'mouse') return;
            lastTouchAtRef.current = Date.now();

            const origin = pressOriginRef.current;
            if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > LONG_PRESS_CANCEL_PX) {
                cancelPressRef.current();
            }
            if (!dragStartStationRef.current) return;

            const point = pointAt(e.clientX, e.clientY);
            const latlng = map.containerPointToLatLng(point);
            handleMove(point, map.latLngToLayerPoint(latlng), latlng);
        };

        const onPointerEnd = (e: PointerEvent) => {
            const kind = normalisePointerType(e.pointerType);
            const pressed = pressedAt;
            pressedAt = null;
            // A press that ended a drawing is not a tap, however still it was.
            const wasDrawing = !!dragStartStationRef.current;

            if (kind !== 'mouse') {
                lastTouchAtRef.current = Date.now();
                down.delete(e.pointerId);
                if (e.pointerId === captured) release();
                cancelPressRef.current();
                handleEndRef.current();
            }

            // Tapping a part of the map with nothing on it means "that's it",
            // and puts the finished drawing away. Pointer events run ahead of
            // the compatibility mouse events, so a mouse drawing is still in
            // progress here and cannot be put away by its own release.
            if (wasDrawing || !pressed || !heldSpanRef.current) return;
            if (Date.now() - pressed.at > TAP_MAX_MS) return;
            const point = pointAt(e.clientX, e.clientY);
            if (gripAtRef.current(point)) return;
            // A grey line answers before the map does: tapping one takes that
            // way instead, and only a tap on nothing at all puts the drawing
            // away.
            const detour = detourAtRef.current(point);
            if (detour) { adoptDetourRef.current(detour); return; }
            if (stationAtPointRef.current(point)) return;
            commitHeldRef.current();
        };

        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        container.addEventListener('pointerdown', onPointerDown, { capture: true });
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerEnd);
        container.addEventListener('pointercancel', onPointerEnd);
        // A drag that ends outside the map must still settle.
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            release();
            container.removeEventListener('pointerdown', onPointerDown, { capture: true });
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerEnd);
            container.removeEventListener('pointercancel', onPointerEnd);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [map]);

    return {
        dragStartStation,
        dragStartCoords,
        /** Track the cursor went over. */
        dragPath,
        /** Track the app filled in; the caller draws it dashed. */
        dragPathUnsure,
        /** The tether from the head of the drawing to the cursor. */
        dragGuide,
        /** Stations on the drawing the cursor never passed. */
        unsureCount,
        /** A finished drawing still on the map, with a handle at each end. */
        heldSpan,
        /** Other ways between the same two stations, drawn grey beside it. */
        detours,
        /** Puts an already-found route on the map as an editable drawing. */
        holdFoundRoute,
        /** What the last tap put away, while it can still be taken back. */
        lastRecorded,
        undoLastRecorded,
        dismissLastRecorded,
        handleStationMouseDown,
        handleStationMouseUp: handleEnd,
        /** Station the drawing is currently pulling towards, for the snap hint. */
        snapCandidate,
        /** Station being held, while the hold is still filling. */
        pressCandidate
    };
};

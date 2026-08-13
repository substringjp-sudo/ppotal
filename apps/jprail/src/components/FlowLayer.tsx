"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { RailData, Section } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { shapeGeometry, MapShapeMode } from '../lib/lineShapes';

interface FlowLayerProps {
    /** Sections already windowed to the viewport by the caller. */
    sections: Section[] | null;
    railData: RailData | null;
    usedSectionIds: Set<number>;
    shapeMode: MapShapeMode;
    enabled: boolean;
}

/** Light travels this many screen pixels a second. */
const SPEED_PX_PER_SECOND = 58;
/** Length of one pulse, and the gap before the next, in screen pixels. */
const PULSE = 16;
const GAP = 190;
/**
 * Above the rails, below the stations — the light runs along the track and
 * passes behind the station markers.
 */
const PANE = 'rail-flow';
const PANE_Z = 830;
/** Enough room for the widest stroke plus its soft edge. */
const PAD = 10;
/**
 * The canvas is committed to the compositor on every frame it changes, and
 * that cost is proportional to its area — so it is deliberately kept at one
 * device pixel per CSS pixel. The pulse is a soft glow; nobody can tell.
 */
const BACKING_SCALE = 1;
/**
 * Past this many points the effect stops being worth its cost, so it thins
 * itself out rather than dropping frames for someone with a lot of trips.
 */
const POINT_BUDGET = 12000;

interface FlowPath {
    points: L.Point[];
    /** Distance along the path at each point, in screen pixels. */
    cumulative: Float64Array;
    length: number;
    color: string;
}

interface Box { x: number; y: number; w: number; h: number; }

/** Index of the last point at or before distance d along the path. */
function segmentAt(path: FlowPath, d: number): number {
    const c = path.cumulative;
    let lo = 0, hi = c.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (c[mid] <= d) lo = mid; else hi = mid - 1;
    }
    return Math.min(lo, path.points.length - 2);
}

/** The point exactly d pixels along the path. */
function pointAt(path: FlowPath, d: number, index: number): { x: number; y: number } {
    const a = path.points[index];
    const b = path.points[index + 1];
    const span = path.cumulative[index + 1] - path.cumulative[index];
    const t = span > 0 ? (d - path.cumulative[index]) / span : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Draws a pulse of light running along every line the user has ridden.
 *
 * It owns its own canvas rather than going through Leaflet's renderer: an
 * animated pulse is not something L.Canvas can express, and a separate surface
 * means the animation can never invalidate the rail layers underneath it.
 *
 * Two things keep it cheap. Only the lit stretches are drawn, located by binary
 * search on cached arc length, so a frame costs microseconds of JavaScript no
 * matter how long the routes are. And the canvas is sized to the routes' own
 * footprint rather than the viewport — because what an animated canvas really
 * costs is the compositor re-committing its full area sixty times a second,
 * which measured 746ms per four seconds when it covered the whole screen.
 */
const FlowLayer: React.FC<FlowLayerProps> = ({ sections, railData, usedSectionIds, shapeMode, enabled }) => {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pathsRef = useRef<FlowPath[]>([]);
    const frameRef = useRef<number | null>(null);
    /** Where the canvas sits, in layer coordinates. */
    const boxRef = useRef<Box | null>(null);
    const [hasPaths, setHasPaths] = useState(false);

    // Create the canvas once.
    useEffect(() => {
        if (!map.getPane(PANE)) {
            const created = map.createPane(PANE);
            created.style.zIndex = String(PANE_Z);
            created.style.pointerEvents = 'none';
        }
        const pane = map.getPane(PANE)!;

        const canvas = L.DomUtil.create('canvas') as HTMLCanvasElement;
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 220ms ease-out';
        pane.appendChild(canvas);
        canvasRef.current = canvas;

        return () => {
            canvas.remove();
            canvasRef.current = null;
        };
    }, [map]);

    // Project the ridden track. Layer coordinates survive panning, so this only
    // has to happen when the zoom or the set of ridden sections changes.
    useEffect(() => {
        const rebuild = () => {
            if (!enabled || !sections || !railData || usedSectionIds.size === 0) {
                pathsRef.current = [];
                setHasPaths(false);
                return;
            }

            const paths: FlowPath[] = [];
            let budget = POINT_BUDGET;

            for (const section of sections) {
                if (!usedSectionIds.has(section.id)) continue;
                const geometry = shapeGeometry(section.geometry, shapeMode);
                if (!geometry || geometry.length < 2 || budget <= 0) continue;

                const points: L.Point[] = [];
                const stride = budget < geometry.length ? Math.ceil(geometry.length / Math.max(2, budget)) : 1;
                for (let i = 0; i < geometry.length; i += stride) {
                    points.push(map.latLngToLayerPoint([geometry[i][1], geometry[i][0]]));
                }
                const last = geometry[geometry.length - 1];
                points.push(map.latLngToLayerPoint([last[1], last[0]]));
                budget -= points.length;
                if (points.length < 2) continue;

                const cumulative = new Float64Array(points.length);
                for (let i = 1; i < points.length; i++) {
                    cumulative[i] = cumulative[i - 1] + Math.hypot(
                        points[i].x - points[i - 1].x,
                        points[i].y - points[i - 1].y
                    );
                }

                paths.push({
                    points,
                    cumulative,
                    length: cumulative[cumulative.length - 1],
                    color: getLineColor(`${section.company_id}::${section.line_id}`, railData) || '#7dd3fc'
                });
            }

            pathsRef.current = paths;
            setHasPaths(paths.length > 0);
        };

        rebuild();
        map.on('zoomend', rebuild);
        return () => { map.off('zoomend', rebuild); };
    }, [map, sections, railData, usedSectionIds, shapeMode, enabled]);

    // Keep the canvas over the part of the routes that is actually on screen.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const fit = () => {
            const paths = pathsRef.current;
            if (!enabled || paths.length === 0) {
                boxRef.current = null;
                canvas.style.opacity = '0';
                return;
            }

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const path of paths) {
                for (const p of path.points) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
            }

            // Clip to the viewport: there is no point committing pixels for
            // stretches of route that are scrolled off the screen.
            const origin = map.containerPointToLayerPoint([0, 0]);
            const size = map.getSize();
            const x = Math.max(minX - PAD, origin.x);
            const y = Math.max(minY - PAD, origin.y);
            const w = Math.min(maxX + PAD, origin.x + size.x) - x;
            const h = Math.min(maxY + PAD, origin.y + size.y) - y;

            if (w <= 0 || h <= 0) {
                boxRef.current = null;
                canvas.style.opacity = '0';
                return;
            }

            const box: Box = { x, y, w: Math.ceil(w), h: Math.ceil(h) };
            boxRef.current = box;

            const backingWidth = Math.ceil(box.w * BACKING_SCALE);
            const backingHeight = Math.ceil(box.h * BACKING_SCALE);
            // Assigning width/height clears the canvas, so only do it on change.
            if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
                canvas.width = backingWidth;
                canvas.height = backingHeight;
                canvas.style.width = `${box.w}px`;
                canvas.style.height = `${box.h}px`;
                const context = canvas.getContext('2d');
                if (context) context.setTransform(BACKING_SCALE, 0, 0, BACKING_SCALE, 0, 0);
            }
            L.DomUtil.setPosition(canvas, new L.Point(box.x, box.y));
            canvas.style.opacity = '1';
        };

        // Mid-zoom the projection reports the destination rather than the frame
        // being shown, so anything drawn now would sit visibly off the rails.
        const hide = () => { canvas.style.opacity = '0'; };

        fit();
        map.on('move', fit);
        map.on('resize', fit);
        map.on('zoomend', fit);
        map.on('zoomstart', hide);
        return () => {
            map.off('move', fit);
            map.off('resize', fit);
            map.off('zoomend', fit);
            map.off('zoomstart', hide);
        };
    }, [map, enabled, hasPaths, shapeMode]);

    // The animation: each frame draws only the lit pulses.
    useEffect(() => {
        if (!enabled || !hasPaths) return;

        const start = performance.now();

        const draw = (now: number) => {
            frameRef.current = requestAnimationFrame(draw);

            const canvas = canvasRef.current;
            const box = boxRef.current;
            if (!canvas || !box) return;
            const context = canvas.getContext('2d');
            if (!context) return;

            context.clearRect(0, 0, box.w, box.h);

            const paths = pathsRef.current;
            if (paths.length === 0) return;

            const travelled = ((now - start) / 1000) * SPEED_PX_PER_SECOND;
            const period = PULSE + GAP;

            context.save();
            context.lineCap = 'round';
            context.lineJoin = 'round';

            for (const path of paths) {
                if (path.length <= 0) continue;

                for (let head = travelled % period; head - PULSE < path.length; head += period) {
                    const from = Math.max(0, head - PULSE);
                    const to = Math.min(path.length, head);
                    if (to <= from) continue;

                    const firstIndex = segmentAt(path, from);
                    const lastIndex = segmentAt(path, to);
                    const a = pointAt(path, from, firstIndex);

                    context.beginPath();
                    context.moveTo(a.x - box.x, a.y - box.y);
                    for (let i = firstIndex + 1; i <= lastIndex; i++) {
                        context.lineTo(path.points[i].x - box.x, path.points[i].y - box.y);
                    }
                    const b = pointAt(path, to, lastIndex);
                    context.lineTo(b.x - box.x, b.y - box.y);

                    // A wide soft pass for the halo, then a bright core on top.
                    context.globalAlpha = 0.35;
                    context.strokeStyle = path.color;
                    context.lineWidth = 11;
                    context.stroke();

                    context.globalAlpha = 0.95;
                    context.strokeStyle = '#ffffff';
                    context.lineWidth = 3;
                    context.stroke();
                }
            }

            context.restore();
        };

        frameRef.current = requestAnimationFrame(draw);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            const canvas = canvasRef.current;
            const box = boxRef.current;
            const context = canvas?.getContext('2d');
            if (context && box) context.clearRect(0, 0, box.w, box.h);
        };
    }, [map, enabled, hasPaths]);

    return null;
};

export default React.memo(FlowLayer);

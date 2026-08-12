"use client";

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { RailData, Station } from '../types/railData';
import { CandidateRoute } from '../lib/routeSearch';
import { useI18n } from '../lib/i18n-context';
import { getLocalizedName } from '../lib/i18n-utils';

/** Room kept clear around the route so station labels are not clipped. */
const PADDING_X = 56;
const PADDING_Y = 40;

export interface RouteMiniMapWaypoint {
    station: Station;
    role: 'start' | 'via' | 'end';
    label?: string;
}

interface RouteMiniMapProps {
    railData: RailData | null;
    /** Legs already decided — drawn in colour, always visible. */
    settled?: CandidateRoute[];
    /** Options for the leg being edited — drawn muted until hovered or selected. */
    alternatives?: CandidateRoute[];
    /** The option currently highlighted (hover wins over selection). */
    activeId?: string | null;
    waypoints: RouteMiniMapWaypoint[];
    onHoverCandidate?: (id: string | null) => void;
    onSelectCandidate?: (id: string) => void;
    emptyMessage?: string;
    /** Height of anything overlapping the bottom of the panel, kept clear of the route. */
    bottomInset?: number;
}

type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

// Web Mercator. Both axes must be in radians for the aspect ratio to be right.
const mercatorX = (lon: number) => (lon * Math.PI) / 180;
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/* ------------------------------------------------------------------ *
 * Prefecture outlines — fetched once, shared by every mini map
 * ------------------------------------------------------------------ */

type Ring = { points: [number, number][]; bounds: Bounds };
let coastlinePromise: Promise<Ring[]> | null = null;

function ringBounds(points: [number, number][]): Bounds {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    points.forEach(([lon, lat]) => {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    return { minLon, maxLon, minLat, maxLat };
}

function loadCoastline(): Promise<Ring[]> {
    if (!coastlinePromise) {
        // The mid-resolution outline: the low one is too coarse once the view
        // narrows to a single metro area, where a bay's shape is the landmark.
        coastlinePromise = fetch('/data/adm1_mid.geojson')
            .then(res => res.json())
            .then((geo: { features?: { geometry?: { type: string; coordinates: unknown } }[] }) => {
                const rings: Ring[] = [];
                const addRing = (points: [number, number][]) => {
                    if (points.length > 2) rings.push({ points, bounds: ringBounds(points) });
                };

                geo.features?.forEach(feature => {
                    const geometry = feature.geometry;
                    if (!geometry) return;
                    if (geometry.type === 'Polygon') {
                        (geometry.coordinates as [number, number][][]).forEach(addRing);
                    } else if (geometry.type === 'MultiPolygon') {
                        (geometry.coordinates as [number, number][][][]).forEach(polygon =>
                            polygon.forEach(addRing)
                        );
                    }
                });
                return rings;
            })
            .catch(() => []);
    }
    return coastlinePromise;
}

function useCoastline() {
    const [rings, setRings] = useState<Ring[]>([]);
    useEffect(() => {
        let alive = true;
        loadCoastline().then(loaded => {
            if (alive) setRings(loaded);
        });
        return () => {
            alive = false;
        };
    }, []);
    return rings;
}

const intersects = (a: Bounds, b: Bounds) =>
    a.minLon <= b.maxLon && a.maxLon >= b.minLon && a.minLat <= b.maxLat && a.maxLat >= b.minLat;

/* ------------------------------------------------------------------ */

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({
    railData,
    settled = [],
    alternatives = [],
    activeId = null,
    waypoints,
    onHoverCandidate,
    onSelectCandidate,
    emptyMessage,
    bottomInset = 0
}) => {
    const { language } = useI18n();
    const coastline = useCoastline();

    // The drawing is laid out in real pixels so it always fills the panel,
    // whatever shape the route (and the window) happens to be.
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 640, height: 480 });

    useEffect(() => {
        const element = containerRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width < 1 || rect.height < 1) return;
            setSize(current =>
                Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1
                    ? current
                    : { width: Math.round(rect.width), height: Math.round(rect.height) }
            );
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const drawn = useMemo(() => [...settled, ...alternatives], [settled, alternatives]);

    /** Geographic extent of everything we intend to draw. */
    const bounds = useMemo<Bounds | null>(() => {
        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        let seen = false;

        const include = (lon: number, lat: number) => {
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
            seen = true;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        };

        drawn.forEach(route =>
            route.geometries.forEach(geometry => geometry.forEach(([lon, lat]) => include(lon, lat)))
        );
        waypoints.forEach(wp => include(wp.station.lon, wp.station.lat));

        if (!seen) return null;

        // Guarantee a sane extent for very short routes.
        const minSpan = 0.02;
        if (maxLon - minLon < minSpan) {
            const mid = (maxLon + minLon) / 2;
            minLon = mid - minSpan / 2;
            maxLon = mid + minSpan / 2;
        }
        if (maxLat - minLat < minSpan) {
            const mid = (maxLat + minLat) / 2;
            minLat = mid - minSpan / 2;
            maxLat = mid + minSpan / 2;
        }

        return { minLon, maxLon, minLat, maxLat };
    }, [drawn, waypoints]);

    const project = useMemo(() => {
        if (!bounds) return null;

        const x0 = mercatorX(bounds.minLon);
        const x1 = mercatorX(bounds.maxLon);
        const y0 = mercatorY(bounds.minLat);
        const y1 = mercatorY(bounds.maxLat);

        const usableWidth = Math.max(size.width - PADDING_X * 2, 40);
        const usableHeight = Math.max(size.height - PADDING_Y * 2 - bottomInset, 40);
        const scale = Math.min(usableWidth / (x1 - x0), usableHeight / (y1 - y0));
        const centreX = (x0 + x1) / 2;
        const centreY = (y0 + y1) / 2;
        // Centre within the area left over once the overlay is accounted for.
        const originY = (size.height - bottomInset) / 2;

        return (lon: number, lat: number): [number, number] => [
            (mercatorX(lon) - centreX) * scale + size.width / 2,
            -(mercatorY(lat) - centreY) * scale + originY
        ];
    }, [bounds, size, bottomInset]);

    /** Geographic extent actually visible in the panel — used to cull background layers. */
    const viewBounds = useMemo<Bounds | null>(() => {
        if (!bounds || !project) return null;

        const spanLon = bounds.maxLon - bounds.minLon;
        const spanLat = bounds.maxLat - bounds.minLat;
        const [x0] = project(bounds.minLon, bounds.minLat);
        const [x1] = project(bounds.maxLon, bounds.minLat);
        const drawnWidth = Math.abs(x1 - x0) || 1;
        const lonPerPixel = spanLon / drawnWidth;

        const [, yTop] = project(bounds.minLon, bounds.maxLat);
        const [, yBottom] = project(bounds.minLon, bounds.minLat);
        const drawnHeight = Math.abs(yBottom - yTop) || 1;
        const latPerPixel = spanLat / drawnHeight;

        const marginLon = ((size.width - drawnWidth) / 2 + 20) * lonPerPixel;
        const marginLat = ((size.height - drawnHeight) / 2 + 20) * latPerPixel;

        return {
            minLon: bounds.minLon - marginLon,
            maxLon: bounds.maxLon + marginLon,
            minLat: bounds.minLat - marginLat,
            maxLat: bounds.maxLat + marginLat
        };
    }, [bounds, project, size]);

    const toPath = useMemo(() => {
        if (!project) return null;
        return (points: [number, number][]) => {
            let d = '';
            points.forEach(([lon, lat], index) => {
                const [x, y] = project(lon, lat);
                d += `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
            });
            return d;
        };
    }, [project]);

    /**
     * Surrounding rail network, so the route reads as part of a real map.
     * Every section goes into one path element — a wide view can cover several
     * thousand of them and that many DOM nodes makes the panel crawl.
     */
    const contextPath = useMemo(() => {
        if (!railData || !viewBounds || !toPath) return '';
        const sections = railData.sections?.lod?.low || railData.sections?.sections || [];
        let d = '';

        for (const section of sections) {
            const geometry = section.geometry;
            if (!geometry || geometry.length < 2) continue;
            if (!intersects(ringBounds(geometry), viewBounds)) continue;
            d += toPath(geometry);
        }
        return d;
    }, [railData, viewBounds, toPath]);

    const coastPath = useMemo(() => {
        if (!viewBounds || !toPath) return '';
        return coastline
            .filter(ring => intersects(ring.bounds, viewBounds))
            .map(ring => `${toPath(ring.points)}Z`)
            .join('');
    }, [coastline, viewBounds, toPath]);

    const activeRoute = drawn.find(route => route.id === activeId) || null;
    const isComparing = alternatives.length > 0;

    return (
        <div ref={containerRef} className="w-full h-full">
            {!project || !toPath || !bounds ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-3xl opacity-60">map</span>
                    <p className="text-[11px] font-semibold text-center px-6 leading-relaxed max-w-xs">
                        {emptyMessage}
                    </p>
                </div>
            ) : (
                <svg viewBox={`0 0 ${size.width} ${size.height}`} className="w-full h-full" role="img">
                    {/* Land and prefecture borders */}
                    {coastPath && (
                        <path
                            d={coastPath}
                            className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700"
                            strokeWidth={1}
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Every other rail line in view */}
                    {contextPath && (
                        <path
                            d={contextPath}
                            fill="none"
                            className="stroke-slate-400/70 dark:stroke-slate-600/70"
                            strokeWidth={1.1}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                {/* Candidate routes that are not currently highlighted */}
                {drawn.map(route => {
                    if (route.id === activeId) return null;
                    const isSettled = settled.some(s => s.id === route.id);
                    return (
                        <g
                            key={`dim-${route.id}`}
                            onMouseEnter={() => onHoverCandidate?.(route.id)}
                            onMouseLeave={() => onHoverCandidate?.(null)}
                            onClick={() => onSelectCandidate?.(route.id)}
                            style={{ cursor: onSelectCandidate ? 'pointer' : 'default' }}
                        >
                            {route.geometries.map((geometry, index) => (
                                <path
                                    key={index}
                                    d={toPath(geometry)}
                                    fill="none"
                                    className="stroke-slate-500 dark:stroke-slate-300"
                                    strokeWidth={isSettled || !isComparing ? 5 : 4}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity={isSettled ? 0.6 : 0.42}
                                />
                            ))}
                        </g>
                    );
                })}

                {/* The highlighted route, coloured by the line each part runs on */}
                {activeRoute && (
                    <g className="pointer-events-none">
                        {activeRoute.segments.map((segment, segmentIndex) =>
                            segment.geometries.map((geometry, index) => (
                                <path
                                    key={`halo-${segmentIndex}-${index}`}
                                    d={toPath(geometry)}
                                    fill="none"
                                    className="stroke-white dark:stroke-slate-900"
                                    strokeWidth={9}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))
                        )}
                        {activeRoute.segments.map((segment, segmentIndex) =>
                            segment.geometries.map((geometry, index) => (
                                <path
                                    key={`line-${segmentIndex}-${index}`}
                                    d={toPath(geometry)}
                                    fill="none"
                                    stroke={segment.line?.color || '#1c74e9'}
                                    strokeWidth={5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))
                        )}
                    </g>
                )}

                {/* Transfer points along the highlighted route */}
                {activeRoute && (
                    <g className="pointer-events-none">
                        {activeRoute.transferStationIds.map(id => {
                            const station = railData?.stations?.[id];
                            if (!station) return null;
                            const [x, y] = project(station.lon, station.lat);
                            return (
                                <g key={`transfer-${id}`}>
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={5.5}
                                        className="fill-white dark:fill-slate-900 stroke-slate-500 dark:stroke-slate-300"
                                        strokeWidth={2.5}
                                    />
                                    <text
                                        x={x}
                                        y={y - 10}
                                        textAnchor="middle"
                                        className="fill-slate-600 dark:fill-slate-300 stroke-white dark:stroke-slate-900"
                                        style={{ fontSize: 12, fontWeight: 700, paintOrder: 'stroke' }}
                                        strokeWidth={3.5}
                                        strokeOpacity={0.75}
                                        strokeLinejoin="round"
                                    >
                                        {getLocalizedName(station, language)}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                )}

                {/* Start / via / end markers */}
                <g className="pointer-events-none">
                    {waypoints.map((waypoint, index) => {
                        const [x, y] = project(waypoint.station.lon, waypoint.station.lat);
                        const colour =
                            waypoint.role === 'start' ? '#10b981' : waypoint.role === 'end' ? '#f43f5e' : '#f59e0b';
                        return (
                            <g key={`wp-${waypoint.station.id}-${index}`}>
                                <circle cx={x} cy={y} r={9} fill={colour} opacity={0.22} />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={5.5}
                                    fill={colour}
                                    className="stroke-white dark:stroke-slate-900"
                                    strokeWidth={2.5}
                                />
                                <text
                                    x={x}
                                    y={y + 20}
                                    textAnchor="middle"
                                    className="fill-slate-800 dark:fill-slate-100 stroke-white dark:stroke-slate-900"
                                    style={{ fontSize: 14, fontWeight: 800, paintOrder: 'stroke' }}
                                    strokeWidth={4}
                                    strokeOpacity={0.8}
                                    strokeLinejoin="round"
                                >
                                    {waypoint.label || getLocalizedName(waypoint.station, language)}
                                </text>
                            </g>
                        );
                    })}
                    </g>
                </svg>
            )}
        </div>
    );
};

export default RouteMiniMap;

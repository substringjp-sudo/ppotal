"use client";

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import { LandForm, MapTheme } from '../lib/mapThemes';
import { RailData, Section } from '../types/railData';
import { getLineColor } from '../lib/lineColors';
import { shapeGeometry, MapShapeMode } from '../lib/lineShapes';

interface LandTileLayerProps {
    prefectures: FeatureCollection | null;
    form: LandForm;
    theme: MapTheme;
    /** Changes whenever the rails underneath would look different. */
    railRevision: string;
    /** Sections already windowed to the viewport by the caller. */
    sections: Section[] | null;
    railData: RailData | null;
    usedSectionIds: Set<number>;
    shapeMode: MapShapeMode;
}

const PANE = 'land-tiles';
/** Above the ground, below the stations: in this mode it *is* the map. */
const PANE_Z = 700;
/**
 * Cell size in *projected* pixels at the lattice's own zoom level, which is the
 * current zoom rounded. Because the grid is defined against the ground rather
 * than the screen, zooming in makes the tiles grow with everything else, and
 * they subdivide at each whole zoom level instead of sliding under the map.
 */
const SPACING = 13;
/** Whole zoom levels a lattice generation survives before it subdivides. */
const LATTICE_BAND = 2;
/** The mask is only ever read a cell at a time, so it can be coarse. */
const MASK_SCALE = 0.5;
/** Panes whose content is re-rendered as tiles instead of drawn directly. */
export const TILED_PANES = ['railroad-glow', 'railroad-casing', 'railroad-lines'];

/**
 * Draws the map as a field of tiles — land and rails both.
 *
 * Tiling only the land was the wrong half of the idea: the country turned to
 * pixels while the lines stayed smooth on top of it, and the two never looked
 * like the same picture. So the rails go through the same lattice. Rather than
 * re-projecting them, this samples the canvas Leaflet has already drawn them
 * into, which means tiles inherit every line's real colour and weight for free
 * and stay correct whatever line shape or theme is selected.
 *
 * Sampling is by cell, not by point: a rail line is a couple of pixels wide and
 * a lattice point would miss it far more often than not, leaving the network as
 * disconnected specks. Each cell takes the strongest rail pixel within it, and
 * falls back to land.
 */
const LandTileLayer: React.FC<LandTileLayerProps> = ({ prefectures, form, theme, railRevision, sections, railData, usedSectionIds, shapeMode }) => {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const landMaskRef = useRef<HTMLCanvasElement | null>(null);
    const railMaskRef = useRef<HTMLCanvasElement | null>(null);
    const riddenMaskRef = useRef<HTMLCanvasElement | null>(null);
    const pendingRef = useRef<number | null>(null);

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
        pane.appendChild(canvas);
        canvasRef.current = canvas;
        landMaskRef.current = document.createElement('canvas');
        railMaskRef.current = document.createElement('canvas');
        riddenMaskRef.current = document.createElement('canvas');

        return () => {
            canvas.remove();
            canvasRef.current = null;
            landMaskRef.current = null;
            railMaskRef.current = null;
            riddenMaskRef.current = null;
        };
    }, [map]);

    // While the lattice is on, the real rail layers are the source for the
    // tiles rather than something to look at, so they are hidden — but left
    // rendering, because that canvas is exactly what gets sampled.
    useEffect(() => {
        const active = form !== 'outline';
        TILED_PANES.forEach(name => {
            const pane = map.getPane(name);
            if (pane) pane.style.opacity = active ? '0' : '1';
        });
        return () => {
            TILED_PANES.forEach(name => {
                const pane = map.getPane(name);
                if (pane) pane.style.opacity = '1';
            });
        };
    }, [map, form]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const landMask = landMaskRef.current;
        const railMask = railMaskRef.current;
        const riddenMask = riddenMaskRef.current;
        if (!canvas || !landMask || !railMask || !riddenMask) return;

        if (!prefectures || form === 'outline') {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = '';

        const render = () => {
            const size = map.getSize();
            const origin = map.containerPointToLayerPoint([0, 0]);

            // The lattice is anchored to the ground, not to the screen.
            //
            // It is laid out in projected coordinates at the nearest whole zoom
            // level, so a cell always covers the same patch of Japan: zoom in
            // and the tiles grow along with everything under them, and at each
            // whole zoom the grid subdivides rather than the country sliding
            // beneath a fixed screen pattern. Screen positions come out of one
            // multiply because the two spaces differ only by a power of two.
            const zoom = map.getZoom();
            // Rounding to the nearest whole zoom looks anchored but is not:
            // it re-quantises at every level, so a tile is the same size on
            // screen at zoom 14 as at 17 and the grid appears painted on the
            // glass. Holding the grid for a band of two levels and flooring
            // into it lets a tile double as you zoom in before the grid
            // subdivides and it starts growing again.
            const latticeZoom = Math.floor(zoom / LATTICE_BAND) * LATTICE_BAND;
            const zoomScale = Math.pow(2, zoom - latticeZoom);
            const cellPixels = SPACING * zoomScale;
            const northWest = map.project(map.containerPointToLatLng([0, 0]), latticeZoom);
            // Where the first whole cell boundary falls, in screen pixels.
            const firstX = (Math.floor(northWest.x / SPACING) * SPACING - northWest.x) * zoomScale;
            const firstY = (Math.floor(northWest.y / SPACING) * SPACING - northWest.y) * zoomScale;

            if (canvas.width !== size.x || canvas.height !== size.y) {
                canvas.width = size.x;
                canvas.height = size.y;
                canvas.style.width = `${size.x}px`;
                canvas.style.height = `${size.y}px`;
            }
            L.DomUtil.setPosition(canvas, origin);

            const context = canvas.getContext('2d');
            if (!context) return;
            context.clearRect(0, 0, size.x, size.y);

            const maskWidth = Math.max(1, Math.ceil(size.x * MASK_SCALE));
            const maskHeight = Math.max(1, Math.ceil(size.y * MASK_SCALE));

            // --- Mask 1: the coastline, rasterised rather than point-tested.
            landMask.width = maskWidth;
            landMask.height = maskHeight;
            const landContext = landMask.getContext('2d', { willReadFrequently: true });
            if (!landContext) return;
            landContext.clearRect(0, 0, maskWidth, maskHeight);
            landContext.fillStyle = '#fff';

            const tracePolygon = (rings: number[][][]) => {
                landContext.beginPath();
                for (const ring of rings) {
                    for (let i = 0; i < ring.length; i++) {
                        const p = map.latLngToContainerPoint([ring[i][1], ring[i][0]]);
                        if (i === 0) landContext.moveTo(p.x * MASK_SCALE, p.y * MASK_SCALE);
                        else landContext.lineTo(p.x * MASK_SCALE, p.y * MASK_SCALE);
                    }
                    landContext.closePath();
                }
                landContext.fill('evenodd');
            };

            for (const feature of prefectures.features as Feature[]) {
                const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
                if (!geometry) continue;
                if (geometry.type === 'Polygon') tracePolygon(geometry.coordinates as number[][][]);
                else if (geometry.type === 'MultiPolygon') {
                    for (const polygon of geometry.coordinates as number[][][][]) tracePolygon(polygon);
                }
            }
            const landPixels = landContext.getImageData(0, 0, maskWidth, maskHeight).data;

            // --- Mask 2: whatever Leaflet has already drawn the rails into.
            railMask.width = maskWidth;
            railMask.height = maskHeight;
            const railContext = railMask.getContext('2d', { willReadFrequently: true });
            if (!railContext) return;
            railContext.clearRect(0, 0, maskWidth, maskHeight);

            for (const name of TILED_PANES) {
                const pane = map.getPane(name);
                const source = pane?.querySelector('canvas') as HTMLCanvasElement | null;
                if (!source || !source.width || !source.height) continue;
                // Each renderer positions its own canvas in layer space; bring
                // that back to where it sits on screen.
                const position = L.DomUtil.getPosition(source) || new L.Point(0, 0);
                const offsetX = (position.x - origin.x) * MASK_SCALE;
                const offsetY = (position.y - origin.y) * MASK_SCALE;
                const cssWidth = parseFloat(source.style.width) || source.width;
                const cssHeight = parseFloat(source.style.height) || source.height;
                railContext.drawImage(
                    source,
                    offsetX, offsetY,
                    cssWidth * MASK_SCALE, cssHeight * MASK_SCALE
                );
            }
            const railPixels = railContext.getImageData(0, 0, maskWidth, maskHeight).data;

            // --- Mask 3: the track this user has actually ridden.
            //
            // Sampling the rail panes alone does not answer "what colour is the
            // line running through this tile", because the map paints filtered
            // out lines a flat grey and the strongest pixel in a cell is often
            // one of those sitting on top of the route. Ridden track is drawn
            // here from its own geometry and consulted first, so a tile the
            // user has travelled through always carries that line's colour.
            riddenMask.width = maskWidth;
            riddenMask.height = maskHeight;
            const riddenContext = riddenMask.getContext('2d', { willReadFrequently: true });
            if (!riddenContext) return;
            riddenContext.clearRect(0, 0, maskWidth, maskHeight);
            riddenContext.lineCap = 'round';
            riddenContext.lineJoin = 'round';
            riddenContext.lineWidth = Math.max(1.5, cellPixels * MASK_SCALE * 0.55);

            if (sections && railData && usedSectionIds.size > 0) {
                for (const section of sections) {
                    if (!usedSectionIds.has(section.id)) continue;
                    const geometry = shapeGeometry(section.geometry, shapeMode);
                    if (!geometry || geometry.length < 2) continue;
                    riddenContext.strokeStyle =
                        getLineColor(`${section.company_id}::${section.line_id}`, railData) || '#7dd3fc';
                    riddenContext.beginPath();
                    for (let i = 0; i < geometry.length; i++) {
                        const p = map.latLngToContainerPoint([geometry[i][1], geometry[i][0]]);
                        if (i === 0) riddenContext.moveTo(p.x * MASK_SCALE, p.y * MASK_SCALE);
                        else riddenContext.lineTo(p.x * MASK_SCALE, p.y * MASK_SCALE);
                    }
                    riddenContext.stroke();
                }
            }
            const riddenPixels = riddenContext.getImageData(0, 0, maskWidth, maskHeight).data;

            // --- Stamp one tile per cell.
            const rowStep = form === 'hexes' ? cellPixels * 0.866 : cellPixels;
            const radius = cellPixels * 0.42;
            const half = Math.max(1, Math.round((cellPixels * MASK_SCALE) / 2));

            const stamp = (x: number, y: number) => {
                if (form === 'dots') {
                    context.beginPath();
                    context.arc(x, y, radius, 0, Math.PI * 2);
                    context.fill();
                } else if (form === 'squares') {
                    const side = cellPixels * 0.78;
                    context.fillRect(x - side / 2, y - side / 2, side, side);
                } else {
                    context.beginPath();
                    for (let corner = 0; corner < 6; corner++) {
                        const angle = (Math.PI / 3) * corner;
                        context.lineTo(x + radius * 1.15 * Math.cos(angle), y + radius * 1.15 * Math.sin(angle));
                    }
                    context.closePath();
                    context.fill();
                }
            };

            for (let row = 0, y = firstY; y < size.y + cellPixels; row++, y = firstY + row * rowStep) {
                const shift = form === 'hexes' && row % 2 === 1 ? cellPixels / 2 : 0;
                for (let x = firstX + shift; x < size.x + cellPixels; x += cellPixels) {
                    const cx = Math.round(x * MASK_SCALE);
                    const cy = Math.round(y * MASK_SCALE);

                    // Strongest pixel anywhere in this cell wins the tile, and
                    // ridden track is asked first so it can never be hidden by
                    // a grey filtered-out line drawn across it.
                    const strongest = (pixels: Uint8ClampedArray) => {
                        let alpha = 0, r = 0, g = 0, b = 0;
                        for (let sy = cy - half; sy <= cy + half; sy++) {
                            if (sy < 0 || sy >= maskHeight) continue;
                            for (let sx = cx - half; sx <= cx + half; sx++) {
                                if (sx < 0 || sx >= maskWidth) continue;
                                const i = (sy * maskWidth + sx) * 4;
                                if (pixels[i + 3] > alpha) {
                                    alpha = pixels[i + 3];
                                    r = pixels[i]; g = pixels[i + 1]; b = pixels[i + 2];
                                }
                            }
                        }
                        return { alpha, r, g, b };
                    };

                    const travelled = strongest(riddenPixels);
                    if (travelled.alpha > 40) {
                        context.fillStyle = `rgb(${travelled.r},${travelled.g},${travelled.b})`;
                        stamp(x, y);
                        continue;
                    }

                    const { alpha: bestAlpha, r: bestR, g: bestG, b: bestB } = strongest(railPixels);

                    if (bestAlpha > 70) {
                        context.fillStyle = `rgb(${bestR},${bestG},${bestB})`;
                        stamp(x, y);
                        continue;
                    }


                    const landIndex = (Math.min(maskHeight - 1, Math.max(0, cy)) * maskWidth
                        + Math.min(maskWidth - 1, Math.max(0, cx))) * 4 + 3;
                    if (landPixels[landIndex] > 96) {
                        context.fillStyle = theme.tileInk;
                        stamp(x, y);
                    }
                }
            }
        };

        // Give Leaflet's own renderers the frame they need to repaint before
        // sampling them, or the tiles show the previous view's rails.
        const schedule = () => {
            if (pendingRef.current !== null) cancelAnimationFrame(pendingRef.current);
            pendingRef.current = requestAnimationFrame(() => {
                pendingRef.current = requestAnimationFrame(() => {
                    pendingRef.current = null;
                    render();
                });
            });
        };

        schedule();
        map.on('moveend', schedule);
        map.on('zoomend', schedule);
        map.on('resize', schedule);
        return () => {
            if (pendingRef.current !== null) cancelAnimationFrame(pendingRef.current);
            pendingRef.current = null;
            map.off('moveend', schedule);
            map.off('zoomend', schedule);
            map.off('resize', schedule);
        };
    }, [map, prefectures, form, theme, railRevision]);

    return null;
};

export default React.memo(LandTileLayer);

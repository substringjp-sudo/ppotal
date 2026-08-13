"use client";

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import { LandForm, MapTheme } from '../lib/mapThemes';

interface LandTileLayerProps {
    prefectures: FeatureCollection | null;
    form: LandForm;
    theme: MapTheme;
}

const PANE = 'land-tiles';
/** Below everything else the map draws — this replaces the ground. */
const PANE_Z = 110;
/** Centre-to-centre spacing of the lattice, in screen pixels. */
const SPACING = 13;
/** The mask is only ever sampled at lattice centres, so it can be coarse. */
const MASK_SCALE = 0.5;

/**
 * Draws the landmass as a field of tiles rather than a filled outline.
 *
 * Testing every lattice point against 47 prefecture polygons would be tens of
 * millions of point-in-polygon tests. Instead the polygons are filled once into
 * a small offscreen mask — which is what canvas rasterisation is for — and each
 * lattice point becomes a single array lookup into that mask.
 */
const LandTileLayer: React.FC<LandTileLayerProps> = ({ prefectures, form, theme }) => {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);

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
        maskRef.current = document.createElement('canvas');

        return () => {
            canvas.remove();
            canvasRef.current = null;
            maskRef.current = null;
        };
    }, [map]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        if (!canvas || !mask) return;

        if (!prefectures || form === 'outline') {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = '';

        const render = () => {
            const size = map.getSize();
            const origin = map.containerPointToLayerPoint([0, 0]);

            canvas.width = size.x;
            canvas.height = size.y;
            canvas.style.width = `${size.x}px`;
            canvas.style.height = `${size.y}px`;
            L.DomUtil.setPosition(canvas, origin);

            const context = canvas.getContext('2d');
            if (!context) return;
            context.clearRect(0, 0, size.x, size.y);

            // 1. Rasterise the coastline into a coarse mask.
            const maskWidth = Math.max(1, Math.ceil(size.x * MASK_SCALE));
            const maskHeight = Math.max(1, Math.ceil(size.y * MASK_SCALE));
            mask.width = maskWidth;
            mask.height = maskHeight;
            const maskContext = mask.getContext('2d', { willReadFrequently: true });
            if (!maskContext) return;
            maskContext.clearRect(0, 0, maskWidth, maskHeight);
            maskContext.fillStyle = '#fff';

            const tracePolygon = (rings: number[][][]) => {
                maskContext.beginPath();
                for (const ring of rings) {
                    for (let i = 0; i < ring.length; i++) {
                        const p = map.latLngToContainerPoint([ring[i][1], ring[i][0]]);
                        const x = p.x * MASK_SCALE;
                        const y = p.y * MASK_SCALE;
                        if (i === 0) maskContext.moveTo(x, y); else maskContext.lineTo(x, y);
                    }
                    maskContext.closePath();
                }
                maskContext.fill('evenodd');
            };

            for (const feature of prefectures.features as Feature[]) {
                const geometry = feature.geometry as Polygon | MultiPolygon | undefined;
                if (!geometry) continue;
                if (geometry.type === 'Polygon') tracePolygon(geometry.coordinates as number[][][]);
                else if (geometry.type === 'MultiPolygon') {
                    for (const polygon of geometry.coordinates as number[][][][]) tracePolygon(polygon);
                }
            }

            const pixels = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
            const isLand = (x: number, y: number) => {
                const mx = Math.min(maskWidth - 1, Math.max(0, Math.round(x * MASK_SCALE)));
                const my = Math.min(maskHeight - 1, Math.max(0, Math.round(y * MASK_SCALE)));
                return pixels[(my * maskWidth + mx) * 4 + 3] > 96;
            };

            // 2. Walk the lattice and stamp a tile wherever the mask says land.
            context.fillStyle = theme.tileInk;
            const rowStep = form === 'hexes' ? SPACING * 0.866 : SPACING;
            const radius = SPACING * 0.42;

            for (let row = 0, y = 0; y < size.y + SPACING; row++, y = row * rowStep) {
                const shift = form === 'hexes' && row % 2 === 1 ? SPACING / 2 : 0;
                for (let x = shift; x < size.x + SPACING; x += SPACING) {
                    if (!isLand(x, y)) continue;

                    if (form === 'dots') {
                        context.beginPath();
                        context.arc(x, y, radius, 0, Math.PI * 2);
                        context.fill();
                    } else if (form === 'squares') {
                        const side = SPACING * 0.78;
                        context.fillRect(x - side / 2, y - side / 2, side, side);
                    } else {
                        context.beginPath();
                        for (let corner = 0; corner < 6; corner++) {
                            // Flat-top hexagons tile with the offset rows above.
                            const angle = (Math.PI / 3) * corner;
                            const hx = x + radius * 1.15 * Math.cos(angle);
                            const hy = y + radius * 1.15 * Math.sin(angle);
                            if (corner === 0) context.moveTo(hx, hy); else context.lineTo(hx, hy);
                        }
                        context.closePath();
                        context.fill();
                    }
                }
            }
        };

        // A lattice is defined in screen space, so it has to be rebuilt whenever
        // the screen moves under it. Only on settle: mid-pan the pane transform
        // carries it along, which is what makes the movement feel attached.
        render();
        map.on('moveend', render);
        map.on('zoomend', render);
        map.on('resize', render);
        return () => {
            map.off('moveend', render);
            map.off('zoomend', render);
            map.off('resize', render);
        };
    }, [map, prefectures, form, theme]);

    return null;
};

export default React.memo(LandTileLayer);

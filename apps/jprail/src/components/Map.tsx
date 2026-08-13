"use client";

import React from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapProps {
    children: React.ReactNode;
}

// Shared Canvas Renderer for visual layers
// We separate renderers by pane so we can control their visibility/opacity independently via CSS on the pane
//
// Padding is how much beyond the viewport each canvas covers, and it is
// quadratic: padding 2.0 makes a canvas five viewports wide and five tall,
// which for the station pane meant a 7500x4470 buffer — 33 megapixels to clear
// and repaint on every redraw. 0.25 keeps enough margin that a short pan does
// not trigger a redraw, at a twentieth of the pixels.
const PAD = 0.25;

export const backgroundCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'background' }) : null;
export const airportCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'airports' }) : null;
export const glowCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'railroad-glow' }) : null;
export const casingCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'railroad-casing' }) : null;
export const railroadCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'railroad-lines' }) : null;
export const stationCanvas = typeof window !== 'undefined' ? L.canvas({ padding: PAD, pane: 'station-labels' }) : null;

// Shared SVG Renderer for interaction layers (Perfect hit detection)
export const sharedSvgRenderer = typeof window !== 'undefined' ? L.svg({ padding: PAD, pane: 'master-interactions' }) : null;

const Map: React.FC<MapProps> = ({ children }) => {
    return (
        <MapContainer
            center={[36.0, 138.0]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#e0f2fe' }}
            preferCanvas={true}
            zoomControl={false}
            zoomSnap={0.5}
            zoomDelta={0.5}
            minZoom={4}
            maxBounds={[[5, 100], [65, 185]]}

            worldCopyJump={true}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

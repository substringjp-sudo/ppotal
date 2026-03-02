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
export const backgroundCanvas = typeof window !== 'undefined' ? L.canvas({ padding: 1.5, pane: 'background' }) : null;
export const glowCanvas = typeof window !== 'undefined' ? L.canvas({ padding: 2.0, pane: 'railroad-glow' }) : null;
export const casingCanvas = typeof window !== 'undefined' ? L.canvas({ padding: 2.0, pane: 'railroad-casing' }) : null;
export const railroadCanvas = typeof window !== 'undefined' ? L.canvas({ padding: 2.0, pane: 'railroad-lines' }) : null;
export const stationCanvas = typeof window !== 'undefined' ? L.canvas({ padding: 2.0, pane: 'station-labels' }) : null;

// Shared SVG Renderer for interaction layers (Perfect hit detection)
export const sharedSvgRenderer = typeof window !== 'undefined' ? L.svg({ padding: 0.5, pane: 'master-interactions' }) : null;

const Map: React.FC<MapProps> = ({ children }) => {
    return (
        <MapContainer
            center={[36.0, 138.0]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#a0c4ff' }}
            preferCanvas={true}
            zoomControl={false}
            zoomSnap={0.5}
            zoomDelta={0.5}
            minZoom={5}
            maxBounds={[[20, 120], [50, 160]]}
            worldCopyJump={true}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

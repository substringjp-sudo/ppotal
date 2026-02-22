"use client";

import React from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapProps {
    children: React.ReactNode;
}

// Shared Canvas Renderer with large over-rendering (padding: 1.5 means 4x4 viewport area)
export const sharedCanvasRenderer = typeof window !== 'undefined' ? L.canvas({ padding: 1.5 }) : null;

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
            renderer={sharedCanvasRenderer || L.canvas({ padding: 1.5 })}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

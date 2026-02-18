"use client";

import React from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
    children: React.ReactNode;
}

const Map: React.FC<MapProps> = ({ children }) => {
    return (
        <MapContainer
            center={[36, 138]}
            zoom={5}
            minZoom={5}
            maxZoom={18}
            preferCanvas={true}
            style={{ height: '100%', width: '100%', background: '#a0c4ff' }}
            scrollWheelZoom={true}
            zoomControl={false}
            zoomSnap={0}
            zoomDelta={0.1}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

"use client";

import React from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
    children: React.ReactNode;
}

const Map: React.FC<MapProps> = ({ children }) => {
    return (
        <MapContainer
            center={[35.6895, 139.6917]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#f0f0f0' }}
            scrollWheelZoom={true}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

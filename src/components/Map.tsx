"use client";

import React from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Map = ({ children }) => {
    return (
        <MapContainer
            center={[35.6895, 139.6917]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#f0f0f0' }}
            scrollWheelZoom={true}
            preferCanvas={true}
            zoomSnap={0.1}
            zoomDelta={0.1}
            zoomAnimation={true}
            wheelPxPerZoomLevel={120}
        >
            {children}
        </MapContainer>
    );
};

export default Map;

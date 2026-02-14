"use client";

import React from 'react';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
    children: React.ReactNode;
}

const ZoomSlider = () => {
    const map = useMap();
    const [zoom, setZoom] = React.useState(5);

    useMapEvents({
        zoomend: () => setZoom(map.getZoom())
    });

    const stopPropagation = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onWheel={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onTouchEnd={stopPropagation}
            style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '12px 8px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
            }}
        >
            <button
                onClick={() => map.setZoom(5)}
                title="Reset View"
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2c3e50',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '5px'
                }}
            >
                ⟲
            </button>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center' }}>
                <input
                    type="range"
                    min="5"
                    max="18"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => map.setZoom(parseFloat(e.target.value))}
                    style={{
                        WebkitAppearance: 'slider-vertical', // Standard vertical slider
                        width: '8px',
                        height: '100px',
                        cursor: 'pointer'
                    }}
                />
            </div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>{Math.round(zoom)}</div>
        </div>
    );
};

const Map: React.FC<MapProps> = ({ children }) => {
    return (
        <MapContainer
            center={[36, 138]}
            zoom={5}
            minZoom={5}
            maxZoom={18}
            zoomControl={false}
            style={{ height: '100%', width: '100%', background: '#fff' }}
            scrollWheelZoom={true}
        >
            <ZoomSlider />
            {children}
        </MapContainer>
    );
};

export default Map;

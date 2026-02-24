"use client";

import React from 'react';
import { useMap } from 'react-leaflet';

interface MapControlsProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    showLabels?: boolean;
    onToggleLabels?: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
    zoom,
    minZoom = 5,
    maxZoom = 18,
    showLabels = false,
    onToggleLabels
}) => {
    const map = useMap();

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseInt(e.target.value);
        map.setZoom(newZoom);
    };

    const handleReset = () => {
        map.flyTo([35.6895, 139.6917], 5, { duration: 1.5 });
    };

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '12px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            border: '1px solid #eee',
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>ZOOM</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#2c3e50' }}>{zoom.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={1}
                    value={zoom}
                    onChange={handleZoomChange}
                    style={{
                        width: '120px',
                        cursor: 'pointer',
                        accentColor: '#3498db'
                    }}
                />
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px 0',
                borderTop: '1px solid #eee',
                borderBottom: '1px solid #eee'
            }}>
                <div
                    onClick={onToggleLabels}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '4px 0'
                    }}
                >
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>STATION NAMES </span>
                    <div style={{
                        width: '32px',
                        height: '18px',
                        backgroundColor: showLabels ? '#3498db' : '#ccc',
                        borderRadius: '9px',
                        position: 'relative',
                        transition: 'background-color 0.2s'
                    }}>
                        <div style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: showLabels ? '16px' : '2px',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>
            </div>

            <button
                onClick={handleReset}
                style={{
                    padding: '8px',
                    backgroundColor: '#3498db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '800',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
            >
                RESET VIEW
            </button>
        </div>
    );
};

export default MapControls;

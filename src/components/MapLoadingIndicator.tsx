"use client";

import React from 'react';

interface MapLoadingIndicatorProps {
    isLoading: boolean;
    isTransitioning?: boolean;
}

const MapLoadingIndicator: React.FC<MapLoadingIndicatorProps> = ({ isLoading, isTransitioning }) => {
    if (!isLoading && !isTransitioning) return null;

    const message = isLoading ? "Loading Map Data..." : "Optimizing View...";

    // Position differs based on state
    const containerStyle: React.CSSProperties = isLoading ? {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    } : {
        bottom: '20px',
        right: '20px',
    };

    return (
        <div style={{
            position: 'absolute',
            zIndex: 5000,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: isTransitioning ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            padding: isTransitioning ? '10px 15px' : '20px 30px',
            borderRadius: isTransitioning ? '12px' : '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            ...containerStyle
        }}>
            <div className="map-loader" style={{
                width: '32px',
                height: '32px',
                borderTopColor: isTransitioning ? '#9b59b6' : '#3498db'
            }}></div>
            <span style={{
                color: '#2c3e50',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.02em'
            }}>
                {message}
            </span>
            <style>{`
                .map-loader {
                    width: 32px;
                    height: 32px;
                    border: 3.5px solid #f3f3f3;
                    border-top: 3.5px solid #3498db;
                    border-radius: 50%;
                    animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default MapLoadingIndicator;

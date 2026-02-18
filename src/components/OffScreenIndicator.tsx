import React from 'react';
import L from 'leaflet';

interface OffScreenIndicatorProps {
    map: L.Map | null;
    mapBounds: L.LatLngBounds | null;
    dragStartStation: string | null;
    visibleStations: any;
}

const OffScreenIndicator: React.FC<OffScreenIndicatorProps> = ({ map, mapBounds, dragStartStation, visibleStations }) => {
    if (!dragStartStation || !visibleStations || !visibleStations[dragStartStation] || !map) return null;

    const { centroid } = visibleStations[dragStartStation];
    const latLng = L.latLng(centroid[0], centroid[1]);

    // Safety check: is map ready/loaded?
    if (mapBounds && mapBounds.contains(latLng)) return null;

    let containerPoint;
    try {
        if (!(map as any)._loaded) return null;
        const center = map.getCenter();
        if (!center || center.lat === undefined) return null;
        containerPoint = map.latLngToContainerPoint(latLng);
    } catch (e) {
        return null; // Silent fail if map is mid-transition or not ready
    }
    const { x: width, y: height } = map.getSize();

    // Clamp to edges
    const edgePadding = 20;
    const clampedX = Math.max(edgePadding, Math.min(width - edgePadding, containerPoint.x));
    const clampedY = Math.max(edgePadding, Math.min(height - edgePadding, containerPoint.y));

    const angle = Math.atan2(clampedY - height / 2, clampedX - width / 2) * (180 / Math.PI);

    return (
        <div style={{
            position: 'fixed',
            left: clampedX,
            top: clampedY,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            zIndex: 1000,
            color: '#FF00FF',
            fontSize: '24px',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
            userSelect: 'none'
        }}>
            ➤
        </div>
    );
};

export default OffScreenIndicator;

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import { Trip } from '../types/trip';

interface TripLayerProps {
    recordedTrips: Trip[];
    zoomLevel: number;
    isMoving?: boolean;
}

const TripLayer: React.FC<TripLayerProps> = ({ recordedTrips, zoomLevel, isMoving = false }) => {
    const geoJsonData = React.useMemo(() => {
        if (!recordedTrips || recordedTrips.length === 0) return null;

        return {
            type: 'FeatureCollection',
            features: recordedTrips.flatMap(trip => {
                if (!trip.geometries) return [];
                return trip.geometries.map((segment: any, idx: number) => ({
                    type: 'Feature',
                    properties: { id: trip.id, start: trip.start, end: trip.end },
                    geometry: { type: 'LineString', coordinates: segment }
                }));
            })
        };
    }, [recordedTrips]);

    if (!geoJsonData) return null;

    const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;
    const baseWeight = 6;
    const dynamicWeight = baseWeight * weightFactor;

    const baseStyle = {
        color: '#2ecc71',
        weight: dynamicWeight,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        pane: 'ui-elements'
    } as any;

    const casingStyle = {
        color: '#000000',
        weight: dynamicWeight + 1.2,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
        pane: 'ui-elements'
    } as any;

    return (
        <>
            {zoomLevel >= 10 && !isMoving && (
                <GeoJSON
                    key={`trip-casing-${zoomLevel}`}
                    data={geoJsonData as any}
                    style={casingStyle}
                    interactive={false}
                />
            )}
            <GeoJSON
                key={`trip-base-${zoomLevel}`}
                data={geoJsonData as any}
                style={baseStyle}
                interactive={false}
            />
        </>
    );
};

export default React.memo(TripLayer);

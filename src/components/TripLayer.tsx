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
                return trip.geometries.map((segment: [number, number][], idx: number) => ({
                    type: 'Feature',
                    properties: { id: trip.id, start: trip.start, end: trip.end },
                    geometry: { type: 'LineString', coordinates: segment }
                }));
            })
        } as GeoJSON.FeatureCollection;
    }, [recordedTrips]);

    if (!geoJsonData) return null;

    const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;
    const baseWeight = 6;
    const dynamicWeight = baseWeight * weightFactor;

    const baseStyle: L.PathOptions = {
        color: '#2ecc71',
        weight: dynamicWeight,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        pane: 'ui-elements'
    };

    const casingStyle: L.PathOptions = {
        color: '#000000',
        weight: dynamicWeight + 1.2,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
        pane: 'ui-elements'
    };

    return (
        <>
            {zoomLevel >= 10 && !isMoving && (
                <GeoJSON
                    key={`trip-casing-${zoomLevel}`}
                    data={geoJsonData}
                    style={casingStyle}
                    interactive={false}
                />
            )}
            <GeoJSON
                key={`trip-base-${zoomLevel}`}
                data={geoJsonData}
                style={baseStyle}
                interactive={false}
            />
        </>
    );
};

const MemoizedTripLayer = React.memo(TripLayer);
MemoizedTripLayer.displayName = 'TripLayer';
export default MemoizedTripLayer;

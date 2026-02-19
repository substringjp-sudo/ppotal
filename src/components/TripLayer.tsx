import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { Trip } from '../types/trip';

interface TripLayerProps {
    recordedTrips: Trip[];
    zoomLevel: number;
}

const TripLayer: React.FC<TripLayerProps> = ({ recordedTrips, zoomLevel }) => {
    if (!recordedTrips || recordedTrips.length === 0) return null;

    const weightFactor = zoomLevel <= 9 ? Math.max(0.4, zoomLevel / 10) : 1.0;
    const baseWeight = 6;
    const dynamicWeight = baseWeight * weightFactor;

    return (
        <>
            {recordedTrips.map((trip) => (
                <React.Fragment key={trip.id}>
                    {trip.geometries && trip.geometries.map((segment: any, idx: number) => {
                        const positions = segment.map((c: any) => [c[1], c[0]] as [number, number]);
                        return (
                            <React.Fragment key={`${trip.id}-${idx}`}>
                                {/* Trip Casing - Only show at zoom 10+ */}
                                {zoomLevel >= 10 && (
                                    <Polyline
                                        positions={positions}
                                        pathOptions={{
                                            color: '#000000',
                                            weight: dynamicWeight + 1.2,
                                            opacity: 0.4,
                                            lineCap: 'round',
                                            lineJoin: 'round',
                                            pane: 'ui-elements'
                                        }}
                                        interactive={false}
                                    />
                                )}
                                {/* Main Trip Line */}
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        color: '#2ecc71', // Green for used/visited
                                        weight: dynamicWeight,
                                        opacity: 0.8,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        pane: 'ui-elements'
                                    }}
                                    interactive={false}
                                >
                                    <Tooltip sticky>Trip: {trip.start} ↔ {trip.end}</Tooltip>
                                </Polyline>
                            </React.Fragment>
                        );
                    })}
                </React.Fragment>
            ))}
        </>
    );
};

export default React.memo(TripLayer);

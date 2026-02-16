import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';

interface TripLayerProps {
    recordedTrips: any[];
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
                    {trip.geometries && trip.geometries.map((segment: any, idx: number) => (
                        <Polyline
                            key={`${trip.id}-${idx}`}
                            positions={segment.map((c: any) => [c[1], c[0]])} // [lng, lat] -> [lat, lng]
                            pathOptions={{
                                color: '#2ecc71', // Green for used/visited
                                weight: dynamicWeight,
                                opacity: 0.8,
                                lineCap: 'round',
                                lineJoin: 'round',
                                pane: 'ui-elements'
                            }}
                            interactive={false} // Allow clicking through to underlying lines? Or show tooltip?
                        >
                            <Tooltip sticky>Trip: {trip.from} ↔ {trip.to}</Tooltip>
                        </Polyline>
                    ))}
                </React.Fragment>
            ))}
        </>
    );
};

export default React.memo(TripLayer);

import { useRef } from 'react';
import { useTripStore } from '@pplaner/shared';
import TripMap from '../../common/TripMap';

interface TimelineMapViewProps {
    mapMarkers: any[];
    flightPaths: any[];
    tripPath: { lat: number; lng: number }[];
    mapSegments?: any[];
    initialCenter?: { lat: number; lng: number };
    isMapPlanningMode?: boolean;
    mapInsertAfterIndex?: number | null;
    onPolylineClick?: (insertAfterIndex: number) => void;
    regions?: any[];
}

export default function TimelineMapView({
    mapMarkers,
    flightPaths,
    tripPath,
    mapSegments,
    initialCenter,
    isMapPlanningMode,
    mapInsertAfterIndex,
    onPolylineClick,
    regions
}: TimelineMapViewProps) {
    const trip = useTripStore((state) => state.currentTrip);
    const mapRef = useRef<google.maps.Map | null>(null);

    if (!trip) return null;

    return (
        <div className="flex-1 w-full bg-slate-100/50 relative flex flex-col min-h-[600px] h-[750px]">
            <TripMap 
                trip={trip}
                onLoad={(map) => { mapRef.current = map; }}
                markers={mapMarkers}
                showPath={true}
                mapSegments={mapSegments}
                viewMode="itinerary"
                isMapPlanningMode={isMapPlanningMode}
                mapInsertAfterIndex={mapInsertAfterIndex}
                onPolylineClick={onPolylineClick}
            />
        </div>
    );
}

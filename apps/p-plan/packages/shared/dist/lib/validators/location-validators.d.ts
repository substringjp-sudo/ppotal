import { Trip, TripWarning } from '../../types/trip';
import { GeoJSONGeometry } from '../geo-utils';
export declare function validateAirportDistance(trip: Trip, warnings: TripWarning[]): void;
export declare function validateAccommodationRegion(trip: Trip, warnings: TripWarning[], geometries?: Record<string, GeoJSONGeometry>): void;
export declare function validateEventLocations(trip: Trip, warnings: TripWarning[], geometries?: Record<string, GeoJSONGeometry>): void;
export declare function validateLocationClusters(trip: Trip, warnings: TripWarning[]): void;

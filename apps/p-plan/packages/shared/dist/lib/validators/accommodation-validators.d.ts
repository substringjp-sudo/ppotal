import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
export declare function validateAccommodationOverlap(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validateAccommodationGaps(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validateAccommodationCapacity(trip: Trip, warnings: TripWarning[]): void;
export declare function validateAccommodationExpectedTimes(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function checkAccommodationFlightConflict(trip: Trip, warnings: TripWarning[]): void;
export declare function validateNoAccommodation(trip: Trip, warnings: TripWarning[]): void;
export declare function validateCheckoutDaySchedule(trip: Trip, warnings: TripWarning[]): void;

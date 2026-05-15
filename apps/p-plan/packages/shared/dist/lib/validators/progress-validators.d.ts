import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
export declare function validateChecklistProgress(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validatePrepTaskProgress(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;

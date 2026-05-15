import { Trip, TripWarning } from '../../types/trip';
export declare function validateInternationalLicense(trip: Trip, warnings: TripWarning[]): void;
export declare function validateHealthPreparation(trip: Trip, warnings: TripWarning[]): void;
export declare function validateCommunicationPrep(trip: Trip, warnings: TripWarning[]): void;
export declare function validateAirportTransfer(trip: Trip, warnings: TripWarning[]): void;
export declare function validateLateNightReturn(trip: Trip, warnings: TripWarning[]): void;

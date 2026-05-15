import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
export declare function validateFlightCompleteness(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validateFlightTimeRange(trip: Trip, warnings: TripWarning[]): void;
export declare function validateFlightSpeed(trip: Trip, warnings: TripWarning[]): void;
export declare function validateRentalCarPeriod(trip: Trip, warnings: TripWarning[]): void;
export declare function validatePublicTransportFeasibility(trip: Trip, warnings: TripWarning[]): void;
export declare function validateDrivingFeasibility(trip: Trip, warnings: TripWarning[]): void;
export declare function validateFlightLayovers(trip: Trip, warnings: TripWarning[]): void;
/**
 * 대중교통(열차, 버스 등) 일정이 다른 리소스와 겹치는지 확인
 */
export declare function validatePublicTransportConflicts(trip: Trip, warnings: TripWarning[]): void;
/**
 * 운전(렌터카 등) 일정이 다른 리소스와 겹치는지 확인
 */
export declare function validateDrivingConflicts(trip: Trip, warnings: TripWarning[]): void;

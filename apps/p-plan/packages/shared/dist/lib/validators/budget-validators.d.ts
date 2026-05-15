import { Trip, TripWarning } from '../../types/trip';
import { TravelStyle } from '../../types/user';
export declare function validateBudget(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validateBudgetRealism(trip: Trip, warnings: TripWarning[], style?: TravelStyle): void;
export declare function validateExpenseAnomalies(trip: Trip, warnings: TripWarning[]): void;
export declare function validateCurrencyMismatch(trip: Trip, warnings: TripWarning[]): void;

import { Trip, TripSummary, Travelog, WishlistItem, TravelStats } from '../types/index';
/**
 * Calculates comprehensive travel statistics and analysis from user data.
 */
export declare const calculateTravelStats: (trips: (Trip | TripSummary)[], regionNameMap?: {
    id: string;
    name: string;
}[], wishlistItems?: WishlistItem[], travelogs?: Travelog[]) => TravelStats;

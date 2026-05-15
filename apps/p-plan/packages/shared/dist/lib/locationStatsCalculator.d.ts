import { TripDocument, TripSummary } from '../types/trip';
import { WishlistItem } from '../types/wishlist';
import { Travelog } from '../types/record';
export interface LocationCityNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;
    plannedCount: number;
    wishlistCount: number;
    totalDays: number;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;
}
export interface LocationPrefNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;
    plannedCount: number;
    wishlistCount: number;
    totalDays: number;
    cities: Record<string, LocationCityNode>;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;
}
export interface LocationCountryNode {
    id: string | null;
    name: string;
    key: string;
    tripCount: number;
    plannedCount: number;
    wishlistCount: number;
    totalDays: number;
    prefectures: Record<string, LocationPrefNode>;
    wishlistItems: WishlistItem[];
    trips: (TripDocument | TripSummary)[];
    travelogs: Travelog[];
    xp: number;
    maxXp: number;
    isMastered: boolean;
    isPlanned?: boolean;
}
export interface LocationStats {
    summary: {
        visited: {
            countries: number;
            prefectures: number;
            cities: number;
        };
        planned: {
            countries: number;
            prefectures: number;
            cities: number;
        };
        wishlist: {
            countries: number;
            prefectures: number;
            cities: number;
        };
        unlocatedWishlistCount: number;
    };
    countries: Record<string, LocationCountryNode>;
}
export declare function calculateLocationStats(trips: (TripDocument | TripSummary)[], wishlistItems: WishlistItem[], travelogs?: Travelog[]): LocationStats;

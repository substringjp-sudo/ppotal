/**
 * 사용자 프로필 정보
 */
export interface TravelStyle {
    planning: 'planned' | 'flexible';
    active: 'energetic' | 'relaxed';
    budgetStrategy: 'luxury' | 'value';
    crowdPreference: 'trendy' | 'local' | 'quiet';
    strictness?: 'strict' | 'relaxed';
    meticulousness?: 'meticulous' | 'relaxed' | 'forgetful';
}
import { TravelStats } from './travel';
export interface UserProfile {
    userId: string;
    displayName: string;
    email: string;
    photoURL?: string;
    onboardingCompleted?: boolean;
    residence?: {
        country: string;
        countryId?: string;
        region?: string;
        regionId?: string;
    };
    preferences?: {
        currency: string;
        language: string;
        favoriteAirports?: string[];
    };
    travelStyle?: TravelStyle;
    metadata?: {
        travelStats?: TravelStats;
    };
    updatedAt: string;
}

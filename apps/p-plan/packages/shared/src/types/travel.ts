import { TripDocument as Trip, TripSummary, Travelog, WishlistItem, RegionType } from './index';

export interface MasteryStats {
    visitCount: number;
    plannedCount: number;
    days: number;
    spentKrw: number;
    events: number;
    places: string[];
    airports: string[];
    accommodations: string[];
}

export interface MasterySource {
    type: 'trip' | 'travelog' | 'wishlist';
    id: string;
    title: string;
}

export interface MasteryNode {
    id: string;
    name: string;
    type: RegionType;
    xp: number;
    maxXp: number;
    level: number;
    isMastered: boolean;
    stats: MasteryStats;
    sources: MasterySource[];
    prefectures?: Record<string, MasteryNode>;
    cities?: Record<string, MasteryNode>;
}

export type RegionalMastery = Record<string, MasteryNode>;
export type MasteryLevel = MasteryNode;

import { AchievementCategory } from './achievement';

export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string;
    category?: AchievementCategory;
    hint?: string;
    progress: number;
    maxXp: number;
    maxProgress?: number;
    isUnlocked: boolean;
    unlockedAt?: string;
}

export interface TravelStats {
    totalXP: number;
    level: number;
    analysisDate?: string;
    precision?: string;
    title: string;
    fantasyClass: string;
    mbti: string;
    persona: {
        t: number; // Target/Density
        p: number; // Planner
        a: number; // Active
        th: number; // Trendy/Preference
    };
    badges: Badge[];
    breakdown: {
        countries: number;
        cities: number;
        totalDays: number;
        totalKm: number;
        averageProgress: number;
        visitedCities: string[];
        visitedCountries: string[];
    };
    planningScore?: number;
    activeScore?: number;
    budgetStrategyScore?: number;
    crowdPreferenceScore?: number;
    mastery: Record<string, MasteryNode>;
    infiniteLog: {
        label: string;
        value: string | number;
        unit: string;
    }[];
    wishlistInsights?: {
        preferredRegions: { id: string; name: string; count: number }[];
        placeTendency: { category: string; count: number }[];
        description: string;
    };
    planningStyle?: {
        density: 'intense' | 'balanced' | 'relaxed';
        categoryPreference: { category: string; weight: number }[];
        preparationLeadTime: number;
        styleDescription: string;
        characteristics: string[];
    };
}

/**
 * 24시간 백그라운드 기록을 위한 발자취 로그 인터페이스
 * 사용자의 허가 하에 로컬에만 저장되며, 정밀 여행 기록의 기반 데이터가 됨.
 */
export interface LifeLog {
    id: string;
    timestamp: number;
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    speed?: number;
    status: 'raw' | 'processed'; // processed는 여행 기록으로 가공된 상태
    activity?: string; // walking, running, automotive, stationary
}

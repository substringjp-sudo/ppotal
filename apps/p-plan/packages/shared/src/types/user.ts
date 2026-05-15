/**
 * 사용자 프로필 정보
 */

export interface TravelStyle {
    planning: 'planned' | 'flexible'; // 계획형 vs 즉흥형
    active: 'energetic' | 'relaxed'; // 활발형 vs 여유형
    budgetStrategy: 'luxury' | 'value'; // 플렉스형 vs 가성비형
    crowdPreference: 'trendy' | 'local' | 'quiet'; // 핫플형 vs 로컬형 vs 한적한곳
    strictness?: 'strict' | 'relaxed'; // 시간 엄수 vs 유연
    meticulousness?: 'meticulous' | 'relaxed' | 'forgetful'; // 꼼꼼함 vs 대충 vs 덜렁
}

import { TravelStats } from './travel';

export interface UserProfile {
    userId: string;
    displayName: string;
    email: string;
    photoURL?: string;
    onboardingCompleted?: boolean;
    
    // 거주 정보
    residence?: {
        country: string;
        countryId?: string;
        region?: string;
        regionId?: string;
    };
    
    // 선호 설정
    preferences?: {
        currency: string;
        language: string;
        favoriteAirports?: string[]; // IATA codes
    };

    // 여행 스타일
    travelStyle?: TravelStyle;
    
    // 통계 및 메타데이터
    metadata?: {
        travelStats?: TravelStats;
    };

    updatedAt: string;
}

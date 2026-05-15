import { TripRegion } from '../types/trip';
export interface ThemeOption {
    background: string;
    gradient: string;
    silhouetteColor: string;
    moodImageUrl?: string;
}
/**
 * 전역 테마용 무드 이미지 URL 저장소 (Unsplash)
 */
export declare const MOOD_IMAGES: {
    SEOUL: string;
    KYOTO: string;
    NYC: string;
    LONDON: string;
    PARIS: string;
    ROME: string;
    HALONG_BAY: string;
    BANGKOK: string;
    TAIPEI: string;
    ISLAND: string;
    CITY: string;
    NATURE: string;
};
export declare function getTripTheme(regions: TripRegion[]): ThemeOption;

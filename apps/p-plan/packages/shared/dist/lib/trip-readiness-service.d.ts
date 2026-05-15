import { Trip } from '../types/trip';
export interface ReadinessBreakdown {
    label: string;
    score: number;
    maxScore: number;
    status: 'completed' | 'in-progress' | 'pending';
    message: string;
}
export interface ReadinessResult {
    totalScore: number;
    status: 'READY' | 'IN_PROGRESS' | 'INITIALIZING';
    breakdown: ReadinessBreakdown[];
}
/**
 * 여행 준비도(성숙도) 점수를 계산합니다.
 */
export declare function calculateReadinessScore(trip: Trip): ReadinessResult;

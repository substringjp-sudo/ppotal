'use client';

import { useState, useCallback } from 'react';
import { 
    calculateTravelStats,
    generateTimelineFromPhotos as callGenerateTimelineFromPhotos,
    PhotoMetadata,
    ClusteredLocation,
    TravelStats,
    Trip,
    TripSummary,
    Travelog
} from '@pplaner/shared';

export function useIntelligence() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 사용자의 데이터를 기반으로 로컬에서 통계 계산
     */
    const calculateStats = useCallback((
        trips: (Trip | TripSummary)[],
        wishlistItems: any[],
        travelogs: Travelog[]
    ): TravelStats | null => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const stats = calculateTravelStats(trips, undefined, wishlistItems, travelogs);
            return stats;
        } catch (err: any) {
            console.error('Stats calculation error:', err);
            setError(err.message || '통계 계산 중 오류가 발생했습니다.');
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    /**
     * 사진 메타데이터(시간/좌표)를 분석하여 여행 타임라인 제안 생성
     */
    const generateTimeline = useCallback(async (photos: PhotoMetadata[]): Promise<ClusteredLocation[]> => {
        setIsGeneratingTimeline(true);
        setError(null);
        try {
            const timeline = await callGenerateTimelineFromPhotos(photos);
            return timeline;
        } catch (err: any) {
            console.error('Timeline generation error:', err);
            setError(err.message || '타임라인 생성 중 오류가 발생했습니다.');
            return [];
        } finally {
            setIsGeneratingTimeline(false);
        }
    }, []);

    return {
        calculateStats,
        generateTimeline,
        isAnalyzing,
        isGeneratingTimeline,
        error
    };
}

import { useState, useEffect, useCallback } from 'react';
import { getCombinedTripHistory, TripHistoryItem } from '../lib/database';

/**
 * 특정 여행의 발자취 및 사진 기록을 가져오는 커스텀 훅
 */
export const useTripTrace = (tripId: string) => {
    const [history, setHistory] = useState<TripHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        try {
            setIsLoading(true);
            const data = getCombinedTripHistory(tripId);
            setHistory(data);
            setError(null);
        } catch (err) {
            console.error('PPLANER: Failed to load trip history', err);
            setError('기록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        if (tripId) {
            loadHistory();

            // 실시간 업데이트를 위해 주기적으로 폴링 (또는 다른 이벤트 기반 업데이트 고려 가능)
            // 백그라운드 태스크가 데이터를 SQLite에 쓰고 있으므로 주기적 체크가 유효함
            const interval = setInterval(loadHistory, 30000); // 30초마다 갱신
            return () => clearInterval(interval);
        }
    }, [tripId, loadHistory]);

    return { 
        history, 
        isLoading, 
        error, 
        refresh: loadHistory 
    };
};

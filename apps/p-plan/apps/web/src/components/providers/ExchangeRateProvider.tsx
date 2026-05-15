'use client';
import { useEffect } from 'react';
import { useExchangeRateStore } from '@pplaner/shared';

export default function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
    const { fetchRates, lastUpdated } = useExchangeRateStore();
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    useEffect(() => {
        const checkAndFetch = () => {
            const now = Date.now();
            const lastUpdate = lastUpdated ? new Date(lastUpdated).getTime() : 0;
            
            if (now - lastUpdate > SIX_HOURS) {
                console.log('환율 데이터가 6시간 이상 경과하여 새로운 데이터를 가져옵니다.');
                fetchRates();
            }
        };

        // 초기 실행
        checkAndFetch();

        // 앱 브라우저 포커스가 다시 돌아왔을 때 체크
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAndFetch();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        
        // 정기적인 인터벌 체크 (1시간마다 유효성 검사)
        const interval = setInterval(checkAndFetch, 60 * 60 * 1000);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, [fetchRates, lastUpdated]);

    return <>{children}</>;
}

import { useEffect } from 'react';
import { useTripStore, subscribeUserTrips, useUserStore } from '@pplaner/shared';

/**
 * Firebase Firestore에서 여행 목록을 실시간으로 동기화하는 훅
 */
export const useFirebaseSync = () => {
    const setTrips = useTripStore((state) => state.setTrips);
    const userId = useUserStore((state) => state.profile?.userId);

    useEffect(() => {
        if (!userId) return;

        console.log(`PPLANER: Starting real-time sync for user ${userId}`);
        
        // 실시간 구독 시작
        const unsubscribe = subscribeUserTrips(userId, (trips) => {
            console.log(`PPLANER: Received ${trips.length} trips from Firestore`);
            setTrips(trips);
        });

        return () => {
            console.log(`PPLANER: Unsubscribing from real-time sync`);
            unsubscribe();
        };
    }, [userId, setTrips]);

    return null;
};

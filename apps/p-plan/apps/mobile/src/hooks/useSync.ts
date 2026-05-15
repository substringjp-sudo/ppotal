import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { 
    getUnsyncedLocations, 
    getUnsyncedPhotos, 
    markLocationAsSynced, 
    markPhotoAsSynced 
} from '../lib/database';
import { syncRecordedLocations, syncRecordedPhotos } from '@pplaner/shared';

/**
 * 오프라인 데이터를 온라인 상태일 때 Firebase와 동기화하는 커스텀 훅
 */
export const useSync = (activeTripId: string | null) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const performSync = async (tripId: string) => {
        if (isSyncing) return;
        
        const state = await NetInfo.fetch();
        if (!state.isConnected) return;

        setIsSyncing(true);
        console.log(`PPLANER: Starting sync for trip ${tripId}...`);

        try {
            // 1. 위치 동기화
            const unsyncedLocs = getUnsyncedLocations();
            if (unsyncedLocs.length > 0) {
                // Trip ID 필터링 (현재 활성 여행 것만 동기화하거나 모두 동기화)
                const targetLocs = unsyncedLocs.filter(l => l.tripId === tripId);
                if (targetLocs.length > 0) {
                    await syncRecordedLocations(tripId, targetLocs.map(l => ({
                        latitude: l.latitude,
                        longitude: l.longitude,
                        timestamp: l.timestamp
                    })));
                    
                    // 성공 시 SQLite 상태 업데이트
                    targetLocs.forEach(l => markLocationAsSynced(l.id));
                }
            }

            // 2. 사진 동기화
            const unsyncedPhotos = getUnsyncedPhotos();
            if (unsyncedPhotos.length > 0) {
                const targetPhotos = unsyncedPhotos.filter(p => p.tripId === tripId);
                if (targetPhotos.length > 0) {
                    await syncRecordedPhotos(tripId, targetPhotos.map(p => ({
                        uri: p.uri,
                        latitude: p.latitude,
                        longitude: p.longitude,
                        timestamp: p.timestamp
                    })));

                    targetPhotos.forEach(p => markPhotoAsSynced(p.id));
                }
            }

            setLastSyncTime(new Date());
            console.log('PPLANER: Sync completed successfully.');
        } catch (error) {
            console.error('PPLANER: Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (!activeTripId) return;

        // 네트워크 상태 변화 감지 시 동기화 시도
        const unsubscribe = NetInfo.addEventListener(state => {
            if (state.isConnected && !isSyncing) {
                performSync(activeTripId);
            }
        });

        // 5분마다 주기적 자동 동기화 시도
        const interval = setInterval(() => {
            performSync(activeTripId);
        }, 5 * 60 * 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [activeTripId]);

    return { isSyncing, lastSyncTime, triggerSync: () => activeTripId && performSync(activeTripId) };
};

'use client';

import { useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { 
    functions, 
    useTripStore, 
    useWishlistStore, 
    useUserStore,
    calculateTravelStats,
    updateUserProfile,
    setReverseGeocodeHandler,
    setSearchRegionsHandler,
    PhotoMetadata,
    ClusteredLocation,
    TravelStats
} from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';

/**
 * 전역 윈도우 객체에 인텔리전스 서비스 핸들러를 주입하고,
 * 데이터 변경 시 자동으로 통계를 동기화하는 프로바이더입니다.
 */
export default function IntelligenceSyncProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { profile } = useUserStore();
    const syncTimeout = useRef<any>(null);
    const lastSyncData = useRef<string>('');

    // 1. 핸들러 초기화 (기존 IntelligenceProvider 로직)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 여행 통계 및 마스터리 계산 핸들러
        (window as any)._calculateUserStats = async (uid: string): Promise<TravelStats> => {
            const calculateStats = httpsCallable<{ uid: string }, TravelStats>(functions, 'calculateUserStats');
            const result = await calculateStats({ uid });
            return result.data;
        };

        // 사진 기반 타임라인 생성 핸들러
        (window as any)._generateTimelineFromPhotos = async (photos: PhotoMetadata[]): Promise<ClusteredLocation[]> => {
            const clusterPhotos = httpsCallable<{ photos: PhotoMetadata[] }, ClusteredLocation[]>(functions, 'clusterPhotos');
            const result = await clusterPhotos({ photos });
            return result.data;
        };

        // Shared Library 핸들러 연결
        setReverseGeocodeHandler(
            async (lat, lng) => {
                const reverseGeocode = httpsCallable<{ lat: number, lng: number }, any>(functions, 'reverseGeocode');
                const result = await reverseGeocode({ lat, lng });
                return result.data;
            },
            async (locations) => {
                const batchReverseGeocode = httpsCallable<{ locations: { lat: number, lng: number }[] }, any[]>(functions, 'batchReverseGeocode');
                const result = await batchReverseGeocode({ locations });
                return result.data;
            }
        );

        setSearchRegionsHandler(async (query) => {
            const search = httpsCallable<{ query: string }, any[]>(functions, 'searchRegions');
            const result = await search({ query });
            return result.data;
        });

        console.log('✔ Intelligence Service handlers initialized');
    }, []);

    // 2. 데이터 변경 감지 및 자동 동기화
    useEffect(() => {
        if (!user || !profile) return;

        const handleSync = async () => {
            const trips = useTripStore.getState().trips;
            const wishlistItems = useWishlistStore.getState().items;
            
            // 데이터 변경 여부 확인 (최소화된 문자열 비교)
            const currentDataSnapshot = JSON.stringify({
                tripCount: trips.length,
                wishlistCount: wishlistItems.length,
                // 필요시 더 정밀한 비교 추가 가능
            });

            if (currentDataSnapshot === lastSyncData.current) return;
            lastSyncData.current = currentDataSnapshot;

            try {
                // 클라이언트 사이드 통계 계산
                const stats = calculateTravelStats(trips, undefined, wishlistItems, []);
                
                // [FIX] Firestore는 undefined 값을 허용하지 않으므로 제거함
                const sanitizeObject = (obj: any) => {
                    const result = { ...obj };
                    Object.keys(result).forEach(key => {
                        if (result[key] === undefined) {
                            delete result[key];
                        } else if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                            result[key] = sanitizeObject(result[key]);
                        }
                    });
                    return result;
                };

                const sanitizedStats = sanitizeObject({
                    ...stats,
                    analysisDate: new Date().toISOString(),
                    precision: profile.metadata?.travelStats?.precision || 'basic'
                });

                // 프로필 업데이트 (Firestore 동기화 포함)
                await updateUserProfile(user.uid, {
                    metadata: {
                        ...profile.metadata,
                        travelStats: sanitizedStats
                    }
                });
                
                console.log('✔ Intelligence stats auto-synced to Profile (sanitized)');
            } catch (error) {
                console.error('Failed to auto-sync intelligence:', error);
            }
        };

        // 스토어 변경 구독
        const unsubTrips = useTripStore.subscribe((state) => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
            syncTimeout.current = setTimeout(handleSync, 2000); // 2초 디바운스
        });

        const unsubWishlist = useWishlistStore.subscribe((state) => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
            syncTimeout.current = setTimeout(handleSync, 2000);
        });

        // 초기 동기화 시도
        handleSync();

        return () => {
            unsubTrips();
            unsubWishlist();
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
        };
    }, [user, profile]);

    // 3. 탭 간 동기화 (Storage Event)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'pplan-wishlist-storage') {
                // Zustand persist가 자동으로 처리하지만, 즉각적인 반응을 위해 강제 리로드 또는 상태 갱신 유도 가능
                // 여기서는 로그만 남기고 Zustand의 내장 동기화를 신뢰함
                console.log('Wishlist storage changed in another tab');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return <>{children}</>;
}

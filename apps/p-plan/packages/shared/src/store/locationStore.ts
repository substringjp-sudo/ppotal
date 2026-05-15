import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserLocationPoint, RecordingSession } from '../types/location';
import { ISODateTimeString } from '../types/common';

interface LocationState {
    // 최근 위치 포인트들 (로컬 캐시)
    history: UserLocationPoint[];
    activeSession: RecordingSession | null;
    
    // Actions
    addLocationPoint: (point: UserLocationPoint) => void;
    startRecordingSession: (tripId: string, mode?: 'standard' | 'simple') => void;
    stopRecordingSession: () => void;
    clearHistory: () => void;
    
    // 세션 중 발생한 이벤트 ID 기록
    addEventToSession: (eventId: string) => void;
}

/**
 * 전역 위치 기록 및 세션 관리를 위한 스토어
 * 24시간 상시 위치 히스토리를 관리하며, 여행 세션은 이 중 특정 구간을 의미합니다.
 */
export const useLocationStore = create<LocationState>()(
    persist(
        (set, get) => ({
            history: [],
            activeSession: null,

            addLocationPoint: (point) => {
                set((state) => ({
                    history: [...state.history, point].slice(-5000), // 최근 5000개 포인트 유지 (메모리 관리)
                }));
            },

            startRecordingSession: (tripId, mode = 'standard') => {
                const session: RecordingSession = {
                    id: Math.random().toString(36).substr(2, 9),
                    tripId,
                    startTime: new Date().toISOString(),
                    isActive: true,
                    recordingMode: mode,
                    manualEventIds: [],
                };
                set({ activeSession: session });
            },

            stopRecordingSession: () => {
                set((state) => {
                    if (!state.activeSession) return state;
                    return {
                        activeSession: {
                            ...state.activeSession,
                            endTime: new Date().toISOString(),
                            isActive: false,
                        },
                    };
                });
            },

            addEventToSession: (eventId) => {
                set((state) => {
                    if (!state.activeSession) return state;
                    return {
                        activeSession: {
                            ...state.activeSession,
                            manualEventIds: [...state.activeSession.manualEventIds, eventId],
                        },
                    };
                });
            },

            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'pplaner-location-storage',
            // Storage engine은 각 플랫폼에서 주입하거나 기본값 사용
        }
    )
);

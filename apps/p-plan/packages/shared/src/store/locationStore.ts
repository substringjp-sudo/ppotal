import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserLocationPoint, RecordingSession } from '../types/location';
import { ISODateTimeString } from '../types/common';

// 플랫폼에 따른 스토리지 엔진 선택 (웹: localStorage, 모바일: AsyncStorage)
// tripStore/settingsStore 와 같은 방식이다. 이 스토어만 이것이 빠져 있었고,
// zustand 의 기본 스토리지는 localStorage 라 네이티브에서는 조용히 아무것도
// 저장하지 않는다. 그래서 앱이 내려갔다 올라오면 기록 세션이 통째로 사라졌다.
const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        // Obfuscate require to prevent static build-time resolution by Webpack/Turbopack
        const nativeRequire = typeof eval !== 'undefined' ? eval('require') : null;
        if (nativeRequire) {
            const AsyncStorage = nativeRequire('@react-native-async-storage/async-storage')?.default;
            return AsyncStorage;
        }
    } catch (e) {
        return undefined;
    }
    return undefined;
};

interface LocationState {
    // 최근 위치 포인트들 (로컬 캐시)
    history: UserLocationPoint[];
    activeSession: RecordingSession | null;
    
    // Actions
    addLocationPoint: (point: UserLocationPoint) => void;
    startRecordingSession: (tripId: string, mode?: 'standard' | 'simple') => void;
    resumeRecordingSession: (tripId: string) => void;
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

            /**
             * 이미 돌고 있는 백그라운드 기록에 세션 상태를 다시 맞춘다.
             *
             * 진짜로 기록 중인지는 OS 의 위치 태스크가 알고 있다. 그쪽은 살아
             * 있는데 이쪽 세션만 없어진 경우, 새 세션을 여는 대신(그러면 시작
             * 시각이 지금으로 밀려 그 사이 기록이 잘려 나간다) 같은 여행의
             * 세션을 되살린다. 시작 시각을 모르므로 기존 값이 없을 때만 지금을
             * 쓴다.
             */
            resumeRecordingSession: (tripId) => {
                set((state) => {
                    const prev = state.activeSession;
                    if (prev && prev.tripId === tripId && prev.isActive) return state;
                    return {
                        activeSession: {
                            id: prev?.tripId === tripId ? prev.id : Math.random().toString(36).substr(2, 9),
                            tripId,
                            startTime: prev?.tripId === tripId ? prev.startTime : new Date().toISOString(),
                            isActive: true,
                            recordingMode: prev?.tripId === tripId ? prev.recordingMode : 'standard',
                            manualEventIds: prev?.tripId === tripId ? prev.manualEventIds : [],
                        },
                    };
                });
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
            storage: createJSONStorage(() => getStorage()),
            // history 는 위치가 들어올 때마다 바뀌는 화면용 캐시고, 실제 발자취는
            // SQLite(footprints)에 따로 쌓인다. 5000개 배열을 매 포인트마다 다시
            // 쓰면 기록 중 내내 디스크를 때리므로 세션만 남긴다.
            partialize: (state) => ({ activeSession: state.activeSession }),
        }
    )
);

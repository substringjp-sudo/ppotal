import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LifeLog } from '../types/travel';

interface LifeLogState {
    isAlwaysTracking: boolean;
    lastLog: LifeLog | null;
    setAlwaysTracking: (enabled: boolean) => void;
    setLastLog: (log: LifeLog) => void;
}

const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return AsyncStorage;
    } catch (e) {
        return undefined;
    }
};

export const useLifeLogStore = create<LifeLogState>()(
    persist(
        (set) => ({
            isAlwaysTracking: false,
            lastLog: null,
            setAlwaysTracking: (enabled) => set({ isAlwaysTracking: enabled }),
            setLastLog: (log) => set({ lastLog: log }),
        }),
        {
            name: 'lifelog-storage',
            storage: createJSONStorage(() => getStorage()),
        }
    )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LocationModeSettings {
  enabled?: boolean;
  interval: number; // ms
  accuracy: 'high' | 'balanced' | 'low';
}

export interface LocationSettings {
  always: LocationModeSettings;
  trip: LocationModeSettings;
  recordOnlyWhenMoving: boolean;
  batteryOptimization: boolean;
}

export interface PhotoSettings {
  autoSync: boolean;
  saveToGallery: boolean;
  quality: 'original' | 'high' | 'medium';
}

export interface SettingsState {
  location: LocationSettings;
  photo: PhotoSettings;
  theme: 'system' | 'light' | 'dark';
  
  // Actions
  updateLocationSettings: (settings: Partial<LocationSettings>) => void;
  updatePhotoSettings: (settings: Partial<PhotoSettings>) => void;
  updateTheme: (theme: SettingsState['theme']) => void;
}

const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        // Obfuscate module name to prevent static build-time resolution by Webpack/Turbopack
        const moduleName = '@react-native-async-storage/' + 'async-storage';
        const AsyncStorage = require(moduleName).default;
        return AsyncStorage;
    } catch (e) {
        return undefined;
    }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      location: {
        always: {
          enabled: true,
          interval: 1800000, // 30 min default for daily
          accuracy: 'balanced',
        },
        trip: {
          interval: 300000, // 5 min default for trip
          accuracy: 'high',
        },
        recordOnlyWhenMoving: true,
        batteryOptimization: true,
      },
      photo: {
        autoSync: true,
        saveToGallery: true,
        quality: 'high',
      },
      theme: 'system',
      
      updateLocationSettings: (settings) => set((state) => ({
        location: { ...state.location, ...settings }
      })),
      updatePhotoSettings: (settings) => set((state) => ({
        photo: { ...state.photo, ...settings }
      })),
      updateTheme: (theme) => set({ theme }),
    }),
    {
      name: 'pplaner-settings',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);

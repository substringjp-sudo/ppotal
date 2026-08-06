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
  /**
   * 로그인 프로필의 거주국(residence.country)이 없을 때(비로그인 게스트, 또는
   * 아직 프로필을 설정하지 않은 로그인 사용자)를 위한 기기 로컬 홈 국가 대체값.
   * 준비물/비자 요건 계산의 기준국을 정확히 하기 위한 용도.
   */
  homeCountryOverride?: string;

  // Actions
  updateLocationSettings: (settings: Partial<LocationSettings>) => void;
  updatePhotoSettings: (settings: Partial<PhotoSettings>) => void;
  updateTheme: (theme: SettingsState['theme']) => void;
  updateHomeCountryOverride: (country?: string) => void;
}

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
      homeCountryOverride: undefined,

      updateLocationSettings: (settings) => set((state) => ({
        location: { ...state.location, ...settings }
      })),
      updatePhotoSettings: (settings) => set((state) => ({
        photo: { ...state.photo, ...settings }
      })),
      updateTheme: (theme) => set({ theme }),
      updateHomeCountryOverride: (country) => set({ homeCountryOverride: country }),
    }),
    {
      name: 'pplaner-settings',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);

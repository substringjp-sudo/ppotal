import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFootprint } from '../lib/database';
import { TripRecordingSettings, useSettingsStore } from '@pplaner/shared';

export const LOCATION_TASK_NAME = 'pplaner-background-location';
export const LIFELOG_TASK_NAME = 'pplaner-background-lifelog';

const ACTIVE_TRIP_ID_KEY = 'pplaner-active-trip-id';
const RECORDING_SETTINGS_KEY = 'pplaner-recording-settings';

let batterySubscription: Battery.Subscription | null = null;

/**
 * 24시간 일상 기록 태스크 정의
 */
export const defineLifeLogTask = () => {
    TaskManager.defineTask(LIFELOG_TASK_NAME, async ({ data, error }) => {
        if (error) {
            console.error('PPLANER: LifeLog Task Error:', error);
            return;
        }
        
        if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };
            for (const loc of locations) {
                // 정확도가 1km 이상으로 너무 낮은 데이터는 필터링
                if (loc.coords.accuracy && loc.coords.accuracy > 1000) continue;

                saveFootprint({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    accuracy: loc.coords.accuracy || 0,
                    timestamp: loc.timestamp,
                    activity: 'passive'
                });
            }
        }
    });
};

/**
 * 여행 전용 백그라운드 위치 추적 태스크 정의
 */
export const defineLocationTask = () => {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        if (error) {
            console.error('PPLANER: Location Task Error:', error);
            return;
        }
        
        if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };
            const activeTripId = await AsyncStorage.getItem(ACTIVE_TRIP_ID_KEY);
            
            if (!activeTripId) {
                console.log('PPLANER: No active trip, stopping location updates.');
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                return;
            }

            for (const loc of locations) {
                try {
                    saveFootprint({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        accuracy: loc.coords.accuracy || 0,
                        timestamp: loc.timestamp,
                        activity: 'active'
                    });
                } catch (dbError) {
                    console.error('PPLANER: Failed to save location to footprints:', dbError);
                }
            }
        }
    });
};

/**
 * 24시간 일상 기록 시작 (Significant Location Changes)
 * 이 모드는 배터리 소모가 거의 없으며, 시스템이 위치가 크게 변했을 때만 앱을 깨웁니다.
 */
export const startAlwaysTracking = async () => {
    if (Platform.OS === 'web') return;

    const settings = useSettingsStore.getState().location;
    
    // 일상 기록이 비활성화되어 있으면 중지하고 리턴
    if (!settings.always.enabled) {
        await stopAlwaysTracking();
        return;
    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return;

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') return;

    let accuracy = Location.Accuracy.Balanced;
    if (settings.always.accuracy === 'high') accuracy = Location.Accuracy.Highest;
    else if (settings.always.accuracy === 'low') accuracy = Location.Accuracy.Low;

    const options: Location.LocationOptions = {
        accuracy,
        distanceInterval: settings.recordOnlyWhenMoving ? 100 : 0, 
        timeInterval: settings.always.interval,
        deferredUpdatesInterval: settings.always.interval,
        foregroundService: {
            notificationTitle: 'PPLANER가 일상을 기록 중입니다',
            notificationBody: '당신의 모든 발자취는 안전하게 기기에만 저장됩니다.',
            notificationColor: '#4F46E5',
        },
    };

    await Location.startLocationUpdatesAsync(LIFELOG_TASK_NAME, options);
};

export const stopAlwaysTracking = async () => {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LIFELOG_TASK_NAME);
    if (isStarted) {
        await Location.stopLocationUpdatesAsync(LIFELOG_TASK_NAME);
    }
};

/**
 * 배터리 상태에 따른 위치 추적 옵션 계산 (여행 모드용)
 */
const getOptimizationOptions = (batteryLevel: number, settings: TripRecordingSettings, useBatteryOptimization: boolean): Location.LocationOptions => {
    let interval = settings.locationIntervals.high;
    let accuracy = Location.Accuracy.Highest;

    if (useBatteryOptimization) {
        if (batteryLevel < 0.2) {
            interval = settings.locationIntervals.low;
            accuracy = Location.Accuracy.Low;
        } else if (batteryLevel < 0.5) {
            interval = settings.locationIntervals.medium;
            accuracy = Location.Accuracy.Balanced;
        }
    }

    return {
        accuracy,
        timeInterval: interval,
        distanceInterval: 50, // 더 정밀한 경로를 위해 50m로 조정
        deferredUpdatesInterval: interval,
        foregroundService: {
            notificationTitle: 'PPLANER 여행 기록 중',
            notificationBody: (useBatteryOptimization && batteryLevel < 0.2) ? '배터리 절약을 위해 기록 간격이 늘어났습니다.' : '현재 여행 경로를 실시간으로 기록하고 있습니다.',
            notificationColor: '#ec5b13',
        },
    };
};

/**
 * 여행 전용 백그라운드 위치 추적 시작
 */
export const startBackgroundTracking = async (tripId: string, overrideSettings?: Partial<TripRecordingSettings>) => {
    await AsyncStorage.setItem(ACTIVE_TRIP_ID_KEY, tripId);
    
    const globalSettings = useSettingsStore.getState().location;
    
    // 기본 설정 구성
    const settings: TripRecordingSettings = {
        isRecordingEnabled: true,
        locationIntervals: {
            high: globalSettings.trip.interval,
            medium: globalSettings.trip.interval * 2,
            low: globalSettings.trip.interval * 4,
        },
        autoSyncPhotos: useSettingsStore.getState().photo.autoSync,
        ...overrideSettings
    };

    await AsyncStorage.setItem(RECORDING_SETTINGS_KEY, JSON.stringify(settings));

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') throw new Error('위치 서비스 권한이 거부되었습니다.');

    if (Platform.OS !== 'web') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') throw new Error('백그라운드 위치 권한이 거부되었습니다.');
    } else {
        return; 
    }

    const batteryLevel = await Battery.getBatteryLevelAsync();
    const options = getOptimizationOptions(batteryLevel, settings, globalSettings.batteryOptimization);

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);

    if (batterySubscription) batterySubscription.remove();
    batterySubscription = Battery.addBatteryLevelListener(async ({ batteryLevel: newLevel }) => {
        const updatedOptions = getOptimizationOptions(newLevel, settings, globalSettings.batteryOptimization);
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, updatedOptions);
    });
};

/**
 * 여행 전용 백그라운드 위치 추적 중지
 */
export const stopBackgroundTracking = async () => {
    await AsyncStorage.removeItem(ACTIVE_TRIP_ID_KEY);
    await AsyncStorage.removeItem(RECORDING_SETTINGS_KEY);
    
    if (batterySubscription) {
        batterySubscription.remove();
        batterySubscription = null;
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
};

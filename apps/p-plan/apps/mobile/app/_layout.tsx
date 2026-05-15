import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { geodataEngine, FirestoreGeodataProvider, db } from '@pplaner/shared';
import { SQLiteGeodataProvider } from '../src/lib/sqlite-geodata-provider';
import { initDatabase } from '../src/lib/database';
import { defineLocationTask, defineLifeLogTask, startAlwaysTracking } from '../src/services/LocationWorker';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// 백그라운드 태스크는 컴포넌트 외부(글로벌)에서 한 번 정의되어야 합니다.
if (Platform.OS !== 'web') {
  defineLocationTask();
  defineLifeLogTask();
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add custom fonts if needed, e.g., 'Pretendard': require('../assets/fonts/Pretendard.ttf'),
  });

  useEffect(() => {
    // DB 및 지리 엔진 초기화
    const init = async () => {
      try {
        // 1. 로컬 SQLite 초기화 (오프라인 기록용)
        initDatabase();

        // 2. 24시간 일상 기록 시작 (사용자 경험상 앱 부팅 시 자동 실행)
        if (Platform.OS !== 'web') {
          // 비동기로 실행하여 부팅 속도에 영향을 주지 않음
          startAlwaysTracking().catch(err => console.error('Failed to start life-log tracking', err));
        }

        // 3. 플랫폼별 지리 정보 프로바이더 설정
        // 웹에서는 무거운 SQLite 대신 Firestore 프로바이더를 사용합니다.
        if (Platform.OS === 'web') {
          console.log('PPLANER: Initializing Geodata engine with Firestore for Web');
          geodataEngine.setProvider(new FirestoreGeodataProvider(db));
        } else {
          console.log('PPLANER: Initializing Geodata engine with SQLite for Native');
          geodataEngine.setProvider(new SQLiteGeodataProvider());
        }

        await geodataEngine.initialize();
        console.log('PPLANER: Geodata engine initialized successfully');
      } catch (e) {
        console.error('PPLANER: Failed to initialize geodata engine', e);
      }
      
      if (loaded || error) {
        SplashScreen.hideAsync();
      }
    };
    
    init();
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

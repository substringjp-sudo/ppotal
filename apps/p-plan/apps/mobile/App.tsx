import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
// 공용 로직 및 디자인 토큰 임포트
import { DAILY_PLANS_SUB, DESIGN_TOKENS } from '@pplaner/shared';

// 네이티브 서비스 임포트
import { initDatabase } from './src/lib/database';
import { startBackgroundTracking, stopBackgroundTracking } from './src/services/LocationWorker';
import { requestNotificationPermissions } from './src/services/NotificationService';
import { requestPhotoPermissions, pickAndProcessPhoto } from './src/services/PhotoService';
import { useSync } from './src/hooks/useSync';

export default function App() {
  const [activeTripId, setActiveTripId] = useState<string | null>('test-trip-id-123');
  const { isSyncing, lastSyncTime, triggerSync } = useSync(activeTripId);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // 1. 앱 엔진 초기화
    initDatabase();
    
    // 2. 권한 요청
    const setupPermissions = async () => {
      await requestNotificationPermissions();
      await requestPhotoPermissions();
    };
    setupPermissions();
  }, []);

  const handleToggleTracking = async () => {
    try {
      if (isTracking) {
        await stopBackgroundTracking();
        setIsTracking(false);
        Alert.alert('기록 중지', '백그라운드 위치 기록을 중지했습니다.');
      } else if (activeTripId) {
        await startBackgroundTracking(activeTripId);
        setIsTracking(true);
        Alert.alert('기록 시작', '백그라운드 위치 기록을 시작했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', (error as Error).message);
    }
  };

  const handlePickPhoto = async () => {
    if (!activeTripId) return;
    const photo = await pickAndProcessPhoto(activeTripId);
    if (photo) {
      Alert.alert('사진 분석 완료', `시간: ${new Date(photo.timestamp).toLocaleString()}\n위치: ${photo.latitude}, ${photo.longitude}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: DESIGN_TOKENS.colors.slate[50] }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: DESIGN_TOKENS.colors.slate[900] }]}>PPLANER Mobile</Text>
        <Text style={[styles.subtitle, { color: DESIGN_TOKENS.colors.slate[500] }]}>Native Core Live</Text>
        
        <View style={[styles.card, { backgroundColor: '#fff' }]}>
          <Text style={[styles.cardText, { color: DESIGN_TOKENS.colors.primary.DEFAULT }]}>
            Background Tracking: {isTracking ? 'RUNNING' : 'STOPPED'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: isTracking ? DESIGN_TOKENS.colors.danger.DEFAULT : DESIGN_TOKENS.colors.primary.DEFAULT }]}
            onPress={handleToggleTracking}
          >
            <Text style={styles.buttonText}>{isTracking ? '기록 중지' : '위치 기록 시작'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: DESIGN_TOKENS.colors.slate[700], marginTop: 12 }]}
            onPress={handlePickPhoto}
          >
            <Text style={styles.buttonText}>사진 촬영/선택 (EXIF 분석)</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: '#fff', marginTop: 16 }]}>
          <Text style={[styles.cardText, { color: DESIGN_TOKENS.colors.success.DEFAULT }]}>
            Sync Status: {isSyncing ? 'Syncing...' : 'Idle'}
          </Text>
          <Text style={styles.syncInfo}>
            Last Synced: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: DESIGN_TOKENS.colors.success.DEFAULT, marginTop: 12 }]}
            onPress={triggerSync}
          >
            <Text style={styles.buttonText}>지금 동기화</Text>
          </TouchableOpacity>
        </View>

        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  syncInfo: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

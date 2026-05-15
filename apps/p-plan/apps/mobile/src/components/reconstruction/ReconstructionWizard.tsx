import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, createFastTrip } from '@pplaner/shared';
import { autoSyncTripPhotos } from '../../services/PhotoService';

interface ReconstructionWizardProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (tripId: string) => void;
}

export const ReconstructionWizard: React.FC<ReconstructionWizardProps> = ({ visible, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [startDate, setStartDate] = useState('2026-04-01'); // Mock
  const [endDate, setEndDate] = useState('2026-04-05'); // Mock

  const handleStartScan = async () => {
    setIsScanning(true);
    setStep(2);
    
    try {
      // 1. 임시 여행 생성
      const tripId = await createFastTrip('과거 사진 기록', startDate, endDate, {
          isRecordingEnabled: false,
          autoSyncPhotos: true,
          locationIntervals: { high: 0, medium: 0, low: 0 }
      });

      // 2. 사진 스캔 및 등록
      const photoCount = await autoSyncTripPhotos(tripId, startDate, endDate);
      
      setIsScanning(false);
      setStep(3);
      Alert.alert('분석 완료', `${photoCount}개의 사진을 기반으로 동선을 재구성했습니다.`);
      
      // 완료 후 이동은 일단 보류하거나 ID 전달
      onComplete(tripId);
    } catch (error) {
      setIsScanning(false);
      setStep(1);
      Alert.alert('오류', '사진 분석 중 문제가 발생했습니다.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>과거 여행 재구성</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {step === 1 && (
            <View style={styles.stepContent}>
              <Ionicons name="images" size={64} color={DESIGN_TOKENS.colors.primary.DEFAULT} style={styles.icon} />
              <Text style={styles.stepTitle}>사진으로 동선을 찾을까요?</Text>
              <Text style={styles.stepDesc}>
                휴대폰에 저장된 사진의 위치 정보를 분석하여{"\n"}
                그때의 이동 동선과 방문 장소를 자동으로 복원합니다.
              </Text>
              
              <View style={styles.datePickerPlaceholder}>
                  <Text style={styles.dateLabel}>분석할 기간: 2026.04.01 ~ 2026.04.05</Text>
                  <Text style={styles.dateSubText}>* 실제 앱에서는 날짜 선택기가 나타납니다.</Text>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStartScan}>
                <Text style={styles.primaryButtonText}>분석 시작하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.primary.DEFAULT} />
              <Text style={styles.stepTitle}>사진 분석 중...</Text>
              <Text style={styles.stepDesc}>
                메타데이터를 읽어 위치와 시간을 대조하고 있습니다.{"\n"}
                잠시만 기다려 주세요.
              </Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.stepTitle}>재구성 완료!</Text>
              <Text style={styles.stepDesc}>
                사진첩 데이터를 기반으로 새로운 여행 기록이{"\n"}
                생성되었습니다. 계획 탭에서 확인해 보세요.
              </Text>
              
              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDesc: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  datePickerPlaceholder: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: 16,
      borderRadius: 16,
      width: '100%',
      marginBottom: 32,
      alignItems: 'center',
  },
  dateLabel: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
  },
  dateSubText: {
      color: 'rgba(255, 255, 255, 0.3)',
      fontSize: 12,
      marginTop: 4,
  },
  primaryButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  successBadge: {
      marginBottom: 20,
  }
});

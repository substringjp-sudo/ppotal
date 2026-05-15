import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { BlurView } from 'expo-blur';
import MapComponent from '../common/MapComponent';
import * as MediaLibrary from 'expo-media-library';

interface PastTripReconstructionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (title: string, startDate: string, endDate: string, data: any) => void;
}

export const PastTripReconstructionModal: React.FC<PastTripReconstructionModalProps> = ({ 
  visible, 
  onClose, 
  onConfirm
}) => {
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ footprints: any[], photos: any[] } | null>(null);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      Alert.alert('오류', '시작 날짜와 종료 날짜를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

      // 1. 발자취 조회 (SQLite)
      const { getFootprintsInRange } = require('../../lib/database');
      const footprints = await getFootprintsInRange(startTimestamp, endTimestamp);

      // 2. 사진 조회 (MediaLibrary)
      const { status } = await MediaLibrary.requestPermissionsAsync();
      let photos: any[] = [];
      if (status === 'granted') {
        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          createdAfter: startTimestamp,
          createdBefore: endTimestamp,
          sortBy: ['creationTime'],
        });
        
        for (const asset of assets) {
          const info = await MediaLibrary.getAssetInfoAsync(asset);
          if (info.location) {
            photos.push({
              uri: info.localUri || info.uri,
              timestamp: info.creationTime,
              latitude: info.location.latitude,
              longitude: info.location.longitude
            });
          }
        }
      }

      if (footprints.length === 0 && photos.length === 0) {
        Alert.alert('정보 없음', '해당 기간에 저장된 발자취나 사진 정보가 없습니다.');
        setPreviewData(null);
      } else {
        setPreviewData({ footprints, photos });
      }
    } catch (error) {
      console.error('PPLANER: Failed to fetch past data:', error);
      Alert.alert('오류', '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (tripName.trim() && previewData) {
      onConfirm(tripName, startDate, endDate, previewData);
    }
  };

  const allLocations = [
    ...(previewData?.footprints || []).map(f => ({ latitude: f.latitude, longitude: f.longitude })),
    ...(previewData?.photos || []).map(p => ({ latitude: p.latitude, longitude: p.longitude }))
  ].sort((a, b) => (a as any).timestamp - (b as any).timestamp);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>과거 기록 생성</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 이름</Text>
              <TextInput
                style={styles.input}
                value={tripName}
                onChangeText={setTripName}
                placeholder="예: 2024 제주도 가족여행"
                placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={[styles.inputSection, { flex: 1 }]}>
                <Text style={styles.inputLabel}>시작 날짜</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.inputSection, { flex: 1 }]}>
                <Text style={styles.inputLabel}>종료 날짜</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.searchButton, loading && styles.disabledButton]} 
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.searchButtonText}>데이터 분석하기</Text>
                </>
              )}
            </TouchableOpacity>

            {previewData && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>분석 결과 미리보기</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    발자취 {previewData.footprints.length}개, 사진 {previewData.photos.length}장을 찾았습니다.
                  </Text>
                </View>
                
                <View style={styles.mapContainer}>
                  <MapComponent 
                    photoLocations={previewData.photos}
                    path={allLocations}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, (!tripName.trim() || !previewData) && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={!tripName.trim() || !previewData}
            >
              <Text style={styles.confirmText}>기록 생성하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[900],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    backgroundColor: DESIGN_TOKENS.colors.slate[800],
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  previewSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryText: {
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    fontWeight: '600',
    fontSize: 14,
  },
  mapContainer: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[100],
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  confirmButton: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
});

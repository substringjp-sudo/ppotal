import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { BlurView } from 'expo-blur';
import MapComponent from '../common/MapComponent';

const { width } = Dimensions.get('window');

interface PhotoData {
  uri: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

interface PhotoReconstructionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (title: string, photos: PhotoData[]) => void;
  photos: PhotoData[];
}

export const PhotoReconstructionModal: React.FC<PhotoReconstructionModalProps> = ({ 
  visible, 
  onClose, 
  onConfirm,
  photos 
}) => {
  const [tripName, setTripName] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const photoLocations = photos
    .filter(p => p.latitude && p.longitude)
    .map(p => ({ latitude: p.latitude!, longitude: p.longitude! }));

  useEffect(() => {
    if (photos.length > 0) {
      const sorted = [...photos].sort((a, b) => a.timestamp - b.timestamp);
      const start = new Date(sorted[0].timestamp).toLocaleDateString('ko-KR');
      const end = new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString('ko-KR');
      setDateRange({ start, end });
      setTripName(`${start} 여행 기록`);
    }
  }, [photos]);

  const handleConfirm = () => {
    if (tripName.trim()) {
      onConfirm(tripName, photos);
    }
  };

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
            <Text style={styles.title}>사진으로 기록 생성</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 분석 정보 요약 */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Ionicons name="calendar-outline" size={20} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.summaryLabel}>여행 기간</Text>
                  <Text style={styles.summaryValue}>{dateRange.start} ~ {dateRange.end}</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="images-outline" size={20} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.summaryLabel}>선택된 사진</Text>
                  <Text style={styles.summaryValue}>{photos.length}장 ({photoLocations.length}개 위치 정보 포함)</Text>
                </View>
              </View>
            </View>

            {/* 지도 미리보기 */}
            <View style={styles.mapContainer}>
              <MapComponent 
                photoLocations={photoLocations}
                path={photoLocations}
              />
              <View style={styles.mapOverlay}>
                <Text style={styles.mapLabel}>이동 경로 미리보기</Text>
              </View>
            </View>

            {/* 여행 이름 입력 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 이름</Text>
              <TextInput
                style={styles.input}
                value={tripName}
                onChangeText={setTripName}
                placeholder="여행 이름을 입력하세요"
                placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
              />
            </View>

            {/* 사진 미리보기 리스트 */}
            <Text style={styles.sectionTitle}>포함된 사진</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {photos.map((p, idx) => (
                <Image key={idx} source={{ uri: p.uri }} style={styles.previewImage} />
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, !tripName.trim() && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={!tripName.trim()}
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
    height: '85%',
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
  summaryCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 20,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  mapContainer: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[100],
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  inputSection: {
    marginBottom: 24,
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
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[900],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 12,
  },
  photoList: {
    marginBottom: 20,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
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

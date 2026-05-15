import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, TripRecordingSettings } from '@pplaner/shared';

interface FastStartModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (title: string, startDate: string, endDate: string, settings: TripRecordingSettings) => void;
  initialTitle?: string;
}

export const FastStartModal: React.FC<FastStartModalProps> = ({ visible, onClose, onStart, initialTitle }) => {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [isUndecidedEnd, setIsUndecidedEnd] = useState(true);
  const [endDate, setEndDate] = useState(today);
  
  // 배터리 설정 (기본값)
  const [settings, setSettings] = useState<TripRecordingSettings>({
    isRecordingEnabled: true,
    locationIntervals: {
      high: 1 * 60 * 1000,    // 1분 (여행 정밀 기록 기본값)
      medium: 5 * 60 * 1000,  // 5분
      low: 15 * 60 * 1000,    // 15분
    },
    autoSyncPhotos: true,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 모달이 열릴 때마다 상태 초기화 및 기본 제목 설정
  React.useEffect(() => {
    console.log('PPLANER: FastStartModal visible changed:', visible, 'initialTitle:', initialTitle);
    if (visible) {
      setTitle(initialTitle || `즉흥 여행 - ${today}`);
      setIsUndecidedEnd(true);
      setEndDate(today);
      setShowAdvanced(false);
    }
  }, [visible, today, initialTitle]);

  const handleStart = () => {
    onStart(title || `즉흥 여행 - ${today}`, today, isUndecidedEnd ? '' : endDate, settings);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.glassHighlight} />
          <View style={styles.header}>
            <Text style={styles.title}>빠른 여행 시작</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>여행 제목</Text>
              <TextInput
                style={styles.input}
                placeholder="어디로 떠나시나요?"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={DESIGN_TOKENS.colors.slate[300]}
              />
            </View>

            <View style={styles.dateSection}>
              <View style={styles.fixedDateRow}>
                <Ionicons name="calendar-outline" size={18} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                <Text style={styles.fixedDateText}>시작일: {today} (오늘)</Text>
              </View>

              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingTitle}>언제까지 기록할까요?</Text>
                  <Text style={styles.settingDesc}>직접 종료할 때까지 계속 기록합니다.</Text>
                </View>
                <Switch
                  value={isUndecidedEnd}
                  onValueChange={setIsUndecidedEnd}
                  trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                />
              </View>

              {!isUndecidedEnd && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>종료 예정일</Text>
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              )}
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>위치 자동 기록</Text>
                <Text style={styles.settingDesc}>백그라운드에서 동선을 기록합니다.</Text>
              </View>
              <Switch
                value={settings.isRecordingEnabled}
                onValueChange={(val) => setSettings({ ...settings, isRecordingEnabled: val })}
                trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>사진 자동 동기화</Text>
                <Text style={styles.settingDesc}>여행 중 찍은 사진을 등록합니다.</Text>
              </View>
              <Switch
                value={settings.autoSyncPhotos}
                onValueChange={(val) => setSettings({ ...settings, autoSyncPhotos: val })}
                trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
              />
            </View>

            <TouchableOpacity 
                style={styles.advancedToggle} 
                onPress={() => setShowAdvanced(!showAdvanced)}
            >
                <Text style={styles.advancedText}>배터리 최적화 상세 설정</Text>
                <Ionicons 
                    name={showAdvanced ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={DESIGN_TOKENS.colors.primary.DEFAULT} 
                />
            </TouchableOpacity>

            {showAdvanced && (
                <View style={styles.advancedPanel}>
                    <View style={styles.intervalItem}>
                        <Text style={styles.intervalLabel}>배터리 충분 (50% 이상)</Text>
                        <TextInput 
                            style={styles.miniInput} 
                            value={(settings.locationIntervals.high / 60000).toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setSettings({
                                ...settings, 
                                locationIntervals: { ...settings.locationIntervals, high: parseInt(v) * 60000 || 0 }
                            })}
                        />
                        <Text style={styles.unit}>분</Text>
                    </View>
                    <View style={styles.intervalItem}>
                        <Text style={styles.intervalLabel}>배터리 보통 (20-50%)</Text>
                        <TextInput 
                            style={styles.miniInput} 
                            value={(settings.locationIntervals.medium / 60000).toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setSettings({
                                ...settings, 
                                locationIntervals: { ...settings.locationIntervals, medium: parseInt(v) * 60000 || 0 }
                            })}
                        />
                        <Text style={styles.unit}>분</Text>
                    </View>
                    <View style={styles.intervalItem}>
                        <Text style={styles.intervalLabel}>배터리 낮음 (20% 미만)</Text>
                        <TextInput 
                            style={styles.miniInput} 
                            value={(settings.locationIntervals.low / 60000).toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setSettings({
                                ...settings, 
                                locationIntervals: { ...settings.locationIntervals, low: parseInt(v) * 60000 || 0 }
                            })}
                        />
                        <Text style={styles.unit}>분</Text>
                    </View>
                </View>
            )}

            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>기록 시작하기</Text>
            </TouchableOpacity>
          </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 32,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  content: {},
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[800],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  row: {
    flexDirection: 'row',
  },
  dateSection: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  fixedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  fixedDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[50],
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  settingDesc: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  advancedText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  advancedPanel: {
      backgroundColor: DESIGN_TOKENS.colors.slate[50],
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
  },
  intervalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  intervalLabel: {
      flex: 1,
      fontSize: 13,
      color: DESIGN_TOKENS.colors.slate[600],
  },
  miniInput: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: DESIGN_TOKENS.colors.slate[200],
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      width: 50,
      textAlign: 'center',
      fontSize: 14,
  },
  unit: {
      marginLeft: 4,
      fontSize: 13,
      color: DESIGN_TOKENS.colors.slate[400],
  },
  startButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

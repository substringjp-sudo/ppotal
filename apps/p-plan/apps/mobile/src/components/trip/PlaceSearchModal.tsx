import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, TripEvent } from '@pplaner/shared';

interface PlaceSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (event: Partial<TripEvent>) => void;
}

export const PlaceSearchModal: React.FC<PlaceSearchModalProps> = ({ visible, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [memo, setMemo] = useState('');

  const handleAdd = () => {
    if (!title) return;
    onAdd({
      title,
      startTime,
      memo,
      location: {
          name: locationName || title,
          latitude: 0, // 추후 검색 API 연동 시 실제 좌표 적용
          longitude: 0,
      }
    });
    // 초기화
    setTitle('');
    setLocationName('');
    setStartTime('12:00');
    setMemo('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>새로운 장소 추가</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>활동/장소 명칭</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 에펠탑 방문, 점심 식사"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>방문 시간</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="HH:MM"
                        value={startTime}
                        onChangeText={setStartTime}
                    />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={styles.label}>상세 위치 (옵션)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="주소 또는 장소명"
                        value={locationName}
                        onChangeText={setLocationName}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>메모</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="남기고 싶은 간단한 기록"
                multiline
                numberOfLines={3}
                value={memo}
                onChangeText={setMemo}
              />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>타임라인에 추가</Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
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
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[800],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[100],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

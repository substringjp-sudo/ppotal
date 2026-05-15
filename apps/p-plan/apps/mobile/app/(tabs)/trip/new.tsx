import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, createFastTrip, useTripStore } from '@pplaner/shared';
import { Card } from '../../../src/components/common/Card';

export default function NewTripScreen() {
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('');
  const addTrip = useTripStore((state) => state.addTrip);

  const handleCreate = async () => {
    if (!title || !region) {
      if (Platform.OS === 'web') alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const newTrip = createFastTrip(title, region);
      addTrip(newTrip);
      
      if (Platform.OS === 'web') alert('새 여행이 생성되었습니다!');
      router.replace('/(tabs)/trips');
    } catch (error) {
      console.error('Failed to create trip:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={DESIGN_TOKENS.colors.slate[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 여행 계획</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>여행 제목</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 제주도 힐링 여행"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>여행지</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 제주도"
          value={region}
          onChangeText={setRegion}
        />

        <Card variant="glass" style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
          <Text style={styles.infoText}>
            나머지 세부 일정과 날짜는 생성 후 상세 페이지에서 자유롭게 수정할 수 있습니다.
          </Text>
        </Card>

        <TouchableOpacity style={styles.submitButton} onPress={handleCreate}>
          <Text style={styles.submitButtonText}>여행 계획 생성하기</Text>
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[800],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 30,
    gap: 12,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT + '10', // 10% opacity
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

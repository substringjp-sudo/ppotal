import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore } from '@pplaner/shared';
import { RecordHistoryItem } from '../../src/components/history/RecordHistoryItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecordsListScreen() {
  const insets = useSafeAreaInsets();
  const { trips, deleteTrip } = useTripStore();
  
  // 완료된 여행만 필터링
  const finishedTrips = trips
    .filter((t: Trip) => t.status !== 'active')
    .sort((a, b) => new Date(b.dates.startDate).getTime() - new Date(a.dates.startDate).getTime());

  const handleDelete = (id: string) => {
    Alert.alert(
      '기록 삭제',
      '이 여행 기록을 영구적으로 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: async () => {
            await deleteTrip(id);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: '여행 기록 목록',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={DESIGN_TOKENS.colors.slate[900]} />
            </TouchableOpacity>
          ),
        }} 
      />

      <FlatList
        data={finishedTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.title}>나의 모든 발자취</Text>
            <Text style={styles.subtitle}>총 {finishedTrips.length}개의 소중한 추억이 기록되어 있습니다.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RecordHistoryItem
            tripTitle={item.title}
            location={item.locations.regionNames[0] || '탐방지'}
            date={item.dates.startDate}
            points={item.dailyTimeline?.[0]?.events?.length || 0}
            photos={item.photos?.length || 0}
            onPress={() => router.push(`/(tabs)/trip/${item.id}`)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="journal-outline" size={64} color={DESIGN_TOKENS.colors.slate[200]} />
            <Text style={styles.emptyText}>아직 완료된 기록이 없습니다.</Text>
            <Text style={styles.emptySubText}>여행을 마치고 기록을 종료하면 이곳에 나타납니다.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    marginLeft: -10,
    padding: 10,
  },
  listContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.slate[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '500',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 8,
    textAlign: 'center',
  },
});

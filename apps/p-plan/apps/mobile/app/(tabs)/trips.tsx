import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore } from '@pplaner/shared';
import { TripCardShort } from '../../src/components/planner/TripCardShort';
import Animated from 'react-native-reanimated';
import { useLiquidScroll, HEADER_MAX_HEIGHT } from '../../src/hooks/useLiquidScroll';
import { LiquidHeader } from '../../src/components/common/LiquidHeader';

import { useShallow } from 'zustand/react/shallow';

export default function TripsScreen() {
  const { storeTrips, deleteTrip } = useTripStore(useShallow((state) => ({ 
    storeTrips: state.trips,
    deleteTrip: state.deleteTrip 
  })));
  const [refreshing, setRefreshing] = useState(false);
  const { onScroll, headerStyle, titleStyle, glassOpacity } = useLiquidScroll();

  // 오늘 날짜 00:00:00 기준 생성
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 미래의 계획된 여행만 필터링 (시작일이 오늘 이후인 것)
  const plannedTrips = React.useMemo(() => {
    return storeTrips.filter(trip => {
      if (!trip?.dates?.startDate) return false;
      const startDate = new Date(trip.dates.startDate);
      startDate.setHours(0, 0, 0, 0);
      return startDate > today;
    }).sort((a, b) => {
      const dateA = a.dates?.startDate ? new Date(a.dates.startDate).getTime() : 0;
      const dateB = b.dates?.startDate ? new Date(b.dates.startDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [storeTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleTripPress = (tripId: string) => {
    router.push(`/(tabs)/trip/${tripId}`);
  };

  const handleDeleteTrip = (id: string) => {
    Alert.alert(
      '계획 삭제',
      '이 여행 계획을 삭제하시겠습니까?',
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
      <LiquidHeader 
        title="내 여행 계획"
        headerStyle={headerStyle}
        titleStyle={titleStyle}
        glassOpacity={glassOpacity}
        rightComponent={
          <TouchableOpacity onPress={() => router.push('/(tabs)/trip/new')}>
            <Ionicons name="add-circle" size={28} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
          </TouchableOpacity>
        }
      />

      <Animated.FlatList
        data={plannedTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: HEADER_MAX_HEIGHT + 20 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TripCardShort 
            trip={item} 
            onPress={() => handleTripPress(item.id)} 
            onDelete={() => handleDeleteTrip(item.id)}
          />
        )}
        ListHeaderComponent={() => (
            <View style={styles.listHeader}>
                <Text style={styles.countText}>총 {plannedTrips.length}개의 계획된 여행</Text>
            </View>
        )}
        ListFooterComponent={() => <View style={{ height: 160 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="airplane-outline" size={64} color={DESIGN_TOKENS.colors.slate[200]} />
            <Text style={styles.emptyText}>아직 계획된 여행이 없습니다.</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(tabs)/trip/new')}>
              <Text style={styles.createButtonText}>첫 여행 만들기</Text>
            </TouchableOpacity>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/(tabs)/trip/new')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  listHeader: {
      marginBottom: 12,
  },
  countText: {
      fontSize: 14,
      color: DESIGN_TOKENS.colors.slate[500],
      fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[400],
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});

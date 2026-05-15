import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore, DailyPlan, TripEvent, useLocationStore } from '@pplaner/shared';
import { Card } from '../../../src/components/common/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import { useLiquidScroll, HEADER_MAX_HEIGHT } from '../../../src/hooks/useLiquidScroll';
import { LiquidHeader } from '../../../src/components/common/LiquidHeader';
import { PlaceSearchModal } from '../../../src/components/trip/PlaceSearchModal';

export default function TripEditorScreen() {
  const { id } = useLocalSearchParams();
  const { trips, updateTrip, deleteTrip, addEvent } = useTripStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { onScroll, headerStyle, titleStyle, glassOpacity } = useLiquidScroll();
  const insets = useSafeAreaInsets();
  const { activeSession } = useLocationStore();



  useEffect(() => {
    const found = trips.find(t => t.id === id);
    if (found) {
      setTrip(found);
    }
  }, [id, trips]);

  const handleAddEvent = (event: Partial<TripEvent>) => {
    addEvent(selectedDay - 1, event);
    setIsSearchVisible(false);
  };

  const handleSave = async () => {
    if (trip) {
        await updateTrip(trip);
        Alert.alert('저장 완료', '변경사항이 클라우드에 동기화되었습니다.');
        router.back();
    }
  };



  const handleDelete = () => {
    Alert.alert(
      '발자취 삭제',
      '이 발자취 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: async () => {
            if (id) {
              await deleteTrip(id as string);
              router.back();
            }
          }
        }
      ]
    );
  };

  if (!trip) return (
      <View style={styles.loading}>
          <Text>여행 정보를 불러오는 중...</Text>
      </View>
  );

  const currentPlan = trip.dailyTimeline.find(p => p.day === selectedDay);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LiquidHeader 
        title={trip.title}
        headerStyle={headerStyle}
        titleStyle={titleStyle}
        glassOpacity={glassOpacity}
        rightComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={22} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.saveButtonText}>완료</Text>
                </TouchableOpacity>
            </View>
        }
      />

      <Animated.ScrollView 
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.container}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT + 10, paddingBottom: 60 }}
      >
        {/* 날짜 선택 탭 */}
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.daySelector}
            contentContainerStyle={styles.daySelectorContent}
        >
            {trip.dailyTimeline.map((plan) => (
                <TouchableOpacity 
                    key={plan.day} 
                    onPress={() => setSelectedDay(plan.day)}
                    style={[
                        styles.dayTab, 
                        selectedDay === plan.day && styles.activeDayTab
                    ]}
                >
                    <Text style={[
                        styles.dayTabText, 
                        selectedDay === plan.day && styles.activeDayTabText
                    ]}>Day {plan.day}</Text>
                    <Text style={styles.dayDateText}>{plan.date ? plan.date.split('-').slice(1).join('/') : '--/--'}</Text>
                </TouchableOpacity>
            ))}
            {trip.dates?.isUndecided && (
                 <TouchableOpacity style={styles.addDayTab}>
                    <Ionicons name="add" size={20} color={DESIGN_TOKENS.colors.slate[400]} />
                 </TouchableOpacity>
            )}
        </ScrollView>

        <View style={styles.timelineSection}>
            <View style={styles.timelineHeader}>
                <Text style={styles.timelineTitle}>{selectedDay}일차 일정</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsSearchVisible(true)}>
                    <Ionicons name="add-circle" size={20} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                    <Text style={styles.addButtonText}>장소 추가</Text>
                </TouchableOpacity>
            </View>

            {currentPlan?.events && currentPlan.events.length > 0 ? (
                currentPlan.events.map((event, index) => (
                    <Animated.View 
                        key={event.id || index} 
                        entering={FadeInUp.delay(index * 100)}
                        style={styles.eventCardWrapper}
                    >
                        <View style={styles.timelineIndicator}>
                            <View style={styles.timelineDot} />
                            {index !== currentPlan.events.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <Card style={styles.eventCard}>
                            <View style={styles.eventTime}>
                                <Text style={styles.timeText}>{event.startTime || '--:--'}</Text>
                            </View>
                            <View style={styles.eventContent}>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventLocation}>{event.location?.name || '위치 정보 없음'}</Text>
                                {event.memo && <Text style={styles.eventMemo}>{event.memo}</Text>}
                            </View>
                            <TouchableOpacity style={styles.eventEditBtn}>
                                <Ionicons name="ellipsis-vertical" size={18} color={DESIGN_TOKENS.colors.slate[300]} />
                            </TouchableOpacity>
                        </Card>
                    </Animated.View>
                ))
            ) : (
                <View style={styles.emptyTimeline}>
                    <Ionicons name="trail-sign-outline" size={48} color={DESIGN_TOKENS.colors.slate[100]} />
                    <Text style={styles.emptyTimelineText}>아직 등록된 일정이 없습니다.</Text>
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setIsSearchVisible(true)}>
                        <Text style={styles.emptyAddBtnText}>첫 장소 추가하기</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>

        {/* Footer info removed as requested */}
      </Animated.ScrollView>

      <PlaceSearchModal 
        visible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        onAdd={handleAddEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  saveButtonText: {
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    fontWeight: 'bold',
    fontSize: 16,
  },
  daySelector: {
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  daySelectorContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
  },
  dayTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: DESIGN_TOKENS.colors.slate[50],
      alignItems: 'center',
      minWidth: 70,
  },
  activeDayTab: {
      backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  dayTabText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: DESIGN_TOKENS.colors.slate[500],
  },
  activeDayTabText: {
      color: '#fff',
  },
  dayDateText: {
      fontSize: 10,
      color: DESIGN_TOKENS.colors.slate[300],
      marginTop: 2,
  },
  addDayTab: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: DESIGN_TOKENS.colors.slate[50],
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: DESIGN_TOKENS.colors.slate[100],
      borderStyle: 'dashed',
  },
  timelineSection: {
      padding: 20,
  },
  timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  timelineTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: DESIGN_TOKENS.colors.slate[800],
  },
  addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
  },
  addButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  eventCardWrapper: {
      flexDirection: 'row',
      marginBottom: 16,
  },
  timelineIndicator: {
      width: 20,
      alignItems: 'center',
      marginRight: 12,
  },
  timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
      zIndex: 2,
      marginTop: 24,
  },
  timelineLine: {
      position: 'absolute',
      top: 34,
      bottom: -16,
      width: 2,
      backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  eventCard: {
      flex: 1,
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: DESIGN_TOKENS.colors.slate[100],
  },
  eventTime: {
      width: 50,
  },
  timeText: {
      fontSize: 13,
      fontWeight: '700',
      color: DESIGN_TOKENS.colors.slate[400],
  },
  eventContent: {
      flex: 1,
      marginLeft: 12,
  },
  eventTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: DESIGN_TOKENS.colors.slate[800],
  },
  eventLocation: {
      fontSize: 13,
      color: DESIGN_TOKENS.colors.slate[400],
      marginTop: 2,
  },
  eventMemo: {
      fontSize: 12,
      color: DESIGN_TOKENS.colors.slate[300],
      marginTop: 4,
      fontStyle: 'italic',
  },
  eventEditBtn: {
      padding: 4,
  },
  emptyTimeline: {
      alignItems: 'center',
      paddingVertical: 60,
  },
  emptyTimelineText: {
      fontSize: 15,
      color: DESIGN_TOKENS.colors.slate[300],
      marginTop: 12,
      marginBottom: 20,
  },
  emptyAddBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  emptyAddBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: DESIGN_TOKENS.colors.slate[500],
  },
  footerInfo: {
      padding: 20,
  },
  infoCard: {
      padding: 16,
      backgroundColor: DESIGN_TOKENS.colors.slate[50],
  },
  infoRow: {
      flexDirection: 'row',
      gap: 10,
  },
  infoText: {
      flex: 1,
      fontSize: 12,
      color: DESIGN_TOKENS.colors.slate[400],
      lineHeight: 18,
    },
  });

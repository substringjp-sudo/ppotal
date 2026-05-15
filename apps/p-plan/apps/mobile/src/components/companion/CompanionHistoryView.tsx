import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore, useLocationStore } from '@pplaner/shared';
import { useShallow } from 'zustand/react/shallow';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FootprintCalendar } from './FootprintCalendar';

interface CompanionHistoryViewProps {
  onStartInstant: () => void;
  onStartFromPhotos: () => void;
  onStartPast: () => void;
}

export const CompanionHistoryView: React.FC<CompanionHistoryViewProps> = ({ 
  onStartInstant, 
  onStartFromPhotos,
  onStartPast
}) => {
  const router = useRouter();
  const trips = useTripStore(useShallow(state => state.trips));
  const deleteTrip = useTripStore(state => state.deleteTrip);
  const { activeSession } = useLocationStore();
  const [unconvertedFootprints, setUnconvertedFootprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFootprints = async () => {
    try {
      // 최근 3일간의 발자취 조회
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const { getFootprintsInRange } = require('../../lib/database');
      const allRecent = getFootprintsInRange(threeDaysAgo, Date.now());

      // 이미 기록(trip)에 포함된 시간대 필터링 로직 (단순화)
      const unconverted = allRecent.filter((fp: any) => fp.isManual === 1);
      
      setUnconvertedFootprints(unconverted.reverse());
    } catch (error) {
      console.error('PPLANER: Failed to load footprints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFootprints();
  }, [trips]); // trips 변경 시에도 다시 로드하여 동기화 유도

  const handleDeleteFootprint = (id: number) => {
    if (!id) return;
    Alert.alert(
      '발자취 삭제',
      '이 발자취를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            console.log('PPLANER: Deleting footprint', id);
            const { deleteFootprint } = require('../../lib/database');
            deleteFootprint(id);
            setUnconvertedFootprints(prev => prev.filter(fp => fp.id !== id));
          }
        }
      ]
    );
  };

  const handleDeleteTrip = (id: string) => {
    if (!id) return;

    const performDelete = async () => {
      console.log('PPLANER: [CompanionHistoryView] Deleting trip:', id);
      try {
        await deleteTrip(id);
        console.log('PPLANER: [CompanionHistoryView] Trip deleted successfully:', id);
      } catch (error) {
        console.error('PPLANER: [CompanionHistoryView] Failed to delete trip:', error);
        Alert.alert('삭제 오류', '기록을 삭제하는 중 문제가 발생했습니다.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('이 기록을 삭제하시겠습니까?')) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      '기록 삭제',
      '이 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: performDelete
        }
      ]
    );
  };

  const unconvertedTrips = trips.filter(t => t.status === 'active' && t.id !== activeSession?.tripId).sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const finishedTrips = trips.filter(t => t.status === 'finished').sort((a, b) => 
    new Date(b.dates.startDate).getTime() - new Date(a.dates.startDate).getTime()
  );

  const handleAddPress = () => {
    if (Platform.OS === 'web') {
        const choice = window.confirm('즉석 기록을 시작하시겠습니까? (확인: 즉석 기록, 취소: 사진으로 생성)');
        if (choice) onStartInstant();
        else onStartFromPhotos();
        return;
    }

    Alert.alert(
        '새로운 기록 시작',
        '어떤 방식으로 기록을 시작할까요?',
        [
            { text: '취소', style: 'cancel' },
            { text: '즉석 기록 시작', onPress: onStartInstant },
            { text: '사진으로 생성', onPress: onStartFromPhotos },
            { text: '과거 기록 생성', onPress: onStartPast },
        ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>기록</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => {
          console.log('PPLANER: Action card pressed in CompanionHistoryView');
          onStartInstant();
        }}>
          <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="flash" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.actionText}>즉석 기록 시작</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={onStartFromPhotos}>
          <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="images" size={20} color="#DB2777" />
          </View>
          <Text style={styles.actionText}>사진으로 생성</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={onStartPast}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="archive" size={20} color="#0EA5E9" />
          </View>
          <Text style={styles.actionText}>과거 기록 생성</Text>
        </TouchableOpacity>
      </View>

      {/* 미변환 발자취 (Active Trips) 섹션 */}
      <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>미변환 발자취</Text>
            {unconvertedTrips.length > 0 && <Text style={styles.sectionBadge}>{unconvertedTrips.length}</Text>}
          </View>
          {unconvertedTrips.length > 0 ? (
            unconvertedTrips.map((t) => (
              <TouchableOpacity 
                key={t.id} 
                style={styles.footprintCard}
                onPress={() => router.push(`/trip/${t.id}`)}
              >
                <View style={styles.footprintInfo}>
                  <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="footsteps" size={14} color="#3B82F6" />
                  </View>
                  <View style={styles.footprintTexts}>
                    <Text style={styles.footprintTitle}>{t.title}</Text>
                    <Text style={styles.footprintTime}>
                      {t.dates.startDate} · 장소 {t.dailyTimeline?.[0]?.events?.length || 0}개 · 사진 {t.photos?.length || 0}장
                    </Text>
                  </View>
                </View>
                <View style={styles.footprintActions}>
                  <TouchableOpacity 
                    style={styles.convertButton}
                    onPress={() => Alert.alert('여행기 전환', '이 발자취를 정식 여행기로 변환하시겠습니까?')}
                  >
                    <Text style={styles.convertButtonText}>변환</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTrip(t.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>아직 미변환 발자취가 없습니다.</Text>
            </View>
          )}
      </View>

      {/* 수동 기록된 개별 발자취 (Raw Footprints from SQLite) */}
      {unconvertedFootprints.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>수동 위치 기록</Text>
          </View>
          {unconvertedFootprints.slice(0, 5).map((fp, idx) => (
            <TouchableOpacity key={fp.id || idx} style={styles.footprintCard}>
              <View style={styles.footprintInfo}>
                <Ionicons name="location" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
                <View style={styles.footprintTexts}>
                  <Text style={[styles.footprintTitle, { color: DESIGN_TOKENS.colors.slate[600] }]}>{fp.memo || '기록되지 않은 장소'}</Text>
                  <Text style={styles.footprintTime}>
                    {new Date(fp.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteFootprint(fp.id)}
              >
                <Ionicons name="trash-outline" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* 완료된 여행 기록 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나의 여행기록</Text>
        {finishedTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>아직 완료된 기록이 없습니다.</Text>
          </View>
        ) : (
          finishedTrips.map(trip => (
            <TouchableOpacity 
              key={trip.id} 
              style={styles.tripCard}
              onPress={() => router.push(`/trip/${trip.id}`)}
            >
              <View style={styles.tripInfo}>
                <Text style={styles.tripName}>{trip.title}</Text>
                <Text style={styles.tripDate}>{trip.dates.startDate} ~ {trip.dates.endDate}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={DESIGN_TOKENS.colors.slate[300]} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 발자취 달력 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나의 발자취 달력</Text>
        <FootprintCalendar />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  iconCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  sectionBadge: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  footprintCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  footprintInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  footprintTexts: {
    flex: 1,
  },
  footprintTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  footprintTime: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
  convertButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  convertButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  footprintActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    marginRight: -8,
  },
  tripCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  tripDate: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  emptyText: {
    color: DESIGN_TOKENS.colors.slate[400],
    fontSize: 14,
  },
});

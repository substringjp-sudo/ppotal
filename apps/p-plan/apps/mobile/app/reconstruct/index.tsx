import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PanResponder, Animated as RNAnimated, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, processTimelineData, TimelinePoint, Cluster, RawDataPoint, useTripStore, useUserStore } from '@pplaner/shared';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 3; // 3 screens wide for detail

export default function ReconstructionPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { trips, addTrip } = useTripStore();
  const user = useUserStore((state: any) => state.profile);
  const { sourceData, title: storeTitle, startDate: storeStart, endDate: storeEnd, clear: clearStore } = useReconstructionStore();

  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<{ points: TimelinePoint[], clusters: Cluster[] }>({ points: [], clusters: [] });
  const [selectedRange, setSelectedRange] = useState<{ start: number, end: number } | null>(null);
  const [inferredTitle, setInferredTitle] = useState('');

  // 1. Data Loading
  useEffect(() => {
    const loadData = async () => {
      try {
        let rawPoints: RawDataPoint[] = [];

        if (sourceData.length > 0) {
          rawPoints = sourceData;
          setInferredTitle(storeTitle);
        } else {
          const { date } = params;
          const targetDate = date ? new Date(date as string) : new Date();
          targetDate.setHours(0, 0, 0, 0);
          const startTime = targetDate.getTime();
          const endTime = startTime + (24 * 60 * 60 * 1000);

          // Fetch footprints from SQLite
          const { getFootprintsInRange } = require('../../src/lib/database');
          const footprints = getFootprintsInRange(startTime, endTime);
          
          rawPoints = footprints.map((fp: any) => ({
            id: `fp-${fp.id}`,
            lat: fp.latitude,
            lng: fp.longitude,
            timestamp: fp.timestamp,
            type: 'footprint',
            memo: fp.memo
          }));

          // Add photos from existing trips if any
          trips.forEach(trip => {
            if (trip.photos) {
              trip.photos.forEach(photo => {
                if (photo.timestamp >= startTime && photo.timestamp <= endTime) {
                  rawPoints.push({
                    id: `photo-${photo.timestamp}`,
                    lat: photo.latitude || 0,
                    lng: photo.longitude || 0,
                    timestamp: photo.timestamp,
                    type: 'photo',
                  });
                }
              });
            }
          });
          
          setInferredTitle(params.title as string || '기록 생성');
        }

        const processed = processTimelineData(rawPoints);
        
        // Enhance cluster titles with reverse geocoding
        const { reverseGeocodeNames } = require('@pplaner/shared');
        for (const cluster of processed.clusters) {
          if (cluster.type === 'stay') {
            try {
              const names = await reverseGeocodeNames(cluster.centerLat, cluster.centerLng);
              cluster.suggestedTitle = names.city || names.prefecture || '방문 장소';
            } catch (e) {
              console.warn('Reverse geocoding failed for cluster:', e);
            }
          }
        }

        setTimelineData(processed);
        
        if (processed.clusters.length > 0) {
          // Default selection to first stay cluster
          const firstStay = processed.clusters.find(c => c.type === 'stay') || processed.clusters[0];
          setSelectedRange({ start: firstStay.startTime, end: firstStay.endTime });
        }
      } catch (e) {
        console.error('Failed to load reconstruction data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    return () => clearStore();
  }, [params.date, sourceData]);

  // 2. Timeline Logic
  const timeBounds = useMemo(() => {
    if (timelineData.points.length === 0) return { min: 0, max: 0 };
    return {
      min: timelineData.points[0].timestamp,
      max: timelineData.points[timelineData.points.length - 1].timestamp
    };
  }, [timelineData]);

  const getTimeX = (timestamp: number) => {
    if (timeBounds.max === timeBounds.min) return 0;
    return ((timestamp - timeBounds.min) / (timeBounds.max - timeBounds.min)) * (SLIDER_WIDTH - 100) + 50;
  };

  const handleClusterSelect = (cluster: Cluster) => {
    setSelectedRange({ start: cluster.startTime, end: cluster.endTime });
    setInferredTitle(cluster.suggestedTitle);
  };

  const handleCreateEvent = async () => {
    if (!selectedRange || !timelineData.points.length) return;
    
    const userId = user?.userId || 'GUEST_USER';
    const userName = user?.displayName || '게스트';

    try {
      // 1. Filter points in range
      const selectedPoints = timelineData.points.filter(p => 
        p.timestamp >= selectedRange.start && p.timestamp <= selectedRange.end
      );

      const photos = selectedPoints.filter(p => p.type === 'photo').map(p => ({
        uri: (p as any).url || '',
        timestamp: p.timestamp,
        latitude: p.lat,
        longitude: p.lng
      }));

      const footprints = selectedPoints.filter(p => p.type === 'footprint').map(p => ({
        latitude: p.lat,
        longitude: p.lng,
        timestamp: p.timestamp,
        memo: p.memo
      }));

      const newTrip = await reconstructTripFromHistory(
        userId, 
        userName, 
        inferredTitle || '새로운 여행', 
        photos, 
        footprints
      );

      Alert.alert('완료', `'${newTrip.title}' 기록이 생성되었습니다.`, [
        { text: '확인', onPress: () => router.push('/(tabs)/trips') }
      ]);
    } catch (e) {
      console.error('Failed to create trip:', e);
      Alert.alert('오류', '일정을 생성하지 못했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: '스마트 일정 생성',
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[900]} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>발자취를 일정으로</Text>
          <Text style={styles.heroSubtitle}>수집된 데이터를 기반으로 최적의 경로를 분석했습니다.</Text>
        </View>

        {/* Timeline Slider Section */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Ionicons name="time-outline" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            <Text style={styles.sliderHeaderText}>시간 흐름 (좌우로 스크롤)</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sliderScrollContent}
          >
            <View style={styles.timelineTrack}>
              <View style={styles.baseLine} />
              
              {timelineData.points.map((p, idx) => (
                <View 
                  key={p.id} 
                  style={[
                    styles.pointDot, 
                    { 
                      left: getTimeX(p.timestamp),
                      backgroundColor: p.color,
                      height: p.type === 'photo' ? 14 : 8,
                      width: p.type === 'photo' ? 14 : 8,
                      borderRadius: p.type === 'photo' ? 7 : 4,
                      zIndex: p.type === 'photo' ? 10 : 5,
                      borderWidth: p.type === 'photo' ? 2 : 0,
                      borderColor: '#fff'
                    }
                  ]}
                />
              ))}

              {/* Selection Range Overlay */}
              {selectedRange && (
                <View 
                  style={[
                    styles.selectionOverlay,
                    {
                      left: getTimeX(selectedRange.start),
                      width: getTimeX(selectedRange.end) - getTimeX(selectedRange.start)
                    }
                  ]}
                >
                  <View style={styles.selectionHandleLeft} />
                  <View style={styles.selectionHandleRight} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Inferred Clusters List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionLabel}>분석된 방문 장소</Text>
          <ScrollView style={styles.clusterList} showsVerticalScrollIndicator={false}>
            {timelineData.clusters.map((cluster, idx) => (
              <TouchableOpacity 
                key={cluster.id} 
                style={[
                  styles.clusterCard,
                  selectedRange?.start === cluster.startTime && styles.selectedClusterCard
                ]}
                onPress={() => handleClusterSelect(cluster)}
              >
                <View style={[styles.clusterIcon, { backgroundColor: cluster.type === 'stay' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)' }]}>
                  <Ionicons 
                    name={cluster.type === 'stay' ? 'location' : 'navigate'} 
                    size={20} 
                    color={cluster.type === 'stay' ? '#3B82F6' : '#F97316'} 
                  />
                </View>
                <View style={styles.clusterInfo}>
                  <Text style={styles.clusterTitle}>{cluster.suggestedTitle}</Text>
                  <Text style={styles.clusterTime}>
                    {new Date(cluster.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(cluster.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {` (${Math.round((cluster.endTime - cluster.startTime) / 60000)}분)`}
                  </Text>
                </View>
                {cluster.points.some(p => p.type === 'photo') && (
                  <View style={styles.photoBadge}>
                    <Ionicons name="image" size={12} color="#fff" />
                    <Text style={styles.photoBadgeText}>{cluster.points.filter(p => p.type === 'photo').length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Bottom Action Bar */}
      <BlurView intensity={90} style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.bottomContent}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionTitleLabel}>선택된 범위</Text>
            <Text style={styles.selectionValue}>
              {selectedRange ? `${new Date(selectedRange.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ~ ${new Date(selectedRange.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '범위를 선택하세요'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.createButton, !selectedRange && styles.disabledButton]}
            onPress={handleCreateEvent}
            disabled={!selectedRange}
          >
            <Text style={styles.createButtonText}>일정 생성</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 22,
  },
  sliderContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 40,
  },
  sliderHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  sliderScrollContent: {
    paddingVertical: 20,
  },
  timelineTrack: {
    width: SLIDER_WIDTH,
    height: 60,
    justifyContent: 'center',
  },
  baseLine: {
    height: 4,
    backgroundColor: '#F1F5F9',
    width: '100%',
    borderRadius: 2,
  },
  pointDot: {
    position: 'absolute',
    top: '50%',
    marginTop: -4,
  },
  selectionOverlay: {
    position: 'absolute',
    height: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
  },
  selectionHandleLeft: {
    position: 'absolute',
    left: -6,
    top: '50%',
    marginTop: -10,
    width: 12,
    height: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  selectionHandleRight: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -10,
    width: 12,
    height: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  listSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 16,
  },
  clusterList: {
    flex: 1,
  },
  clusterCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  selectedClusterCard: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  clusterIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clusterInfo: {
    flex: 1,
  },
  clusterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 4,
  },
  clusterTime: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  photoBadge: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  bottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTitleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  createButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  disabledButton: {
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

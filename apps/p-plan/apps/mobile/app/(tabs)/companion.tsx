import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore, useUserStore, useLocationStore } from '@pplaner/shared';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { stopBackgroundTracking } from '../../src/services/LocationWorker';
import { pickAndProcessPhoto, pickMultiplePhotosAndProcess } from '../../src/services/PhotoService';
import MapComponent from '../../src/components/common/MapComponent';
import { CompanionHistoryView } from '../../src/components/companion/CompanionHistoryView';
import { FastStartModal } from '../../src/components/home/FastStartModal';
import { QuickMemoModal } from '../../src/components/companion/QuickMemoModal';
import { PhotoReconstructionModal } from '../../src/components/companion/PhotoReconstructionModal';
import { PastTripReconstructionModal } from '../../src/components/companion/PastTripReconstructionModal';
import { createFastTrip, reconstructTripFromHistory, TripRecordingSettings, useReconstructionStore, RawDataPoint } from '@pplaner/shared';

export default function CompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, finishTrip, addTimelineEvent } = useTripStore();
  const { reverseGeocodeNames } = require('@pplaner/shared');
  const user = useUserStore((state: any) => state.profile);
  
  const { activeSession, startRecordingSession, stopRecordingSession } = useLocationStore();
  const [viewMode, setViewMode] = useState<'map' | 'timeline'>('map');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [distance, setDistance] = useState(4.2);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isFastStartModalVisible, setIsFastStartModalVisible] = useState(false);
  const [isQuickMemoModalVisible, setIsQuickMemoModalVisible] = useState(false);
  const [isPlaceModalVisible, setIsPlaceModalVisible] = useState(false);
  const [suggestedPlaceName, setSuggestedPlaceName] = useState('');
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isPastModalVisible, setIsPastModalVisible] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isRecording = activeSession?.isActive === true;
  
  // 현재 진행 중인 여행 찾기 (세션 우선 -> 오늘 날짜 활성 여행 순)
  const today = new Date().toISOString().split('T')[0];
  const activeTrip = trips.find(t => t.id === activeSession?.tripId) || 
                   trips.find((t: Trip) => t.status === 'active' || (t.dates?.startDate <= today && t.dates?.endDate >= today));

  useEffect(() => {
    let watchId: any;
    let subscription: any;

    const startWatching = async () => {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const location = {
                coords: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                },
                timestamp: pos.timestamp,
              };
              setCurrentLocation(location);
              setDistance(prev => prev + 0.0001); // 테스트용 미세 증가
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
          );
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (location) => {
          setCurrentLocation(location);
          setDistance(prev => prev + 0.01);
        }
      );
    };

    if (activeTrip && isRecording) {
      startWatching();
    }

    return () => {
      if (Platform.OS === 'web') {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      } else {
        subscription?.remove();
      }
    };
  }, [activeTrip, isRecording]);

  const handleStartInstant = async () => {
    console.log('PPLANER: handleStartInstant called in companion.tsx');
    console.log('PPLANER: Setting FastStartModal visible to true');
    setIsFastStartModalVisible(true);
  };

  const handleFastStart = async (title: string, startDate: string, endDate: string, settings: TripRecordingSettings) => {
    const userId = user?.userId || 'GUEST_USER';
    const userName = user?.displayName || '게스트';

    try {
      const newTrip = await createFastTrip(userId, userName, title, startDate, endDate, settings);
      setIsFastStartModalVisible(false);
      
      if (settings.isRecordingEnabled) {
        startRecordingSession(newTrip.id);
        if (Platform.OS !== 'web') {
          const { startBackgroundTracking } = require('../../src/services/LocationWorker');
          await startBackgroundTracking(newTrip.id);
        }
      }

      showToast(`'${newTrip.title}' 기록을 시작했습니다!`);
    } catch (error) {
      console.error('PPLANER: Error in handleFastStart:', error);
      Alert.alert('오류', '여행 생성을 완료할 수 없습니다.');
    }
  };

  const handleStartFromPhotos = async () => {
    try {
      const photos = await pickMultiplePhotosAndProcess();
      if (photos && photos.length > 0) {
        setSelectedPhotos(photos);
        setIsPhotoModalVisible(true);
      }
    } catch (error: any) {
      console.error('PPLANER: Photo selection error:', error);
      Alert.alert('오류', error.message || '사진을 가져올 수 없습니다.');
    }
  };

  const handlePhotoReconstructionConfirm = async (title: string, photos: any[]) => {
    setIsPhotoModalVisible(false);
    
    const rawPoints: RawDataPoint[] = photos.map(p => ({
      id: `photo-${p.timestamp}`,
      lat: p.latitude || 0,
      lng: p.longitude || 0,
      timestamp: p.timestamp,
      type: 'photo',
      url: p.uri
    }));

    const dateStr = photos.length > 0 ? new Date(photos[0].timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    useReconstructionStore.getState().setData({
      sourceData: rawPoints,
      title: title || '사진으로 만든 여행',
      startDate: dateStr,
      endDate: dateStr
    });

    router.push('/reconstruct');
  };

  const handlePastTripConfirm = async (title: string, startDate: string, endDate: string, data: any) => {
    setIsPastModalVisible(false);

    const rawPoints: RawDataPoint[] = [
      ...(data.photos || []).map((p: any) => ({
        id: `photo-${p.timestamp}`,
        lat: p.latitude || 0,
        lng: p.longitude || 0,
        timestamp: p.timestamp,
        type: 'photo',
        url: p.uri
      })),
      ...(data.footprints || []).map((f: any) => ({
        id: `fp-${f.timestamp}`,
        lat: f.latitude,
        lng: f.longitude,
        timestamp: f.timestamp,
        type: 'footprint',
        memo: f.memo
      }))
    ];

    useReconstructionStore.getState().setData({
      sourceData: rawPoints,
      title: title || '과거 기록 여행',
      startDate,
      endDate
    });

    router.push('/reconstruct');
  };

  if (!isRecording) {
    return (
      <View style={styles.container}>
        <CompanionHistoryView 
          onStartInstant={handleStartInstant}
          onStartFromPhotos={handleStartFromPhotos}
          onStartPast={() => setIsPastModalVisible(true)}
        />
        <FastStartModal 
          visible={isFastStartModalVisible}
          onClose={() => setIsFastStartModalVisible(false)}
          onStart={handleFastStart}
        />
        <PhotoReconstructionModal
          visible={isPhotoModalVisible}
          photos={selectedPhotos}
          onClose={() => setIsPhotoModalVisible(false)}
          onConfirm={handlePhotoReconstructionConfirm}
        />
        <PastTripReconstructionModal
          visible={isPastModalVisible}
          onClose={() => setIsPastModalVisible(false)}
          onConfirm={handlePastTripConfirm}
        />
      </View>
    );
  }

  // 여기서부터는 isRecording === true 인 경우
  if (!activeTrip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={64} color={DESIGN_TOKENS.colors.slate[200]} />
          <Text style={styles.emptyTitle}>활성 여행을 찾을 수 없습니다</Text>
          <Text style={styles.emptyDesc}>
            기록 세션은 시작되었으나 연관된 여행 정보가 없습니다.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={async () => {
              stopRecordingSession();
              if (Platform.OS !== 'web') await stopBackgroundTracking();
              showToast('기록 세션이 종료되었습니다.');
            }}
          >
             <Text style={styles.emptyButtonText}>세션 종료</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  const handleTakePhoto = async () => {
    try {
      if (activeTrip) {
        const result = await pickAndProcessPhoto(activeTrip.id);
        if (result) {
          showToast('사진 저장 완료! 여행 기록에 추가되었습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      showToast('사진을 가져오는 데 실패했습니다.');
    }
  };


  const handleFocusLocation = () => {
    if (currentLocation && activeTrip) {
      const { latitude, longitude } = currentLocation.coords;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      addTimelineEvent(activeTrip.id, today, {
        type: 'sightseeing',
        title: '위치 기록됨',
        memo: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        startTime: timeStr,
      });

      showToast(`위치 고정: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } else {
      showToast('위치 정보를 수신 중입니다...');
    }
  };

  const handleLocationLongPress = async () => {
    if (!currentLocation || !activeTrip) {
      showToast('위치 정보를 확인 중입니다...');
      return;
    }

    // 현재 좌표로 장소 이름 유추 (Reverse Geocoding)
    let suggestedName = '현재 위치';
    try {
      const names = await reverseGeocodeNames(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
      if (names.city) suggestedName = names.city;
      else if (names.prefecture) suggestedName = names.prefecture;
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }

    setSuggestedPlaceName(suggestedName);
    setIsPlaceModalVisible(true);
  };

  const saveNamedPlace = (name: string) => {
    if (!activeTrip || !currentLocation) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. 여행 타임라인에 즉시 추가
    addTimelineEvent(activeTrip.id, today, {
      type: 'sightseeing',
      title: name,
      memo: `위치: ${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`,
      startTime: timeStr,
    });

    // 2. 전역 발자취 히스토리에도 수동 기록으로 저장
    const { saveFootprint } = require('../../src/lib/database');
    saveFootprint({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      accuracy: currentLocation.coords.accuracy,
      timestamp: now.getTime(),
      isManual: 1,
      memo: name,
    });

    showToast(`장소가 저장되었습니다: ${name}`);
  };

  const handleQuickMemo = () => {
    setIsQuickMemoModalVisible(true);
  };

  const saveMemo = (text: string) => {
    if (!text.trim() || !activeTrip) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. 여행 타임라인에 즉시 추가
    addTimelineEvent(activeTrip.id, today, {
      type: 'other',
      title: '메모 남김',
      memo: text,
      startTime: timeStr,
    });

    // 2. 현재 위치가 있으면 전역 발자취에도 저장
    if (currentLocation) {
      const { saveFootprint } = require('../../src/lib/database');
      saveFootprint({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: now.getTime(),
        isManual: 1,
        memo: text,
      });
    }

    showToast(`메모가 추가되었습니다: ${text.substring(0, 10)}${text.length > 10 ? '...' : ''}`);
  };

  const handleToggleSession = async () => {
    console.log('PPLANER: handleToggleSession called. isRecording:', isRecording, 'activeTrip:', activeTrip?.id);

    if (isRecording) {
      const stopSession = async (convert: boolean = false) => {
        console.log('PPLANER: Executing stopSession. Convert:', convert);
        const startTime = activeSession?.startTime;
        const now = new Date();
        
        // 1. 최소 기록 조건 체크 (5분 미만 && 데이터 없음)
        if (startTime) {
          const durationMs = now.getTime() - new Date(startTime).getTime();
          const isTooShort = durationMs < 5 * 60 * 1000;
          const hasEvents = (activeTrip?.dailyTimeline?.[0]?.events?.length || 0) > 0;
          
          if (isTooShort && !hasEvents) {
            // 위치 데이터가 실제로 있는지 확인
            const { getFootprintsInRange } = require('../../src/lib/database');
            const footprints = getFootprintsInRange(new Date(startTime).getTime(), now.getTime());
            
            if (footprints.length === 0) {
              const msg = '기록이 너무 짧거나(5분 이하) 그 사이에 촬영된 사진도 없고 기록된 위치도 없으면 데이터가 없어서 저장되지 않습니다.';
              if (Platform.OS === 'web') {
                window.alert(msg);
              } else {
                Alert.alert('저장할 데이터 없음', msg);
              }
              // 세션 종료 및 관련 트립 정리 (미변환 발자취로 남지 않게 status 변경 등 필요할 수 있음)
              // 여기서는 일단 사용자 요청대로 알림 후 세션 종료
              stopRecordingSession();
              if (Platform.OS !== 'web') await stopBackgroundTracking();
              return;
            }
          }
        }

        // 2. 스토어 상태 변경
        stopRecordingSession();
        
        // 3. 백그라운드 태스크 중지 (네이티브)
        if (Platform.OS !== 'web') {
          await stopBackgroundTracking();
        }
        
        // 4. 변환 로직 (필요시)
        if (convert && startTime && activeTrip) {
          const startTs = new Date(startTime).getTime();
          const endTs = now.getTime();
          const { getFootprintsInRange } = require('../../src/lib/database');
          const footprints = getFootprintsInRange(startTs, endTs);
          
          if (footprints.length > 0) {
            showToast(`${footprints.length}개의 발자취를 타임라인으로 변환합니다.`);
            footprints.forEach((fp: any) => {
              if (fp.isManual) {
                  addTimelineEvent(activeTrip.id, today, {
                      type: 'sightseeing',
                      title: fp.memo || '방문 장소',
                      startTime: new Date(fp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  });
              }
            });
          }
        }
        
        showToast('여행 기록을 종료했습니다.');
      };

      if (Platform.OS === 'web') {
        if (window.confirm('현재 여행 기록 세션을 종료하시겠습니까?')) {
          await stopSession(false);
        }
        return;
      }

      Alert.alert(
        '여행 기록 중단',
        '현재 세션을 중단하시겠습니까?',
        [
          { text: '계속하기', style: 'cancel' },
          { 
            text: '중단 및 변환', 
            onPress: () => stopSession(true)
          },
          { 
            text: '그냥 중단', 
            style: 'destructive',
            onPress: () => stopSession(false)
          }
        ]
      );
    } else {
      if (!activeTrip) {
        showToast('기록을 시작할 여행이 선택되지 않았습니다.');
        return;
      }
      console.log('PPLANER: Starting session');
      startRecordingSession(activeTrip.id);
      if (Platform.OS !== 'web') {
        const { startBackgroundTracking } = require('../../src/services/LocationWorker');
        await startBackgroundTracking(activeTrip.id);
      }
      showToast('고해상도 여행 기록을 시작합니다.');
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sightseeing': return '#2563EB';
      case 'food': return '#10B981';
      case 'transport': return '#6366F1';
      case 'accommodation': return '#8B5CF6';
      case 'shopping': return '#EC4899';
      default: return DESIGN_TOKENS.colors.slate[500];
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case 'sightseeing': return '#DBEAFE';
      case 'food': return '#D1FAE5';
      case 'transport': return '#E0E7FF';
      case 'accommodation': return '#EDE9FE';
      case 'shopping': return '#FCE7F3';
      default: return DESIGN_TOKENS.colors.slate[100];
    }
  };

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'sightseeing': return '장소 방문';
      case 'food': return '식사';
      case 'transport': return '이동';
      case 'accommodation': return '숙소';
      case 'shopping': return '쇼핑';
      default: return '기록';
    }
  };

  return (
    <View style={styles.container}>
      {/* 실제 지도 배경 */}
      <View style={styles.mapContainer}>
          <MapComponent currentLocation={currentLocation} />
          
          {currentLocation && (
              <View style={styles.coordinatesOverlay}>
                  <Text style={styles.coordText}>LAT: {currentLocation.coords.latitude.toFixed(6)}</Text>
                  <Text style={styles.coordText}>LNG: {currentLocation.coords.longitude.toFixed(6)}</Text>
                  <Text style={styles.coordAccuracy}>정확도: {currentLocation.coords.accuracy?.toFixed(1)}m</Text>
              </View>
          )}
      </View>

      {/* 상단 오버레이 정보 */}
      <BlurView intensity={80} tint="light" style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.tripTitle}>{activeTrip.title}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.dot, { backgroundColor: isRecording ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.statusText}>{isRecording ? '실시간 기록 중' : '기록 일시 중지'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]} 
            onPress={handleToggleSession}
          >
            <Text style={[styles.closeButtonText, { color: isRecording ? '#EF4444' : '#10B981' }]}>
              {isRecording ? '기록 종료' : '기록 시작'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, viewMode === 'map' && styles.activeTab]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={18} color={viewMode === 'map' ? '#fff' : DESIGN_TOKENS.colors.slate[400]} />
            <Text style={[styles.tabText, viewMode === 'map' && styles.activeTabText]}>지도로 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, viewMode === 'timeline' && styles.activeTab]}
            onPress={() => setViewMode('timeline')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'timeline' ? '#fff' : DESIGN_TOKENS.colors.slate[400]} />
            <Text style={[styles.tabText, viewMode === 'timeline' && styles.activeTabText]}>타임라인으로 보기</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* 메인 콘텐츠 영역: 타임라인 모드일 때 전체 화면 차지 */}
      {viewMode === 'timeline' && (
        <View style={[styles.mainTimelineContainer]}>
          <ScrollView 
            style={styles.fullTimeline}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingHorizontal: 20, 
              paddingTop: insets.top + 160, 
              paddingBottom: insets.bottom + 150 
            }}
          >
            {(() => {
              const currentDayTimeline = activeTrip.dailyTimeline?.find((d: any) => d.date === today) || activeTrip.dailyTimeline?.[0];
              const events = currentDayTimeline?.events || [];
              const photos = activeTrip.photos || [];
              
              // 이벤트와 사진을 하나의 리스트로 합치고 시간순 정렬
              const combinedTimeline = [
                // 기본 시작 지점 추가 (데이터가 없어도 보이게)
                { id: 'start', type: 'sightseeing', title: '여행 기록 시작', startTime: '오후 02:30', timelineType: 'event' },
                ...events.map((e: any) => ({ ...e, timelineType: 'event' })),
                ...photos.map((p: any, idx: number) => ({ 
                  id: `photo-${idx}`, 
                  type: 'photo', 
                  title: '사진 촬영', 
                  startTime: p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '방금 전',
                  timelineType: 'photo' 
                }))
              ].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

              return combinedTimeline.map((item: any, index: number) => (
                <View key={item.id} style={styles.timelineEntry}>
                  {index < combinedTimeline.length - 1 && <View style={styles.timelineConnector} />}
                  <View style={[styles.timelineDot, { backgroundColor: getEventColor(item.type) }]} />
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <View style={[styles.chip, { backgroundColor: getEventBgColor(item.type) }]}>
                        <Text style={[styles.chipText, { color: getEventColor(item.type) }]}>
                          {item.timelineType === 'photo' ? '사진' : getEventTypeText(item.type)}
                        </Text>
                      </View>
                      <Text style={styles.timelineEntryTime}>{item.startTime || '기록 중'}</Text>
                    </View>
                    <Text style={styles.timelineEntryTitle}>{item.title}</Text>
                    {item.memo && <Text style={styles.timelineEntryMemo}>{item.memo}</Text>}
                  </View>
                </View>
              ));
            })()}
          </ScrollView>
        </View>
      )}

      {/* 하단 인터랙션 패널 */}
      <Animated.View 
        entering={SlideInDown.springify().damping(15)} 
        style={[styles.bottomPanel, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.statGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>오늘 이동(km)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeTrip.dailyTimeline?.[0]?.events?.length || 0}</Text>
            <Text style={styles.statLabel}>방문 장소</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeTrip.photos?.length || 0}</Text>
            <Text style={styles.statLabel}>수집된 사진</Text>
          </View>
        </View>


        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.mainActionButton}
            onPress={handleTakePhoto}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={styles.mainActionText}>사진 찍기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.subActionButton, { backgroundColor: '#F1F5F9' }]}
            onPress={handleFocusLocation}
            onLongPress={handleLocationLongPress}
            delayLongPress={500}
          >
            <Ionicons name="location" size={24} color={DESIGN_TOKENS.colors.slate[600]} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.subActionButton, { backgroundColor: '#F1F5F9' }]}
            onPress={handleQuickMemo}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={DESIGN_TOKENS.colors.slate[600]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 토스트 알림 */}
      {toastMessage && (
        <Animated.View 
          entering={FadeIn.duration(200)} 
          style={[styles.toast, { bottom: insets.bottom + 180 }]}
        >
          <BlurView intensity={90} tint="dark" style={styles.toastBlur}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </BlurView>
        </Animated.View>
      )}

      {/* 빠른 메모 모달 */}
      <QuickMemoModal
        visible={isQuickMemoModalVisible}
        onClose={() => setIsQuickMemoModalVisible(false)}
        onSave={saveMemo}
      />

      <QuickMemoModal
        visible={isPlaceModalVisible}
        onClose={() => setIsPlaceModalVisible(false)}
        onSave={saveNamedPlace}
        initialValue={suggestedPlaceName}
        title="장소 이름 입력"
        placeholder="예: 에펠탑, 맛집 등"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: 'center',
    lineHeight: 22,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
  mainTimelineContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 5,
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  coordinatesOverlay: {
    position: 'absolute',
    top: 140, // Header 아래
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'flex-end',
    zIndex: 5,
  },
  coordText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  coordAccuracy: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    fontWeight: '600',
    marginTop: 4,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    shadowColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  activeTabText: {
    color: '#fff',
  },
  contentArea: {
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  fullTimeline: {
    height: 300,
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 7.5,
    top: 20,
    bottom: -20,
    width: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    zIndex: 0,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 1,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineEntryTime: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '500',
  },
  timelineEntryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toastBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    overflow: 'hidden',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  statLabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainActionButton: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mainActionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  subActionButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTimelineContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTimelineText: {
    color: DESIGN_TOKENS.colors.slate[600],
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyTimelineSubText: {
    color: DESIGN_TOKENS.colors.slate[400],
    fontSize: 14,
    marginTop: 4,
  },
  timelineEntryMemo: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 4,
    fontStyle: 'italic',
  },
});

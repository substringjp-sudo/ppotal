import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore, useUserStore, createInstantTrip, createFastTrip, TripRecordingSettings, useLocationStore, useWizardStore } from '@pplaner/shared';
import { ActiveStatus } from '../../src/components/companion/ActiveStatus';
import { NextEventCard } from '../../src/components/companion/NextEventCard';
import { RecordHistoryItem } from '../../src/components/history/RecordHistoryItem';
import { startBackgroundTracking, stopBackgroundTracking } from '../../src/services/LocationWorker';
import { pickAndProcessPhoto, autoSyncTripPhotos } from '../../src/services/PhotoService';
import { FastStartModal } from '../../src/components/home/FastStartModal';
import { ReconstructionWizard } from '../../src/components/reconstruction/ReconstructionWizard';
import { useSync } from '../../src/hooks/useSync';
import { useFirebaseSync } from '../../src/hooks/useFirebaseSync';
import { initDatabase } from '../../src/lib/database';
import { Card } from '../../src/components/common/Card';

import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLiquidScroll, HEADER_MAX_HEIGHT } from '../../src/hooks/useLiquidScroll';
import { LiquidHeader } from '../../src/components/common/LiquidHeader';
import { useRouter } from 'expo-router';
import MapView, { Marker } from '../../src/components/common/MapView';

export default function HomeScreens() {
  const router = useRouter();
  // 1. 데이터 레이어 연동
  const { trips, setTrips } = useTripStore();
  const user = useUserStore((state: any) => state.profile);
  const { onScroll, headerStyle, titleStyle, glassOpacity } = useLiquidScroll();
  useFirebaseSync(); // 실시간 동기화 시작
  
  const { activeSession, startRecordingSession, stopRecordingSession } = useLocationStore();
  const isTracking = activeSession?.isActive === true;
  const [refreshing, setRefreshing] = useState(false);
  const [isFastStartModalVisible, setIsFastStartModalVisible] = useState(false);
  const [modalInitialTitle, setModalInitialTitle] = useState<string | undefined>(undefined);
  const [isWizardVisible, setIsWizardVisible] = useState(false);

  // 2. 데이터 및 상태 분류 로직
  const today = new Date().toISOString().split('T')[0];
  
  // 2.1 현재 기록 중인 여행 (Priority 1)
  const recordingTrip = useMemo(() => {
    if (!activeSession?.isActive) return null;
    return trips.find(t => t.id === activeSession.tripId) || null;
  }, [trips, activeSession]);

  // 2.2 오늘 시작 예정인 여행 (Priority 2)
  const todayTrip = useMemo(() => {
    // 기록 중이 아닐 때만 오늘 시작인 여행을 찾음
    if (recordingTrip) return null;
    return trips.find(t => 
      t.dates?.startDate === today && 
      t.status !== 'finished' && 
      t.status !== 'active' && // 현재 기록 중이거나 즉흥 여행인 경우는 제외
      !t.title.startsWith('즉흥 여행') // 즉흥 여행은 오늘의 일정 계획으로 간주하지 않음
    );
  }, [trips, today, recordingTrip]);

  // 2.3 예정된 여행 목록 (Priority 2 아래 또는 별도 섹션)
  const upcomingTrips = useMemo(() => {
    return trips
      .filter((t: Trip) => t.dates?.startDate > today)
      .sort((a, b) => a.dates.startDate.localeCompare(b.dates.startDate));
  }, [trips, today]);

  // 2.4 발자취 (기록 중이거나 기록되었으나 아직 여행기로 전환되지 않은 'active' 상태의 기록들)
  const footprintTrips = useMemo(() => {
    return trips
      .filter((t: Trip) => t.status === 'active' && t.id !== activeSession?.tripId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [trips, activeSession]);

  // 2.5 완료된 여행기록 (finished)
  const travelLogs = useMemo(() => {
    return trips
      .filter((t: Trip) => t.status === 'finished')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [trips]);

  const { isSyncing, lastSyncTime, triggerSync } = useSync(activeSession?.tripId || null);

  useEffect(() => {
    initDatabase();
  }, []);

  const handleStartInstantTrip = (suggestedTitle?: string) => {
    console.log('PPLANER: handleStartInstantTrip called with suggestedTitle:', suggestedTitle);
    
    setModalInitialTitle(suggestedTitle);
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
          await startBackgroundTracking(newTrip.id);
        }
      }

      if (settings.autoSyncPhotos && Platform.OS !== 'web') {
        autoSyncTripPhotos(newTrip.id, startDate, endDate);
      }

      // 여행 생성 후 위저드 및 임시 데이터 초기화
      useWizardStore.getState().reset();
      setModalInitialTitle(undefined);

      Alert.alert('여행 시작', `'${newTrip.title}' 기록을 시작했습니다!`);
    } catch (error) {
      console.error('PPLANER: Error in handleFastStart:', error);
      Alert.alert('오류', '여행 생성을 완료할 수 없습니다.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const greeting = user ? `${user.displayName}님!` : 'PPLANER';

  return (
    <View style={styles.container}>
      <LiquidHeader 
        title={greeting}
        headerStyle={headerStyle}
        titleStyle={titleStyle}
        glassOpacity={glassOpacity}
        rightComponent={
            <TouchableOpacity onPress={() => Alert.alert('알림', '도착한 알림이 없습니다.')}>
                <Ionicons name="notifications-outline" size={24} color={DESIGN_TOKENS.colors.slate[600]} />
            </TouchableOpacity>
        }
      />

      <View style={styles.liquidBackground}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
      </View>

      <Animated.ScrollView 
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT + 20, paddingBottom: 160 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.welcomeSection}>
            <Text style={styles.dateLabel}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
        </View>

        {/* 메인 액션 섹션 (히어로 카드 Priority 1, 2, 3) */}
        <View style={styles.mainActionSection}>
          {recordingTrip ? (
            /* Priority 1: 현재 기록 중 */
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push('/(tabs)/companion')}
              style={styles.heroCardContainer}
            >
              <Card variant="glass" style={styles.activeHeroCard}>
                <View style={styles.heroHeader}>
                   <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>실시간 기록 중</Text>
                   </View>
                   <Text style={styles.lastSyncLabel}>
                     {lastSyncTime ? `${lastSyncTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 동기화됨` : '방금 전 동기화'}
                   </Text>
                </View>
                
                <Text style={styles.heroTitle}>{recordingTrip.title}</Text>
                <Text style={styles.heroSubtitle}>현재 위치를 정밀하게 기록하고 있습니다</Text>

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{recordingTrip.photos?.length || 0}</Text>
                    <Text style={styles.heroStatLabel}>수집 사진</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{recordingTrip.dailyTimeline?.[0]?.events?.length || 0}</Text>
                    <Text style={styles.heroStatLabel}>방문 장소</Text>
                  </View>
                </View>

                <View style={styles.heroCTA}>
                  <Text style={styles.heroCTAText}>실시간 발자취 확인하기</Text>
                  <Ionicons name="arrow-forward" size={16} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                </View>
              </Card>
            </TouchableOpacity>
          ) : todayTrip ? (
            /* Priority 2: 오늘 시작하는 여행 */
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => handleStartInstantTrip(todayTrip.title)}
              style={styles.heroCardContainer}
            >
              <Card variant="glass" style={styles.todayHeroCard}>
                <View style={styles.heroHeader}>
                   <View style={[styles.liveBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Text style={[styles.liveText, { color: '#3B82F6' }]}>오늘의 일정</Text>
                   </View>
                   <Text style={styles.dDayText}>D-Day</Text>
                </View>
                
                <Text style={styles.heroTitle}>{todayTrip.title}</Text>
                <Text style={styles.heroSubtitle}>오늘 여행이 시작됩니다! 기록을 시작할까요?</Text>

                <TouchableOpacity 
                  style={styles.heroPrimaryButton}
                  onPress={() => handleStartInstantTrip(todayTrip.title)}
                >
                  <Text style={styles.heroPrimaryButtonText}>여행 기록 시작하기</Text>
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          ) : (
            /* Priority 3: 계획 없음 (기본 상태) */
            <Card variant="glass" style={styles.emptyHeroCard}>
               <View style={styles.emptyIconCircle}>
                  <Ionicons name="rocket-outline" size={32} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
               </View>
               <Text style={styles.emptyHeroTitle}>계획 없이 여행을 시작해볼까요?</Text>
               <Text style={styles.emptyHeroDesc}>지금 바로 기록을 시작하거나 나중을 위한 계획을 세워보세요</Text>
               <TouchableOpacity 
                  style={styles.heroPrimaryButton}
                  onPress={() => handleStartInstantTrip()}
               >
                  <Text style={styles.heroPrimaryButtonText}>바로 기록 시작하기</Text>
               </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* 1. 예정된 여행 계획 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>예정된 여행 계획</Text>
            {upcomingTrips.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
                <Text style={styles.moreText}>전체보기</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {upcomingTrips.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {upcomingTrips.map(t => (
                <TouchableOpacity key={t.id} onPress={() => router.push(`/(tabs)/trip/${t.id}`)}>
                  <Card style={styles.upcomingMiniCard}>
                    <Text style={styles.miniCardDDay}>D-{Math.ceil((new Date(t.dates.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</Text>
                    <Text style={styles.miniCardTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.miniCardDate}>{t.dates.startDate}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.emptySectionCard}>
              <Text style={styles.emptySectionText}>예정된 여행 계획이 없습니다.</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
                <Text style={styles.emptySectionAction}>여행 계획 세우기</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* 2. 최근 나의 발자취 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>최근 나의 발자취</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/companion')}>
              <Text style={styles.moreText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          
          {footprintTrips.length > 0 ? (
            <View style={{ gap: 12 }}>
              {footprintTrips.slice(0, 3).map((t: Trip) => (
                <RecordHistoryItem
                  key={t.id}
                  tripTitle={t.title}
                  location={t.locations.regionNames[0] || '탐방지'}
                  date={t.dates.startDate}
                  points={t.dailyTimeline?.[0]?.events?.length || 0}
                  photos={t.photos?.length || 0}
                  onPress={() => router.push(`/(tabs)/trip/${t.id}`)}
                />
              ))}
            </View>
          ) : (
            <Card style={styles.emptySectionCard}>
              <Text style={styles.emptySectionText}>최근 발자취가 없습니다. 여행을 시작해보세요!</Text>
            </Card>
          )}
        </View>

        {/* 3. 최근 나의 여행 기록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>최근 나의 여행 기록</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
              <Text style={styles.moreText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          
          {travelLogs.length > 0 ? (
            <View style={{ gap: 12 }}>
              {travelLogs.slice(0, 3).map((t: Trip) => (
                <RecordHistoryItem
                  key={t.id}
                  tripTitle={t.title}
                  location={t.locations.regionNames[0] || '탐방지'}
                  date={t.dates.startDate}
                  points={t.dailyTimeline?.reduce((acc, d) => acc + (d.events?.length || 0), 0) || 0}
                  photos={t.photos?.length || 0}
                  variant="completed"
                  onPress={() => router.push(`/(tabs)/trip/${t.id}`)}
                />
              ))}
            </View>
          ) : (
            <Card style={styles.emptySectionCard}>
              <Text style={styles.emptySectionText}>완료된 여행 기록이 없습니다.</Text>
            </Card>
          )}
        </View>

        <View style={styles.footer}>
            <Text style={styles.footerText}>PPLANER Mobile v1.0.0</Text>
            <Text style={styles.footerSubText}>AI 기반 정밀 여행 기록 및 설계 서비스</Text>
        </View>
        <View style={{ height: 200 }} />
      </Animated.ScrollView>

      <FastStartModal 
        visible={isFastStartModalVisible}
        initialTitle={modalInitialTitle}
        onClose={() => setIsFastStartModalVisible(false)}
        onStart={handleFastStart}
      />

      <ReconstructionWizard 
        visible={isWizardVisible}
        onClose={() => setIsWizardVisible(false)}
        onComplete={(id) => {
            setIsWizardVisible(false);
            useWizardStore.getState().reset();
            router.push(`/(tabs)/trip/${id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  liquidBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  blob1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
  },
  blob2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moreText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  mapCard: {
    padding: 0,
    height: 180,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 24,
  },
  mapPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  webMapBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webMapBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        minHeight: 180,
      }
    })
  },
  heroCardContainer: {
    width: '100%',
    marginBottom: 24,
  },
  activeHeroCard: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)', // Success color for active
  },
  upcomingHeroCard: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  emptyHeroCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  lastSyncLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '600',
  },
  dDayText: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.slate[900],
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
    marginBottom: 24,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  heroStatLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroCTAText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 8,
  },
  emptyHeroDesc: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  heroPrimaryButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  heroPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    color: DESIGN_TOKENS.colors.slate[300],
    fontSize: 14,
  },
  mainActionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  lifeLogStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
  },
  lifeLogStatusText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
  },
  loginBannerWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  loginBanner: {
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  loginBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary[700],
  },
  loginBannerDesc: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.primary[600],
    marginTop: 2,
  },
  loginButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: {
    marginTop: 16,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.slate[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtonRow: {
    width: '100%',
  },
  primaryActionButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickAddSection: {
      paddingHorizontal: 20,
  },
  quickAddCard: {
      padding: 0,
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
      borderColor: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  quickAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
  },
  quickAddText: {
      fontSize: 15,
      color: DESIGN_TOKENS.colors.primary.DEFAULT,
      fontWeight: '600',
  },
  upcomingMiniCard: {
    width: 160,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[100],
  },
  miniCardDDay: {
    fontSize: 14,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    marginBottom: 8,
  },
  miniCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 4,
  },
  miniCardDate: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  footerSubText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[300],
    marginTop: 4,
  },
  emptySectionCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  emptySectionAction: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
    fontWeight: '700',
  },
});


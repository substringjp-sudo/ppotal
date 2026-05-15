import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Switch } from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, useUserStore, useSettingsStore, useTripStore, useTravelogStore } from '@pplaner/shared';
import { Card } from '../../src/components/common/Card';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { startAlwaysTracking } from '../../src/services/LocationWorker';
import { clearFootprints, clearRecordedData, clearLifeLogs } from '../../src/lib/database';

export default function SettingsScreen() {
    const { profile, setProfile } = useUserStore();
    const { 
      location, updateLocationSettings, 
      photo, updatePhotoSettings,
      theme, updateTheme 
    } = useSettingsStore();
    const { clearAllTrips } = useTripStore();
    const { clearAllTravelogs } = useTravelogStore();
    const router = useRouter();

    const handleUpdateLocation = async (newSettings: any) => {
      updateLocationSettings(newSettings);
      // 설정을 저장한 후 백그라운드 태스크에 즉시 반영
      try {
        await startAlwaysTracking();
      } catch (e) {
        console.error("Failed to update tracking settings:", e);
      }
    };

    const handleLogin = () => {
        setProfile({
            id: 'user_123',
            name: '김플래너',
            email: 'planner@example.com',
            photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            bio: '여행을 사랑하는 개발자입니다.'
        });
    };

    const renderSettingItem = (
      icon: any, 
      label: string, 
      rightElement: React.ReactNode, 
      description?: string
    ) => (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={DESIGN_TOKENS.colors.slate[600]} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>{label}</Text>
            {description && <Text style={styles.settingDescription}>{description}</Text>}
          </View>
        </View>
        {rightElement}
      </View>
    );

    const renderOptionSelector = (
      current: string | number, 
      options: { label: string, value: any }[], 
      onSelect: (val: any) => void
    ) => (
      <View style={styles.optionSelector}>
        {options.map((opt) => (
          <TouchableOpacity 
            key={opt.value} 
            style={[styles.optionButton, current === opt.value && styles.optionButtonActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.optionText, current === opt.value && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
    
    const confirmDelete = (title: string, onConfirm: () => void) => {
      Alert.alert(
        title,
        "정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        [
          { text: "취소", style: "cancel" },
          { text: "삭제", style: "destructive", onPress: onConfirm }
        ]
      );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: DESIGN_TOKENS.colors.slate[50] }]} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* 상단 프로필 영역 */}
            <View style={styles.profileSection}>
              {profile ? (
                <View style={styles.profileInfo}>
                  <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                  <View>
                    <Text style={styles.userName}>{profile.name}</Text>
                    <Text style={styles.userEmail}>{profile.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.logoutBtn} onPress={() => setProfile(null)}>
                    <Ionicons name="log-out-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.loginBanner} onPress={handleLogin}>
                  <View style={styles.loginBannerLeft}>
                    <Ionicons name="person-circle" size={40} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                    <View style={styles.loginBannerText}>
                      <Text style={styles.loginBannerTitle}>로그인이 필요합니다</Text>
                      <Text style={styles.loginBannerSub}>데이터를 안전하게 동기화하세요</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={DESIGN_TOKENS.colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>

            {/* 위치 기록 설정 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>일상 발자취 (평상시)</Text>
              <Card variant="flat" style={styles.settingsCard}>
                {renderSettingItem(
                  "navigate-outline",
                  "일상 기록 활성화",
                  <Switch 
                    value={location.always.enabled} 
                    onValueChange={(v) => handleUpdateLocation({ always: { ...location.always, enabled: v } })}
                    trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                  />,
                  "여행 중이 아닐 때도 내 발자취를 자동으로 기록합니다."
                )}
                {location.always.enabled && (
                  <>
                    <View style={styles.divider} />
                    {renderSettingItem(
                      "timer-outline",
                      "기록 간격",
                      renderOptionSelector(location.always.interval, [
                        { label: '10분', value: 600000 },
                        { label: '30분', value: 1800000 },
                        { label: '1시간', value: 3600000 },
                      ], (v) => handleUpdateLocation({ always: { ...location.always, interval: v } })),
                      "주기가 길수록 배터리를 절약할 수 있습니다."
                    )}
                  </>
                )}
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>여행 중 기록 (기록 시작 시)</Text>
              <Card variant="flat" style={styles.settingsCard}>
                {renderSettingItem(
                  "rocket-outline",
                  "정밀 기록 간격",
                  renderOptionSelector(location.trip.interval, [
                    { label: '1분', value: 60000 },
                    { label: '5분', value: 300000 },
                    { label: '15분', value: 900000 },
                  ], (v) => handleUpdateLocation({ trip: { ...location.trip, interval: v } })),
                  "여행 중에는 더 촘촘한 경로 기록을 위해 정밀하게 작동합니다."
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                  "locate-outline",
                  "위치 정확도",
                  renderOptionSelector(location.trip.accuracy, [
                    { label: '최고', value: 'high' },
                    { label: '보통', value: 'balanced' },
                    { label: '절약', value: 'low' },
                  ], (v) => handleUpdateLocation({ trip: { ...location.trip, accuracy: v } }))
                )}
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>위치 기록 공통 옵션</Text>
              <Card variant="flat" style={styles.settingsCard}>
                {renderSettingItem(
                  "walk-outline",
                  "이동 중에만 기록",
                  <Switch 
                    value={location.recordOnlyWhenMoving} 
                    onValueChange={(v) => handleUpdateLocation({ recordOnlyWhenMoving: v })}
                    trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                  />,
                  "정지 상태일 때는 기록을 멈춰 배터리를 절약합니다."
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                  "battery-dead-outline",
                  "배터리 최적화 모드",
                  <Switch 
                    value={location.batteryOptimization} 
                    onValueChange={(v) => handleUpdateLocation({ batteryOptimization: v })}
                    trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                  />,
                  "배터리가 부족할 때 기록 주기를 자동으로 조절합니다."
                )}
              </Card>
            </View>

            {/* 사진 관리 설정 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>사진 및 미디어</Text>
              <Card variant="flat" style={styles.settingsCard}>
                {renderSettingItem(
                  "cloud-upload-outline",
                  "사진 자동 동기화",
                  <Switch 
                    value={photo.autoSync} 
                    onValueChange={(v) => updatePhotoSettings({ autoSync: v })}
                    trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                  />,
                  "여행 중 촬영한 사진을 클라우드에 자동 백업합니다."
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                  "save-outline",
                  "갤러리에 원본 저장",
                  <Switch 
                    value={photo.saveToGallery} 
                    onValueChange={(v) => updatePhotoSettings({ saveToGallery: v })}
                    trackColor={{ true: DESIGN_TOKENS.colors.primary.DEFAULT }}
                  />
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                  "image-outline",
                  "업로드 품질",
                  renderOptionSelector(photo.quality, [
                    { label: '원본', value: 'original' },
                    { label: '고화질', value: 'high' },
                    { label: '일반', value: 'medium' },
                  ], (v) => updatePhotoSettings({ quality: v }))
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                  "camera-outline",
                  "카메라 앱에서 사진 촬영 시 위치 정보 저장하기",
                  <TouchableOpacity 
                    style={styles.actionLink}
                    onPress={async () => {
                      try {
                        if (Platform.OS === 'ios') {
                          // iOS: 개인정보 보호 -> 위치 서비스 화면으로 유도
                          await Linking.openURL('App-Prefs:root=Privacy&path=LOCATION');
                        } else {
                          // Android: 기기 위치 설정 화면으로 이동 (가장 근접한 설정)
                          await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                        }
                      } catch (e) {
                        // 실패 시 일반 설정 화면으로 이동
                        Linking.openSettings();
                      }
                    }}
                  >
                    <Text style={styles.actionLinkText}>설정으로 이동</Text>
                    <Ionicons name="chevron-forward" size={14} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                  </TouchableOpacity>,
                  "사진 촬영 시 위치 정보가 저장되도록 시스템 설정을 확인합니다."
                )}
              </Card>
            </View>

            {/* 기타 설정 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>앱 설정</Text>
              <Card variant="flat" style={styles.settingsCard}>
                {renderSettingItem(
                  "contrast-outline",
                  "테마 설정",
                  renderOptionSelector(theme, [
                    { label: '시스템', value: 'system' },
                    { label: '라이트', value: 'light' },
                    { label: '다크', value: 'dark' },
                  ], (v) => updateTheme(v))
                )}
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem}>
                  <Ionicons name="information-circle-outline" size={20} color={DESIGN_TOKENS.colors.slate[600]} />
                  <Text style={styles.menuText}>버전 정보</Text>
                  <Text style={styles.versionText}>v1.2.0</Text>
                </TouchableOpacity>
              </Card>
            </View>

            {/* 데이터 관리 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>데이터 관리</Text>
              <Card variant="flat" style={styles.settingsCard}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => confirmDelete("발자취 모두 삭제", () => {
                    clearFootprints();
                    Alert.alert("완료", "모든 발자취가 삭제되었습니다.");
                  })}
                >
                  <Ionicons name="trash-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  <Text style={[styles.menuText, { color: DESIGN_TOKENS.colors.danger.DEFAULT }]}>발자취 모두 삭제</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => confirmDelete("저장된 기록 모두 삭제", () => {
                    clearAllTravelogs();
                    Alert.alert("완료", "모든 여행 기록이 삭제되었습니다.");
                  })}
                >
                  <Ionicons name="journal-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  <Text style={[styles.menuText, { color: DESIGN_TOKENS.colors.danger.DEFAULT }]}>저장된 기록 모두 삭제</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => confirmDelete("저장된 계획 모두 삭제", () => {
                    clearAllTrips();
                    Alert.alert("완료", "모든 여행 계획이 삭제되었습니다.");
                  })}
                >
                  <Ionicons name="calendar-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  <Text style={[styles.menuText, { color: DESIGN_TOKENS.colors.danger.DEFAULT }]}>저장된 계획 모두 삭제</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => confirmDelete("보관중인 발자취 기록 모두 삭제", () => {
                    clearRecordedData();
                    clearLifeLogs();
                    Alert.alert("완료", "보관된 발자취 원본 데이터가 삭제되었습니다.");
                  })}
                >
                  <Ionicons name="archive-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  <Text style={[styles.menuText, { color: DESIGN_TOKENS.colors.danger.DEFAULT }]}>보관중인 발자취 기록 모두 삭제</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => confirmDelete("전체 데이터 초기화", () => {
                    clearFootprints();
                    clearAllTravelogs();
                    clearAllTrips();
                    clearRecordedData();
                    clearLifeLogs();
                    Alert.alert("완료", "모든 데이터가 초기화되었습니다.");
                  })}
                >
                  <Ionicons name="refresh-outline" size={20} color={DESIGN_TOKENS.colors.danger.DEFAULT} />
                  <Text style={[styles.menuText, { color: DESIGN_TOKENS.colors.danger.DEFAULT, fontWeight: '800' }]}>전체 데이터 초기화</Text>
                </TouchableOpacity>
              </Card>
              <Text style={styles.dangerZoneDesc}>
                삭제된 데이터는 복구할 수 없으며, 기기에 저장된 오프라인 데이터만 삭제됩니다.
              </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    profileSection: {
      padding: 24,
      paddingTop: 60,
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    },
    profileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: DESIGN_TOKENS.colors.slate[100],
    },
    userName: {
      fontSize: 18,
      fontWeight: '800',
      color: DESIGN_TOKENS.colors.slate[900],
    },
    userEmail: {
      fontSize: 14,
      color: DESIGN_TOKENS.colors.slate[500],
      marginTop: 2,
    },
    logoutBtn: {
      marginLeft: 'auto',
      padding: 8,
    },
    loginBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: DESIGN_TOKENS.colors.primary[50],
      borderRadius: 20,
      borderWidth: 1,
      borderColor: DESIGN_TOKENS.colors.primary[100],
    },
    loginBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    loginBannerText: {
      gap: 2,
    },
    loginBannerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: DESIGN_TOKENS.colors.primary[900],
    },
    loginBannerSub: {
      fontSize: 13,
      color: DESIGN_TOKENS.colors.primary[600],
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: DESIGN_TOKENS.colors.slate[500],
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingsCard: {
        padding: 0,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        gap: 12,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: DESIGN_TOKENS.colors.slate[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingTextContainer: {
        flex: 1,
        gap: 2,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: DESIGN_TOKENS.colors.slate[800],
    },
    settingDescription: {
        fontSize: 12,
        color: DESIGN_TOKENS.colors.slate[400],
        lineHeight: 16,
    },
    optionSelector: {
        flexDirection: 'row',
        backgroundColor: DESIGN_TOKENS.colors.slate[100],
        padding: 4,
        borderRadius: 10,
        gap: 4,
    },
    optionButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 7,
    },
    optionButtonActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    optionText: {
        fontSize: 12,
        fontWeight: '600',
        color: DESIGN_TOKENS.colors.slate[500],
    },
    optionTextActive: {
        color: DESIGN_TOKENS.colors.primary.DEFAULT,
    },
    divider: {
        height: 1,
        backgroundColor: DESIGN_TOKENS.colors.slate[50],
        marginHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: DESIGN_TOKENS.colors.slate[700],
    },
    versionText: {
        fontSize: 14,
        color: DESIGN_TOKENS.colors.slate[400],
        fontWeight: '500',
    },
    actionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: DESIGN_TOKENS.colors.primary[50],
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    actionLinkText: {
        fontSize: 13,
        fontWeight: '700',
        color: DESIGN_TOKENS.colors.primary.DEFAULT,
    },
    dangerZoneDesc: {
        fontSize: 12,
        color: DESIGN_TOKENS.colors.slate[400],
        marginTop: 12,
        marginLeft: 4,
        lineHeight: 18,
    },
});

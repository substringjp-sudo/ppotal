import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { Card } from '../common/Card';

interface ActiveStatusProps {
  isTracking: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  onToggleTracking: () => void;
  onSync: () => void;
  onPickPhoto: () => void;
}

export const ActiveStatus: React.FC<ActiveStatusProps> = ({
  isTracking,
  isSyncing,
  lastSyncTime,
  onToggleTracking,
  onSync,
  onPickPhoto,
}) => {
  return (
    <View style={styles.container}>
      <Card variant="glass" style={styles.statusCard}>
        <View style={styles.header}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, { 
                backgroundColor: isTracking ? '#10B981' : DESIGN_TOKENS.colors.slate[300],
            }]} />
            <Text style={styles.statusText}>{isTracking ? '실시간 기록 중' : '기록 중지됨'}</Text>
          </View>
          
          <View style={styles.headerRight}>
              <TouchableOpacity onPress={onSync} style={styles.syncButton}>
                <Ionicons name={isSyncing ? "sync" : "sync-outline"} size={18} color={isSyncing ? DESIGN_TOKENS.colors.primary.DEFAULT : DESIGN_TOKENS.colors.slate[400]} />
              </TouchableOpacity>
              {isTracking && (
                  <TouchableOpacity 
                    style={styles.stopBadge}
                    onPress={onToggleTracking}
                  >
                    <Text style={styles.stopBadgeText}>기록 종료</Text>
                  </TouchableOpacity>
              )}
          </View>
        </View>

        {!isTracking && (
            <TouchableOpacity 
                style={styles.startLargeButton}
                onPress={onToggleTracking}
            >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startLargeButtonText}>기록 다시 시작하기</Text>
            </TouchableOpacity>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.footerAction} onPress={onPickPhoto}>
            <Ionicons name="camera-outline" size={18} color={DESIGN_TOKENS.colors.slate[600]} />
            <Text style={styles.footerActionText}>사진 등록</Text>
          </TouchableOpacity>
          {lastSyncTime && (
            <Text style={styles.lastSync}>최근 동기화: {lastSyncTime.toLocaleTimeString()}</Text>
          )}
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  statusCard: {
    padding: 0, // Card 내부 padding 중복 방지
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  syncButton: {
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopBadge: {
    backgroundColor: '#FEE2E2', // light red
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  stopBadgeText: {
    color: '#EF4444', // danger red
    fontSize: 12,
    fontWeight: '700',
  },
  startLargeButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 16,
  },
  startLargeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[50],
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    fontWeight: '500',
  },
  lastSync: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});

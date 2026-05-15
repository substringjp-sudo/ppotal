import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { Card } from '../common/Card';

interface RecordHistoryItemProps {
  tripTitle: string;
  location?: string;
  date: string;
  points: number;
  photos: number;
  variant?: 'active' | 'completed';
  onPress?: () => void;
  onDelete?: () => void;
}

export const RecordHistoryItem: React.FC<RecordHistoryItemProps> = ({
  tripTitle,
  location = '탐방지',
  date,
  points,
  photos,
  variant = 'active',
  onPress,
  onDelete,
}) => {
  const isCompleted = variant === 'completed';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card variant="flat" style={styles.card}>
        <View style={styles.leftBar} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>{tripTitle}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={12} color={DESIGN_TOKENS.colors.slate[400]} />
                <Text style={styles.locationText}>{location} · {date}</Text>
              </View>
            </View>
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.completedText}>정식 여행기</Text>
              </View>
            ) : (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>발자취</Text>
              </View>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color={DESIGN_TOKENS.colors.slate[300]} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.statGroup}>
              <View style={styles.stat}>
                <Ionicons name="trail-sign-outline" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                <Text style={styles.statValue}>{points}</Text>
                <Text style={styles.statLabel}>장소</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Ionicons name="image-outline" size={14} color={DESIGN_TOKENS.colors.slate[400]} />
                <Text style={styles.statValue}>{photos}</Text>
                <Text style={styles.statLabel}>사진</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={DESIGN_TOKENS.colors.slate[200]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  leftBar: {
    width: 4,
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  activeBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  statLabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

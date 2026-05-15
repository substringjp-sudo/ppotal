import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip } from '@pplaner/shared';
import { Card } from '../common/Card';

interface TripCardShortProps {
  trip: Trip;
  onPress: () => void;
  onDelete?: () => void;
}

export const TripCardShort: React.FC<TripCardShortProps> = ({ trip, onPress, onDelete }) => {
  const startDate = trip.dates?.startDate || '날짜 미정';
  const endDate = trip.dates?.endDate || '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconBox}>
            <Ionicons name="map-outline" size={24} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{trip.title || '제목 없는 여행'}</Text>
            <Text style={styles.dateText}>{startDate} {endDate && `- ${endDate}`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={DESIGN_TOKENS.colors.slate[300]} />
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
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  dateText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});

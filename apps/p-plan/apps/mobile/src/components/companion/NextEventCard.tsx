import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, TripEvent } from '@pplaner/shared';
import { Card } from '../common/Card';

interface NextEventCardProps {
  event: TripEvent | null;
  dayNumber?: number;
}

export const NextEventCard: React.FC<NextEventCardProps> = ({ event, dayNumber }) => {
  if (!event) {
    return (
      <Card variant="glass" style={styles.card}>
        <Text style={styles.emptyText}>다음 예정된 일정이 없습니다.</Text>
      </Card>
    );
  }

  return (
    <Card variant="glass" style={styles.card}>
      <View style={{ padding: 16 }}>
        <View style={styles.header}>
        <Text style={styles.label}>다음 일정 {dayNumber && `- Day ${dayNumber}`}</Text>
        <Text style={styles.time}>{event.startTime || '시간 미지정'}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={24} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{event.title}</Text>
          {event.location?.name && (
            <Text style={styles.location}>{event.location.name}</Text>
          )}
        </View>
      </View>
      {event.memo && (
        <View style={styles.memoContainer}>
          <Text style={styles.memoText} numberOfLines={2}>{event.memo}</Text>
        </View>
      )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderLeftWidth: 6,
    borderLeftColor: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.15)', // DESIGN_TOKENS.colors.primary.DEFAULT + opacity
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  location: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: DESIGN_TOKENS.colors.slate[400],
    fontSize: 14,
  },
  memoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  memoText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    fontStyle: 'italic',
  },
});

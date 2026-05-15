import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS, Trip, useTripStore } from '@pplaner/shared';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

interface FootprintCalendarProps {
  onDateSelect?: (date: Date, data: DayData) => void;
}

interface DayData {
  footprintCount: number;
  photoCount: number;
  trips: Trip[];
  rawFootprints: any[];
}

export const FootprintCalendar: React.FC<FootprintCalendarProps> = ({ onDateSelect }) => {
  const { trips } = useTripStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activityData, setActivityData] = useState<Record<string, DayData>>({});
  const [selectedDayInfo, setSelectedDayInfo] = useState<DayData | null>(null);
  
  const getLocalDateKey = (dateInput: number | string | Date) => {
    const d = new Date(dateInput);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Group data by date
  useEffect(() => {
    const data: Record<string, DayData> = {};

    // Process trips for photos and events
    trips.forEach(trip => {
      // 1. Process photos
      if (trip.photos) {
        trip.photos.forEach(photo => {
          if (photo.timestamp) {
            const dateKey = getLocalDateKey(photo.timestamp);
            if (!data[dateKey]) data[dateKey] = { footprintCount: 0, photoCount: 0, trips: [], rawFootprints: [] };
            data[dateKey].photoCount += 1;
            if (!data[dateKey].trips.find(t => t.id === trip.id)) {
              data[dateKey].trips.push(trip);
            }
          }
        });
      }

      // 2. Process timeline events (as footprints)
      if (trip.dailyTimeline) {
        trip.dailyTimeline.forEach(day => {
          const dateKey = day.date; // Assuming ISO date string
          if (!data[dateKey]) data[dateKey] = { footprintCount: 0, photoCount: 0, trips: [], rawFootprints: [] };
          data[dateKey].footprintCount += day.events?.length || 0;
          if (!data[dateKey].trips.find(t => t.id === trip.id)) {
            data[dateKey].trips.push(trip);
          }
        });
      }
    });

    // 3. Process raw footprints from SQLite (Async load)
    const loadRawFootprints = async () => {
      if (Platform.OS === 'web') return;
      try {
        const { getFootprintsInRange } = require('../../lib/database');
        // Fetch last 3 months
        const end = Date.now();
        const start = end - (90 * 24 * 60 * 60 * 1000);
        const rawFps = getFootprintsInRange(start, end);
        
        rawFps.forEach((fp: any) => {
          const dateKey = getLocalDateKey(fp.timestamp);
          if (!data[dateKey]) data[dateKey] = { footprintCount: 0, photoCount: 0, trips: [], rawFootprints: [] };
          data[dateKey].footprintCount += 1;
          data[dateKey].rawFootprints.push(fp);
        });
        
        setActivityData({ ...data });
      } catch (e) {
        console.error('Failed to load raw footprints for calendar:', e);
        setActivityData({ ...data });
      }
    };

    loadRawFootprints();
    
    // Initial selection update
    if (selectedDate) {
      const key = getLocalDateKey(selectedDate);
      setSelectedDayInfo(data[key] || null);
    }
  }, [trips]);

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of month
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    const key = getLocalDateKey(date);
    const info = activityData[key] || { footprintCount: 0, photoCount: 0, trips: [], rawFootprints: [] };
    setSelectedDayInfo(info);
    if (onDateSelect) onDateSelect(date, info);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return selectedDate && 
           date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthTitle}>
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </Text>
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={DESIGN_TOKENS.colors.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={DESIGN_TOKENS.colors.slate[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekDays}>
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <Text key={d} style={styles.weekDayText}>{d}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {daysInMonth.map((date, index) => {
          if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
          
          const dateKey = getLocalDateKey(date);
          const data = activityData[dateKey];
          const hasPhotos = data && data.photoCount > 0;
          const hasFootprints = data && data.footprintCount > 0;
          
          let dotColor = 'transparent';
          let dotSize = 0;

          if (hasPhotos) {
            dotColor = '#F97316'; // Orange
            dotSize = Math.min(6 + data.photoCount * 0.8, 14);
          } else if (hasFootprints) {
            dotColor = '#94A3B8'; // Grey
            dotSize = 6;
          }

          const hasActivity = hasPhotos || hasFootprints;
          
          return (
            <TouchableOpacity 
              key={date.toISOString()} 
              style={[styles.dayCell, isSelected(date) && styles.selectedDay]}
              onPress={() => handleDatePress(date)}
            >
              <Text style={[
                styles.dayText, 
                isToday(date) && styles.todayText,
                isSelected(date) && styles.selectedDayText,
                (!hasActivity && !isSelected(date)) && styles.noActivityText
              ]}>
                {date.getDate()}
              </Text>
              {dotSize > 0 && (
                <View style={[
                  styles.dot, 
                  { 
                    backgroundColor: dotColor, 
                    width: dotSize, 
                    height: dotSize, 
                    borderRadius: dotSize / 2 
                  }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Info List */}
      <Animated.View layout={Layout.springify()} style={styles.infoSection}>
        {selectedDate && (
          <View style={styles.infoContent}>
            <View style={styles.infoTitleRow}>
              <Text style={styles.infoDateText}>
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일의 기록
              </Text>
              <TouchableOpacity 
                style={styles.reconstructButton}
                onPress={() => {
                  const dateStr = getLocalDateKey(selectedDate);
                  const { router } = require('expo-router');
                  router.push({ pathname: '/reconstruct', params: { date: dateStr } });
                }}
              >
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.reconstructButtonText}>일정 생성</Text>
              </TouchableOpacity>
            </View>

            {selectedDayInfo && (selectedDayInfo.trips.length > 0 || selectedDayInfo.rawFootprints.length > 0) ? (
              <View style={styles.recordsList}>
                {selectedDayInfo.trips.map(trip => (
                  <View key={trip.id} style={styles.recordItem}>
                    <View style={styles.recordIcon}>
                      <Ionicons name="map" size={16} color={DESIGN_TOKENS.colors.primary.DEFAULT} />
                    </View>
                    <View style={styles.recordTexts}>
                      <Text style={styles.recordTitle}>{trip.title}</Text>
                      <Text style={styles.recordSubtitle}>여행 기록됨</Text>
                    </View>
                  </View>
                ))}
                {selectedDayInfo.rawFootprints.slice(0, 3).map((fp, idx) => (
                  <View key={`fp-${idx}`} style={styles.recordItem}>
                    <View style={[styles.recordIcon, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="location" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
                    </View>
                    <View style={styles.recordTexts}>
                      <Text style={styles.recordTitle}>{fp.memo || '기록된 장소'}</Text>
                      <Text style={styles.recordSubtitle}>
                        {new Date(fp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyInfo}>
                <Text style={styles.emptyInfoText}>기록이 없는 날입니다.</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  noActivityText: {
    color: DESIGN_TOKENS.colors.slate[200],
  },
  todayText: {
    color: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  selectedDay: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  selectedDayText: {
    color: '#fff',
  },
  dot: {
    position: 'absolute',
    bottom: 4,
  },
  infoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoContent: {},
  infoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoDateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  infoBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  reconstructButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  reconstructButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordsList: {
    gap: 12,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTexts: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  recordSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  emptyInfo: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyInfoText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});

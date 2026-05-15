import { generateId } from '../../types/common';
import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { reverseGeocodeIds } from '../../lib/region-service';
import { searchRegions } from '../../lib/intelligence-service';

import { updateTripState } from '../utils';
import { TIMELINE_SAFETY_MAX_DAYS } from '../../lib/constants/common';

export interface TimelineSlice {
    initializeDailyTimeline: () => void;
    addEvent: (dayIndex: number, event: Partial<import('../../types/trip').TripEvent>) => void;
    addEvents: (dayIndex: number, events: Partial<import('../../types/trip').TripEvent>[]) => void;
    insertEvent: (dayIndex: number, event: Partial<import('../../types/trip').TripEvent>, insertIndex?: number) => void;
    updateEvent: (dayIndex: number, eventId: string, updates: Partial<import('../../types/trip').TripEvent>) => Promise<void>;
    removeEvent: (dayIndex: number, eventId: string) => void;
    reorderEvents: (dayIndex: number, events: import('../../types/trip').TripEvent[]) => void;
    moveEvent: (fromDayIdx: number, toDayIdx: number, eventId: string, newPosition?: number) => void;
    updateEventTransport: (dayIndex: number, eventId: string, transport: import('../../types/trip').TransportToNext) => void;
    addPrepTask: (task: import('../../types/trip').PrepTask) => void;
    updatePrepTask: (id: string, updates: Partial<import('../../types/trip').PrepTask>) => void;
    removePrepTask: (id: string) => void;
    togglePrepTask: (id: string) => void;
}

export const createTimelineSlice: StateCreator<TripState, [], [], TimelineSlice> = (set, get) => ({
    initializeDailyTimeline: () => {
        const { currentTrip: trip } = get();
        if (!trip) return;
        
        const hasDates = trip.dates.startDate && trip.dates.endDate;
        const hasDuration = trip.dates.durationDays && trip.dates.durationDays > 0;
        
        if (!hasDates && !hasDuration) return;

        // Skip if already initialized and within reasonable range
        // This prevents infinite loop if initializeDailyTimeline is called repeatedly
        if (trip.dailyTimeline && trip.dailyTimeline.length > 0) {
            return;
        }

        updateTripState(set, get, (trip) => {
            try {
                const startDateStr = trip.dates.startDate;
                const endDateStr = trip.dates.endDate;
                
                let days = [];
                
                if (startDateStr && endDateStr) {
                    const start = new Date(startDateStr);
                    const end = new Date(endDateStr);

                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
                        const current = new Date(start);
                        let dayNum = 1;
                        let safetyCounter = 0;
                        while (current <= end && safetyCounter < TIMELINE_SAFETY_MAX_DAYS) {
                            days.push({
                                day: dayNum++,
                                date: current.toISOString().split('T')[0],
                                events: []
                            });
                            current.setDate(current.getDate() + 1);
                            safetyCounter++;
                        }
                    }
                } else if (trip.dates.durationDays && trip.dates.durationDays > 0) {
                    // Fallback to durationDays if dates are not set
                    for (let i = 1; i <= (trip.dates.durationDays as number); i++) {
                        days.push({
                            day: i,
                            date: `Day ${i}`, // Unique placeholder for keying
                            events: []
                        });
                    }
                }

                if (days.length > 0) {
                    trip.dailyTimeline = days;
                }
            } catch (error) {
                console.error('Error in initializeDailyTimeline:', error);
            }
        });
    },

    addEvent: (dayIndex, event) => updateTripState(set, get, (trip) => {
        const newEvent: import('../../types/trip').TripEvent = {
            id: generateId(),
            isFixedTime: false,
            title: 'New Event',
            type: 'sightseeing',
            ...event
        };

        if (trip.dailyTimeline[dayIndex]) {
            trip.dailyTimeline[dayIndex].events.push(newEvent);
        }
    }),

    addEvents: (dayIndex, events) => updateTripState(set, get, (trip) => {
        if (!trip.dailyTimeline[dayIndex]) return;
        
        events.forEach(event => {
            const newEvent: import('../../types/trip').TripEvent = {
                id: generateId(),
                isFixedTime: false,
                title: 'New Event',
                type: 'sightseeing',
                ...event
            };
            trip.dailyTimeline[dayIndex].events.push(newEvent);
        });
    }),

    insertEvent: (dayIndex, event, insertIndex) => updateTripState(set, get, (trip) => {
        const newEvent: import('../../types/trip').TripEvent = {
            id: generateId(),
            isFixedTime: false,
            title: 'New Event',
            type: 'sightseeing',
            ...event
        };

        if (trip.dailyTimeline[dayIndex]) {
            if (insertIndex !== undefined && insertIndex >= 0 && insertIndex < trip.dailyTimeline[dayIndex].events.length) {
                // Insert after the given index
                trip.dailyTimeline[dayIndex].events.splice(insertIndex + 1, 0, newEvent);
            } else {
                // Fallback to push if no index or invalid index provided
                trip.dailyTimeline[dayIndex].events.push(newEvent);
            }
        }
    }),

    updateEvent: async (dayIndex, eventId, updates) => {
        updateTripState(set, get, (trip) => {
            const day = trip.dailyTimeline[dayIndex];
            if (!day) return;
            const event = day.events.find(e => e.id === eventId);
            if (event) {
                Object.assign(event, updates);
            }
        });

        // Async side effects: Geocoding
        if (updates.location?.name) {
            const searchResults = await searchRegions(updates.location.name);
            if (searchResults && searchResults.length > 0) {
                const ids = searchResults[0].ids;
                updateTripState(set, get, (trip) => {
                    const event = trip.dailyTimeline[dayIndex]?.events.find(e => e.id === eventId);
                    if (event && event.location) {
                        Object.assign(event.location, ids);
                    }
                });
            }
        }


        if (updates.location?.lat !== undefined && updates.location?.lng !== undefined) {
            const ids = await reverseGeocodeIds(updates.location.lat, updates.location.lng);
            updateTripState(set, get, (trip) => {
                const event = trip.dailyTimeline[dayIndex]?.events.find(e => e.id === eventId);
                if (event && event.location) {
                    Object.assign(event.location, ids);
                }
            });
        }
    },

    removeEvent: (dayIndex, eventId) => updateTripState(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (day) {
            day.events = day.events.filter(e => e.id !== eventId);
        }
    }),

    reorderEvents: (dayIndex, events) => updateTripState(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (day) {
            day.events = events;
        }
    }),

    moveEvent: (fromDayIdx, toDayIdx, eventId, newPosition) => updateTripState(set, get, (trip) => {
        const sourceDay = trip.dailyTimeline[fromDayIdx];
        if (!sourceDay) return;
        
        const eventIndex = sourceDay.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return;

        const [eventToMove] = sourceDay.events.splice(eventIndex, 1);
        
        const targetDay = trip.dailyTimeline[toDayIdx];
        if (!targetDay) return;

        if (typeof newPosition === 'number') {
            targetDay.events.splice(newPosition, 0, eventToMove);
        } else {
            targetDay.events.push(eventToMove);
        }
    }),
    
    updateEventTransport: (dayIndex, eventId, transport) => updateTripState(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (!day) return;
        
        const eventIdx = day.events.findIndex(e => e.id === eventId);
        if (eventIdx === -1) return;
        
        const event = day.events[eventIdx];
        event.transportToNext = transport;
        
        // Intelligent Time Shifting:
        // If travel time changed, shift the START time of the NEXT event if it's flexible or auto-generated
        const nextEvent = day.events[eventIdx + 1];
        if (nextEvent && (nextEvent.isFlexible || nextEvent.isAutoGenerated)) {
            const currentStartTime = event.endTime || event.startTime || '09:00';
            const [h, m] = currentStartTime.split(':').map(Number);
            const totalMins = h * 60 + m + transport.durationMinutes;
            
            const newStart = `${String(Math.floor(totalMins/60)%24).padStart(2,'0')}:${String(totalMins%60).padStart(2,'0')}`;
            nextEvent.startTime = newStart;
        }
    }),

    addPrepTask: (task) => updateTripState(set, get, (trip) => {
        trip.prepTimeline.push(task);
    }),

    updatePrepTask: (id, updates) => updateTripState(set, get, (trip) => {
        const task = trip.prepTimeline.find(t => t.id === id);
        if (task) {
            Object.assign(task, updates);
        }
    }),

    removePrepTask: (id) => updateTripState(set, get, (trip) => {
        trip.prepTimeline = trip.prepTimeline.filter(t => t.id !== id);
    }),

    togglePrepTask: (id) => updateTripState(set, get, (trip) => {
        const task = trip.prepTimeline.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'active' ? 'upcoming' : 'active';
        }
    })
});

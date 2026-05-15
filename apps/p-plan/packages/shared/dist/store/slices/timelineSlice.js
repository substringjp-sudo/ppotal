"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimelineSlice = void 0;
const common_1 = require("../../types/common");
const region_service_1 = require("../../lib/region-service");
const intelligence_service_1 = require("../../lib/intelligence-service");
const utils_1 = require("../utils");
const common_2 = require("../../lib/constants/common");
const createTimelineSlice = (set, get) => ({
    initializeDailyTimeline: () => {
        const { currentTrip: trip } = get();
        if (!trip)
            return;
        const hasDates = trip.dates.startDate && trip.dates.endDate;
        const hasDuration = trip.dates.durationDays && trip.dates.durationDays > 0;
        if (!hasDates && !hasDuration)
            return;
        // Skip if already initialized and within reasonable range
        // This prevents infinite loop if initializeDailyTimeline is called repeatedly
        if (trip.dailyTimeline && trip.dailyTimeline.length > 0) {
            return;
        }
        (0, utils_1.updateTripState)(set, get, (trip) => {
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
                        while (current <= end && safetyCounter < common_2.TIMELINE_SAFETY_MAX_DAYS) {
                            days.push({
                                day: dayNum++,
                                date: current.toISOString().split('T')[0],
                                events: []
                            });
                            current.setDate(current.getDate() + 1);
                            safetyCounter++;
                        }
                    }
                }
                else if (trip.dates.durationDays && trip.dates.durationDays > 0) {
                    // Fallback to durationDays if dates are not set
                    for (let i = 1; i <= trip.dates.durationDays; i++) {
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
            }
            catch (error) {
                console.error('Error in initializeDailyTimeline:', error);
            }
        });
    },
    addEvent: (dayIndex, event) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const newEvent = {
            id: (0, common_1.generateId)(),
            isFixedTime: false,
            title: 'New Event',
            type: 'sightseeing',
            ...event
        };
        if (trip.dailyTimeline[dayIndex]) {
            trip.dailyTimeline[dayIndex].events.push(newEvent);
        }
    }),
    addEvents: (dayIndex, events) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.dailyTimeline[dayIndex])
            return;
        events.forEach(event => {
            const newEvent = {
                id: (0, common_1.generateId)(),
                isFixedTime: false,
                title: 'New Event',
                type: 'sightseeing',
                ...event
            };
            trip.dailyTimeline[dayIndex].events.push(newEvent);
        });
    }),
    insertEvent: (dayIndex, event, insertIndex) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const newEvent = {
            id: (0, common_1.generateId)(),
            isFixedTime: false,
            title: 'New Event',
            type: 'sightseeing',
            ...event
        };
        if (trip.dailyTimeline[dayIndex]) {
            if (insertIndex !== undefined && insertIndex >= 0 && insertIndex < trip.dailyTimeline[dayIndex].events.length) {
                // Insert after the given index
                trip.dailyTimeline[dayIndex].events.splice(insertIndex + 1, 0, newEvent);
            }
            else {
                // Fallback to push if no index or invalid index provided
                trip.dailyTimeline[dayIndex].events.push(newEvent);
            }
        }
    }),
    updateEvent: async (dayIndex, eventId, updates) => {
        (0, utils_1.updateTripState)(set, get, (trip) => {
            const day = trip.dailyTimeline[dayIndex];
            if (!day)
                return;
            const event = day.events.find(e => e.id === eventId);
            if (event) {
                Object.assign(event, updates);
            }
        });
        // Async side effects: Geocoding
        if (updates.location?.name) {
            const searchResults = await (0, intelligence_service_1.searchRegions)(updates.location.name);
            if (searchResults && searchResults.length > 0) {
                const ids = searchResults[0].ids;
                (0, utils_1.updateTripState)(set, get, (trip) => {
                    const event = trip.dailyTimeline[dayIndex]?.events.find(e => e.id === eventId);
                    if (event && event.location) {
                        Object.assign(event.location, ids);
                    }
                });
            }
        }
        if (updates.location?.lat !== undefined && updates.location?.lng !== undefined) {
            const ids = await (0, region_service_1.reverseGeocodeIds)(updates.location.lat, updates.location.lng);
            (0, utils_1.updateTripState)(set, get, (trip) => {
                const event = trip.dailyTimeline[dayIndex]?.events.find(e => e.id === eventId);
                if (event && event.location) {
                    Object.assign(event.location, ids);
                }
            });
        }
    },
    removeEvent: (dayIndex, eventId) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (day) {
            day.events = day.events.filter(e => e.id !== eventId);
        }
    }),
    reorderEvents: (dayIndex, events) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (day) {
            day.events = events;
        }
    }),
    moveEvent: (fromDayIdx, toDayIdx, eventId, newPosition) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const sourceDay = trip.dailyTimeline[fromDayIdx];
        if (!sourceDay)
            return;
        const eventIndex = sourceDay.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1)
            return;
        const [eventToMove] = sourceDay.events.splice(eventIndex, 1);
        const targetDay = trip.dailyTimeline[toDayIdx];
        if (!targetDay)
            return;
        if (typeof newPosition === 'number') {
            targetDay.events.splice(newPosition, 0, eventToMove);
        }
        else {
            targetDay.events.push(eventToMove);
        }
    }),
    updateEventTransport: (dayIndex, eventId, transport) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const day = trip.dailyTimeline[dayIndex];
        if (!day)
            return;
        const eventIdx = day.events.findIndex(e => e.id === eventId);
        if (eventIdx === -1)
            return;
        const event = day.events[eventIdx];
        event.transportToNext = transport;
        // Intelligent Time Shifting:
        // If travel time changed, shift the START time of the NEXT event if it's flexible or auto-generated
        const nextEvent = day.events[eventIdx + 1];
        if (nextEvent && (nextEvent.isFlexible || nextEvent.isAutoGenerated)) {
            const currentStartTime = event.endTime || event.startTime || '09:00';
            const [h, m] = currentStartTime.split(':').map(Number);
            const totalMins = h * 60 + m + transport.durationMinutes;
            const newStart = `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
            nextEvent.startTime = newStart;
        }
    }),
    addPrepTask: (task) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.prepTimeline.push(task);
    }),
    updatePrepTask: (id, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const task = trip.prepTimeline.find(t => t.id === id);
        if (task) {
            Object.assign(task, updates);
        }
    }),
    removePrepTask: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.prepTimeline = trip.prepTimeline.filter(t => t.id !== id);
    }),
    togglePrepTask: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const task = trip.prepTimeline.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'active' ? 'upcoming' : 'active';
        }
    })
});
exports.createTimelineSlice = createTimelineSlice;

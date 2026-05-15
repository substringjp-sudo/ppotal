import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { AIRPORTS } from '../../lib/airports';
import { FlightSegment, DrivingSegment, PublicTransportSegment, TransportReservation, Trip, TripEvent } from '../../types/trip';
import { generateId } from '../../types/common';
import { resolveRegionIdsFromLocation } from '../../lib/region-service';
import { updateTripState } from '../utils';
import { calculateFlightDuration } from '../../lib/flight-utils';
import { timeToMinutes, minutesToTime } from '../../lib/utils';

export interface TransportSlice {
    updateTransportSettings: (settings: Partial<Trip['transportSettings']>) => void;
    addFlight: (type: 'outbound' | 'inbound' | 'other') => void;
    updateFlight: (id: string, updates: Partial<FlightSegment>) => Promise<void>;
    removeFlight: (id: string) => void;
    addDriving: () => void;
    updateDriving: (id: string, updates: Partial<DrivingSegment>) => Promise<void>;
    removeDriving: (id: string) => void;
    addPublicTransport: () => void;
    updatePublicTransport: (id: string, updates: Partial<PublicTransportSegment>) => Promise<void>;
    removePublicTransport: (id: string) => void;
    addTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string) => void;
    updateTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string, resId: string, updates: Partial<TransportReservation>) => void;
    removeTransportReservation: (category: 'flight' | 'driving' | 'public', parentId: string, resId: string) => void;
}

export const createTransportSlice: StateCreator<TripState, [], [], TransportSlice> = (set, get) => ({
    updateTransportSettings: (settings) => updateTripState(set, get, (draft) => {
        Object.assign(draft.transportSettings, settings);
    }),

    addFlight: (type) => updateTripState(set, get, (draft) => {
        const newFlight: FlightSegment = {
            id: generateId(),
            type,
            date: type === 'inbound' ? draft.dates.endDate : draft.dates.startDate,
            isRoundTrip: false,
            isInternational: false,
            reservations: []
        };
        draft.flights.push(newFlight);
    }),

    updateFlight: async (id, updates) => {
        // Resolve region IDs upfront if location or coordinates provided
        const depIds = (updates.departureLocation || (updates.departureLat !== undefined && updates.departureLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.departureLocation, updates.departureLat, updates.departureLng)
            : null;
        
        const arrIds = (updates.arrivalLocation || (updates.arrivalLat !== undefined && updates.arrivalLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.arrivalLocation, updates.arrivalLat, updates.arrivalLng)
            : null;

        updateTripState(set, get, (draft) => {
            const flight = draft.flights.find(f => f.id === id);
            if (!flight) return;

            // 1. Basic field updates
            Object.assign(flight, updates);

            // 2. Region Info Update
            if (depIds) {
                flight.departureCountryId = depIds.countryId;
                flight.departurePrefectureId = depIds.prefectureId;
                flight.departureCityId = depIds.cityId;
            }
            if (arrIds) {
                flight.arrivalCountryId = arrIds.countryId;
                flight.arrivalPrefectureId = arrIds.prefectureId;
                flight.arrivalCityId = arrIds.cityId;
            }

            // Auto-detect international
            if (flight.departureCountryId !== undefined && flight.arrivalCountryId !== undefined) {
                flight.isInternational = flight.departureCountryId !== flight.arrivalCountryId;
            }

            // 3. Round-Trip Synchronization
            if (updates.isRoundTrip === true) {
                if (flight.type === 'other') flight.type = 'outbound';
                const oppositeType = flight.type === 'outbound' ? 'inbound' : 'outbound';
                const linked = draft.flights.find(f => f.id !== id && f.type === oppositeType);

                if (linked) {
                    linked.linkedFlightId = id;
                    linked.isRoundTrip = true;
                    linked.departureLocation = flight.arrivalLocation;
                    linked.departureCountryId = flight.arrivalCountryId;
                    linked.departurePrefectureId = flight.arrivalPrefectureId;
                    linked.departureCityId = flight.arrivalCityId;
                    linked.arrivalLocation = flight.departureLocation;
                    linked.arrivalCountryId = flight.departureCountryId;
                    linked.arrivalPrefectureId = flight.departurePrefectureId;
                    linked.arrivalCityId = flight.departureCityId;
                    linked.airline = flight.airline;
                    linked.isInternational = flight.isInternational;
                    linked.isBooked = flight.isBooked;
                    linked.isCostUndecided = flight.isCostUndecided;
                    flight.linkedFlightId = linked.id;
                } else {
                    const newId = generateId();
                    const newFlight: FlightSegment = {
                        id: newId,
                        type: oppositeType,
                        date: oppositeType === 'inbound' ? draft.dates.endDate : draft.dates.startDate,
                        departureLocation: flight.arrivalLocation || '',
                        departureCountryId: flight.arrivalCountryId,
                        departurePrefectureId: flight.arrivalPrefectureId,
                        departureCityId: flight.arrivalCityId,
                        arrivalLocation: flight.departureLocation || '',
                        arrivalCountryId: flight.departureCountryId,
                        arrivalPrefectureId: flight.departurePrefectureId,
                        arrivalCityId: flight.departureCityId,
                        airline: flight.airline,
                        isInternational: flight.isInternational,
                        isRoundTrip: true,
                        isBooked: flight.isBooked,
                        isCostUndecided: flight.isCostUndecided,
                        linkedFlightId: id,
                        reservations: []
                    };
                    draft.flights.push(newFlight);
                    flight.linkedFlightId = newId;
                }
            } else if (updates.isRoundTrip === false) {
                if (flight.linkedFlightId) {
                    const linked = draft.flights.find(f => f.id === flight.linkedFlightId);
                    if (linked) {
                        linked.isRoundTrip = false;
                        linked.linkedFlightId = undefined;
                    }
                    flight.linkedFlightId = undefined;
                }
            }

            // Sync properties to linked flight
            if (flight.isRoundTrip && flight.linkedFlightId) {
                const linked = draft.flights.find(f => f.id === flight.linkedFlightId);
                if (linked) {
                    if (depIds) {
                        linked.arrivalLocation = flight.departureLocation;
                        linked.arrivalCountryId = depIds.countryId;
                        linked.arrivalPrefectureId = depIds.prefectureId;
                        linked.arrivalCityId = depIds.cityId;
                        linked.arrivalLat = updates.departureLat;
                        linked.arrivalLng = updates.departureLng;
                    }
                    if (arrIds) {
                        linked.departureLocation = flight.arrivalLocation;
                        linked.departureCountryId = arrIds.countryId;
                        linked.departurePrefectureId = arrIds.prefectureId;
                        linked.departureCityId = arrIds.cityId;
                        linked.departureLat = updates.arrivalLat;
                        linked.departureLng = updates.arrivalLng;
                    }
                    if (updates.isInternational !== undefined) linked.isInternational = updates.isInternational;
                    if (updates.isBooked !== undefined) linked.isBooked = updates.isBooked;
                    if (updates.isCostUndecided !== undefined) linked.isCostUndecided = updates.isCostUndecided;
                    if (updates.airline !== undefined) linked.airline = updates.airline;
                }
            }

            // 4. Time Calculation & Timeline Sync
            if (flight.departureTime && flight.arrivalTime && flight.departureLocation && flight.arrivalLocation) {
                // Auto-calculate duration
                const newDuration = calculateFlightDuration(
                    flight.departureTime,
                    flight.arrivalTime,
                    flight.departureLocation,
                    flight.arrivalLocation,
                    false // Same day logic handles internally
                );
                flight.flightDurationMinutes = newDuration;
            }

            // Sync to Timeline
            if (flight.date && flight.departureLocation && flight.arrivalLocation) {
                // 1. Remove old auto-generated events for this flight
                draft.dailyTimeline.forEach(day => {
                    day.events = day.events.filter(e => !(e.sourceId === id && e.autoGeneratedType === 'flight-segment'));
                });

                if (flight.departureTime && flight.arrivalTime) {
                    const dayIndex = draft.dailyTimeline.findIndex(d => d.date === flight.date);
                    if (dayIndex !== -1) {
                        const prepDur = flight.prepDurationMinutes || 120; // Default 2h
                        const entryDur = flight.entryDurationMinutes || 60; // Default 1h
                        const flightDur = flight.flightDurationMinutes || 0;

                        const depMin = timeToMinutes(flight.departureTime);
                        const arrMin = depMin + flightDur; // Potential for > 1440 if next day

                        // Event 1: Airport Prep
                        draft.dailyTimeline[dayIndex].events.push({
                            id: generateId(),
                            title: `[공항 대기] ${flight.departureLocation}`,
                            type: 'transport',
                            isFixedTime: true,
                            startTime: minutesToTime(depMin - prepDur),
                            endTime: flight.departureTime,
                            sourceId: id,
                            autoGeneratedType: 'flight-segment',
                            isAutoGenerated: true,
                            maturity: 'confirmed'
                        } as TripEvent);

                        // Event 2: Flight
                        draft.dailyTimeline[dayIndex].events.push({
                            id: generateId(),
                            title: `[비행] ${flight.departureLocation} → ${flight.arrivalLocation}`,
                            type: 'transport',
                            isFixedTime: true,
                            startTime: flight.departureTime,
                            endTime: flight.arrivalTime,
                            sourceId: id,
                            autoGeneratedType: 'flight-segment',
                            isAutoGenerated: true,
                            maturity: 'confirmed'
                        } as TripEvent);

                        // Event 3: Entry Processing
                        let entryDayIndex = dayIndex;
                        if (arrMin >= 1440) {
                             entryDayIndex++;
                        }
                        
                        if (draft.dailyTimeline[entryDayIndex]) {
                            draft.dailyTimeline[entryDayIndex].events.push({
                                id: generateId(),
                                title: `[입국 수속] ${flight.arrivalLocation}`,
                                type: 'transport',
                                isFixedTime: true,
                                startTime: flight.arrivalTime,
                                endTime: minutesToTime(timeToMinutes(flight.arrivalTime) + entryDur),
                                sourceId: id,
                                autoGeneratedType: 'flight-segment',
                                isAutoGenerated: true,
                                maturity: 'confirmed'
                            } as TripEvent);
                        }
                    }
                }
            }
        });
    },

    removeFlight: (id) => updateTripState(set, get, (draft) => {
        const target = draft.flights.find(f => f.id === id);
        if (target?.linkedFlightId) {
            const linked = draft.flights.find(f => f.id === target.linkedFlightId);
            if (linked) {
                linked.isRoundTrip = false;
                linked.linkedFlightId = undefined;
            }
        }
        draft.flights = draft.flights.filter(f => f.id !== id);

        // Remove timeline events
        draft.dailyTimeline.forEach(day => {
            day.events = day.events.filter(e => !(e.sourceId === id && e.autoGeneratedType === 'flight-segment'));
        });
    }),

    addDriving: () => updateTripState(set, get, (draft) => {
        draft.driving.push({
            id: generateId(),
            vehicleType: 'sedan' as const,
            isRental: false,
            isReturnSameAsPickup: true,
            pickupTime: `${draft.dates.startDate}T09:00`,
            returnTime: `${draft.dates.endDate}T09:00`,
            date: draft.dates.startDate,
            reservations: []
        } as DrivingSegment);
    }),

    updateDriving: async (id, updates) => {
        const pickupIds = (updates.pickupLocation || (updates.pickupLat !== undefined && updates.pickupLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.pickupLocation, updates.pickupLat, updates.pickupLng)
            : null;

        const returnIds = (updates.returnLocation || (updates.returnLat !== undefined && updates.returnLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.returnLocation, updates.returnLat, updates.returnLng)
            : null;

        updateTripState(set, get, (draft) => {
            const item = draft.driving.find(d => d.id === id);
            if (!item) return;

            Object.assign(item, updates);

            if (pickupIds) {
                item.pickupCountryId = pickupIds.countryId;
                item.pickupPrefectureId = pickupIds.prefectureId;
                item.pickupCityId = pickupIds.cityId;
            }
            if (returnIds) {
                item.returnCountryId = returnIds.countryId;
                item.returnPrefectureId = returnIds.prefectureId;
                item.returnCityId = returnIds.cityId;
            }
        });
    },

    removeDriving: (id) => updateTripState(set, get, (draft) => {
        draft.driving = draft.driving.filter(d => d.id !== id);
    }),

    addPublicTransport: () => updateTripState(set, get, (draft) => {
        draft.publicTransport.push({
            id: generateId(),
            type: 'bus' as const,
            date: draft.dates.startDate,
            departureTime: '09:00',
            arrivalTime: '10:00',
            duration: 60,
            reservations: []
        } as PublicTransportSegment);
    }),

    updatePublicTransport: async (id, updates) => {
        const depIds = (updates.departureLocation || (updates.departureLat !== undefined && updates.departureLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.departureLocation, updates.departureLat, updates.departureLng)
            : null;

        const arrIds = (updates.arrivalLocation || (updates.arrivalLat !== undefined && updates.arrivalLng !== undefined))
            ? await resolveRegionIdsFromLocation(updates.arrivalLocation, updates.arrivalLat, updates.arrivalLng)
            : null;

        updateTripState(set, get, (draft) => {
            const item = draft.publicTransport.find(p => p.id === id);
            if (!item) return;

            Object.assign(item, updates);

            if (depIds) {
                item.departureCountryId = depIds.countryId;
                item.departurePrefectureId = depIds.prefectureId;
                item.departureCityId = depIds.cityId;
            }
            if (arrIds) {
                item.arrivalCountryId = arrIds.countryId;
                item.arrivalPrefectureId = arrIds.prefectureId;
                item.arrivalCityId = arrIds.cityId;
            }
        });
    },

    removePublicTransport: (id) => updateTripState(set, get, (draft) => {
        draft.publicTransport = draft.publicTransport.filter(p => p.id !== id);
    }),

    addTransportReservation: (category, parentId) => updateTripState(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport) as Array<FlightSegment | DrivingSegment | PublicTransportSegment>;
        const item = list.find(i => i.id === parentId);
        if (item) item.reservations.push({ id: generateId(), date: '', title: '' });
    }),

    updateTransportReservation: (category, parentId, resId, updates) => updateTripState(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport) as Array<FlightSegment | DrivingSegment | PublicTransportSegment>;
        const item = list.find(i => i.id === parentId);
        const res = item?.reservations.find((r) => r.id === resId);
        if (res) Object.assign(res, updates);
    }),

    removeTransportReservation: (category, parentId, resId) => updateTripState(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport) as Array<FlightSegment | DrivingSegment | PublicTransportSegment>;
        const item = list.find(i => i.id === parentId);
        if (item) item.reservations = item.reservations.filter((r) => r.id !== resId);
    })
});

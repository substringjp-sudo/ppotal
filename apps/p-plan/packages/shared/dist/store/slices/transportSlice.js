"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransportSlice = void 0;
const common_1 = require("../../types/common");
const region_service_1 = require("../../lib/region-service");
const utils_1 = require("../utils");
const flight_utils_1 = require("../../lib/flight-utils");
const utils_2 = require("../../lib/utils");
const createTransportSlice = (set, get) => ({
    updateTransportSettings: (settings) => (0, utils_1.updateTripState)(set, get, (draft) => {
        Object.assign(draft.transportSettings, settings);
    }),
    addFlight: (type) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const newFlight = {
            id: (0, common_1.generateId)(),
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
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.departureLocation, updates.departureLat, updates.departureLng)
            : null;
        const arrIds = (updates.arrivalLocation || (updates.arrivalLat !== undefined && updates.arrivalLng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.arrivalLocation, updates.arrivalLat, updates.arrivalLng)
            : null;
        (0, utils_1.updateTripState)(set, get, (draft) => {
            const flight = draft.flights.find(f => f.id === id);
            if (!flight)
                return;
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
                if (flight.type === 'other')
                    flight.type = 'outbound';
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
                }
                else {
                    const newId = (0, common_1.generateId)();
                    const newFlight = {
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
            }
            else if (updates.isRoundTrip === false) {
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
                    if (updates.isInternational !== undefined)
                        linked.isInternational = updates.isInternational;
                    if (updates.isBooked !== undefined)
                        linked.isBooked = updates.isBooked;
                    if (updates.isCostUndecided !== undefined)
                        linked.isCostUndecided = updates.isCostUndecided;
                    if (updates.airline !== undefined)
                        linked.airline = updates.airline;
                }
            }
            // 4. Time Calculation & Timeline Sync
            if (flight.departureTime && flight.arrivalTime && flight.departureLocation && flight.arrivalLocation) {
                // Auto-calculate duration
                const newDuration = (0, flight_utils_1.calculateFlightDuration)(flight.departureTime, flight.arrivalTime, flight.departureLocation, flight.arrivalLocation, false // Same day logic handles internally
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
                        const depMin = (0, utils_2.timeToMinutes)(flight.departureTime);
                        const arrMin = depMin + flightDur; // Potential for > 1440 if next day
                        // Event 1: Airport Prep
                        draft.dailyTimeline[dayIndex].events.push({
                            id: (0, common_1.generateId)(),
                            title: `[공항 대기] ${flight.departureLocation}`,
                            type: 'transport',
                            isFixedTime: true,
                            startTime: (0, utils_2.minutesToTime)(depMin - prepDur),
                            endTime: flight.departureTime,
                            sourceId: id,
                            autoGeneratedType: 'flight-segment',
                            isAutoGenerated: true,
                            maturity: 'confirmed'
                        });
                        // Event 2: Flight
                        draft.dailyTimeline[dayIndex].events.push({
                            id: (0, common_1.generateId)(),
                            title: `[비행] ${flight.departureLocation} → ${flight.arrivalLocation}`,
                            type: 'transport',
                            isFixedTime: true,
                            startTime: flight.departureTime,
                            endTime: flight.arrivalTime,
                            sourceId: id,
                            autoGeneratedType: 'flight-segment',
                            isAutoGenerated: true,
                            maturity: 'confirmed'
                        });
                        // Event 3: Entry Processing
                        let entryDayIndex = dayIndex;
                        if (arrMin >= 1440) {
                            entryDayIndex++;
                        }
                        if (draft.dailyTimeline[entryDayIndex]) {
                            draft.dailyTimeline[entryDayIndex].events.push({
                                id: (0, common_1.generateId)(),
                                title: `[입국 수속] ${flight.arrivalLocation}`,
                                type: 'transport',
                                isFixedTime: true,
                                startTime: flight.arrivalTime,
                                endTime: (0, utils_2.minutesToTime)((0, utils_2.timeToMinutes)(flight.arrivalTime) + entryDur),
                                sourceId: id,
                                autoGeneratedType: 'flight-segment',
                                isAutoGenerated: true,
                                maturity: 'confirmed'
                            });
                        }
                    }
                }
            }
        });
    },
    removeFlight: (id) => (0, utils_1.updateTripState)(set, get, (draft) => {
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
    addDriving: () => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.driving.push({
            id: (0, common_1.generateId)(),
            vehicleType: 'sedan',
            isRental: false,
            isReturnSameAsPickup: true,
            pickupTime: `${draft.dates.startDate}T09:00`,
            returnTime: `${draft.dates.endDate}T09:00`,
            date: draft.dates.startDate,
            reservations: []
        });
    }),
    updateDriving: async (id, updates) => {
        const pickupIds = (updates.pickupLocation || (updates.pickupLat !== undefined && updates.pickupLng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.pickupLocation, updates.pickupLat, updates.pickupLng)
            : null;
        const returnIds = (updates.returnLocation || (updates.returnLat !== undefined && updates.returnLng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.returnLocation, updates.returnLat, updates.returnLng)
            : null;
        (0, utils_1.updateTripState)(set, get, (draft) => {
            const item = draft.driving.find(d => d.id === id);
            if (!item)
                return;
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
    removeDriving: (id) => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.driving = draft.driving.filter(d => d.id !== id);
    }),
    addPublicTransport: () => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.publicTransport.push({
            id: (0, common_1.generateId)(),
            type: 'bus',
            date: draft.dates.startDate,
            departureTime: '09:00',
            arrivalTime: '10:00',
            duration: 60,
            reservations: []
        });
    }),
    updatePublicTransport: async (id, updates) => {
        const depIds = (updates.departureLocation || (updates.departureLat !== undefined && updates.departureLng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.departureLocation, updates.departureLat, updates.departureLng)
            : null;
        const arrIds = (updates.arrivalLocation || (updates.arrivalLat !== undefined && updates.arrivalLng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.arrivalLocation, updates.arrivalLat, updates.arrivalLng)
            : null;
        (0, utils_1.updateTripState)(set, get, (draft) => {
            const item = draft.publicTransport.find(p => p.id === id);
            if (!item)
                return;
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
    removePublicTransport: (id) => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.publicTransport = draft.publicTransport.filter(p => p.id !== id);
    }),
    addTransportReservation: (category, parentId) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport);
        const item = list.find(i => i.id === parentId);
        if (item)
            item.reservations.push({ id: (0, common_1.generateId)(), date: '', title: '' });
    }),
    updateTransportReservation: (category, parentId, resId, updates) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport);
        const item = list.find(i => i.id === parentId);
        const res = item?.reservations.find((r) => r.id === resId);
        if (res)
            Object.assign(res, updates);
    }),
    removeTransportReservation: (category, parentId, resId) => (0, utils_1.updateTripState)(set, get, (draft) => {
        const list = (category === 'flight' ? draft.flights : category === 'driving' ? draft.driving : draft.publicTransport);
        const item = list.find(i => i.id === parentId);
        if (item)
            item.reservations = item.reservations.filter((r) => r.id !== resId);
    })
});
exports.createTransportSlice = createTransportSlice;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTripInfoSlice = void 0;
const common_1 = require("../../types/common");
const airports_1 = require("../../lib/airports");
const region_service_1 = require("../../lib/region-service");
const trip_validator_1 = require("../../lib/trip-validator");
const tripService_1 = require("../../lib/tripService");
const utils_1 = require("../utils");
const currency_utils_1 = require("../../lib/currency-utils");
const exchangeRateStore_1 = require("../exchangeRateStore");
const userStore_1 = require("../userStore");
const createTripInfoSlice = (set, get) => ({
    trips: [],
    currentTrip: null,
    isSaving: false,
    geometries: {},
    setTrips: (trips) => set({ trips }),
    setIsSaving: (isSaving) => set({ isSaving }),
    setCurrentTrip: (trip) => {
        set({ currentTrip: trip });
        if (trip) {
            get().validateTrip();
        }
    },
    addTrip: (trip) => set((state) => ({
        trips: [...state.trips, trip],
        currentTrip: trip
    })),
    deleteTrip: async (id) => {
        const userId = userStore_1.useUserStore.getState().profile?.userId;
        if (userId) {
            try {
                const { deleteTrip: deleteFromDb } = await Promise.resolve().then(() => __importStar(require('../../lib/tripService')));
                await deleteFromDb(id);
            }
            catch (error) {
                console.error("Failed to delete trip from Firestore:", error);
            }
        }
        set((state) => ({
            trips: state.trips.filter((t) => t.id !== id),
            currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
        }));
    },
    validateTrip: () => set((state) => {
        if (!state.currentTrip)
            return state;
        const travelStyle = userStore_1.useUserStore.getState().profile?.travelStyle;
        const warnings = (0, trip_validator_1.validateTrip)(state.currentTrip, state.geometries, travelStyle);
        return {
            currentTrip: { ...state.currentTrip, warnings }
        };
    }),
    loadGeometries: async () => {
        // 지형 데이터 호출 중단 (404 에러 방지 및 성능 최적화)
        get().validateTrip();
    },
    fetchTrip: async (id) => {
        try {
            const { getTrip } = await Promise.resolve().then(() => __importStar(require('../../lib/tripService')));
            const trip = await getTrip(id);
            if (trip) {
                set({ currentTrip: trip });
                get().validateTrip();
            }
        }
        catch (error) {
            console.error("Failed to fetch trip:", error);
        }
    },
    createTrip: async (wizardData, userId, userProfile) => {
        const totalParticipants = wizardData.isParticipantsUndecided
            ? 0
            : wizardData.participants.reduce((acc, p) => acc + p.count, 0);
        // Resolve IDs for locations
        const regions = [];
        for (const locItem of wizardData.locationDetails) {
            let ids = locItem.regionIds;
            // Fallback if regionIds are missing (e.g. legacy data or manual set)
            if (!ids) {
                ids = await (0, region_service_1.resolveRegionIdsFromLocation)(locItem.name);
            }
            const id = ids.cityId || ids.prefectureId || ids.countryId;
            if (id) {
                let type = 'country';
                if (ids.cityId)
                    type = 'city';
                else if (ids.prefectureId)
                    type = 'prefecture';
                regions.push({
                    id,
                    type,
                    name: locItem.name,
                    countryId: ids.countryId,
                    prefectureId: ids.prefectureId,
                    cityId: ids.cityId
                });
            }
        }
        // Try to resolve center location
        let center = { lat: 37.5665, lng: 126.9780 }; // Default Seoul
        if (wizardData.locations.length > 0) {
            const firstLoc = wizardData.locations[0];
            const airportMatch = airports_1.AIRPORTS.find(a => (a.regionIds.cityName?.includes(firstLoc)) ||
                (a.regionIds.prefectureName?.includes(firstLoc)) ||
                a.nameKo.includes(firstLoc) || a.nameEn.toLowerCase().includes(firstLoc.toLowerCase()));
            if (airportMatch && airportMatch.lat && airportMatch.lng) {
                center = { lat: airportMatch.lat, lng: airportMatch.lng };
            }
            else {
                const coords = await (0, region_service_1.geocode)(firstLoc);
                if (coords)
                    center = coords;
            }
        }
        // Detect if overseas using consolidated logic
        const isOverseas = (0, region_service_1.checkIsOverseas)(regions, userProfile?.residence?.countryId, userProfile?.residence?.country);
        const newTrip = {
            id: (0, common_1.generateId)(),
            title: wizardData.isLocationUndecided
                ? `미정 지역 ${wizardData.theme} 탐방기`
                : `${wizardData.locations[0] || '미정'} 중심 ${wizardData.theme} 탐방기`,
            titleSuggestion: wizardData.titleSuggestion,
            dates: {
                startDate: wizardData.isDateUndecided ? '' : wizardData.startDate,
                endDate: wizardData.isDateUndecided ? '' : wizardData.endDate,
                flexibilityDays: wizardData.flexibility,
                isUndecided: wizardData.isDateUndecided,
                durationDays: wizardData.durationDays
            },
            participants: wizardData.isParticipantsUndecided
                ? []
                : wizardData.participants.filter(p => p.count > 0).flatMap((p, idx) => Array.from({ length: p.count }).map((_, i) => {
                    const isMe = p.type === '나' && i === 0;
                    const participantId = isMe && userId ? userId : (0, common_1.generateId)();
                    return {
                        id: participantId,
                        name: isMe ? (userProfile?.displayName || '나') : `${p.type} ${i + 1}`,
                        role: isMe ? 'me' : 'group member',
                        status: 'accepted'
                    };
                })),
            budget: {
                commonAllocated: wizardData.isBudgetUnlimited
                    ? 0
                    : (wizardData.budgetType === 'TOTAL' ? wizardData.amount : wizardData.amount * totalParticipants),
                individualAllocated: wizardData.isBudgetUnlimited
                    ? 0
                    : (wizardData.budgetType === 'PER_PERSON' ? wizardData.amount : 0),
                totalAllocated: wizardData.isBudgetUnlimited ? 0 : (wizardData.budgetType === 'TOTAL' ? wizardData.amount : wizardData.amount * totalParticipants),
                baseCurrency: 'KRW',
                currency: 'KRW',
                activeCurrencies: [],
                exchanges: [],
                expenses: [],
                participantBudgets: (wizardData.isParticipantsUndecided || wizardData.isBudgetUnlimited)
                    ? []
                    : wizardData.participants.filter(p => p.count > 0).flatMap((p, idx) => Array.from({ length: p.count }).map((_, i) => {
                        const isMe = p.type === '나' && i === 0;
                        const participantId = isMe && userId ? userId : (0, common_1.generateId)();
                        return {
                            participantId: participantId,
                            allocatedAmount: wizardData.budgetType === 'PER_PERSON' ? wizardData.amount : 0,
                            personalExpenses: []
                        };
                    })),
                excludeFlights: wizardData.excludeFlight,
                excludeAccommodations: wizardData.excludeHotel,
            },
            locations: {
                regionNames: wizardData.isLocationUndecided ? [] : wizardData.locations,
                thumbnailUrl: undefined,
                center,
                regions
            },
            transportSettings: {
                useFlight: !wizardData.excludeFlight,
                useDriving: false
            },
            flights: [],
            driving: [],
            publicTransport: [],
            accommodation: [],
            checklist: [
                { id: '1', title: '여권 유효기간 확인', isDone: false, tags: ['필수'] },
                { id: '2', title: '여행자 보험 가입', isDone: false, tags: ['필수'] },
                { id: '3', title: '포켓 와이파이/eSIM 예약', isDone: false, tags: ['필수'] },
                ...(isOverseas ? [{ id: '4', title: '현지 통화 환전', isDone: false, tags: ['금융'] }] : []),
            ],
            reservations: [],
            bucketList: [],
            dailyTimeline: [],
            healthInfo: { allergies: [], medications: [] },
            timeDifference: '',
            memo: '',
            theme: wizardData.theme,
            isOverseas,
            prepTimeline: [],
            planningStatus: 'ideation',
        };
        // Seamless: Set initial currency based on locations
        if (!wizardData.isLocationUndecided && regions.length > 0) {
            const inferred = (0, currency_utils_1.inferCurrencyFromRegions)(regions);
            if (inferred && inferred !== 'KRW') {
                newTrip.budget.currency = inferred;
                newTrip.budget.activeCurrencies = [
                    {
                        code: inferred,
                        rate: exchangeRateStore_1.useExchangeRateStore.getState().getRate(inferred),
                        symbol: currency_utils_1.CURRENCY_SYMBOLS[inferred] || inferred
                    }
                ];
            }
        }
        set({ currentTrip: newTrip });
        get().validateTrip();
        if (userId) {
            try {
                await (0, tripService_1.saveTrip)(newTrip, { uid: userId, name: userProfile?.displayName || 'Unknown' });
            }
            catch (error) {
                console.error("Failed to save new trip:", error);
            }
        }
        return newTrip.id;
    },
    updateTrip: async (updates) => {
        (0, utils_1.updateTripState)(set, get, (trip) => {
            Object.assign(trip, updates);
        });
        // Trigger side effects for important changes (Location/Regions)
        if (updates.locations?.regionNames || updates.locations?.regions) {
            const currentRegions = updates.locations?.regions || get().currentTrip?.locations.regions || [];
            const currentNames = updates.locations?.regionNames || get().currentTrip?.locations.regionNames || [];
            // Only re-resolve if names were provided but regions weren't, 
            // OR if it's a specific "regionNames" only update.
            const shouldResolve = updates.locations?.regionNames && !updates.locations?.regions;
            const performSideEffects = async (targetRegions) => {
                const userProfile = userStore_1.useUserStore.getState().profile;
                const isOverseas = (0, region_service_1.checkIsOverseas)(targetRegions || [], userProfile?.residence?.countryId, userProfile?.residence?.country);
                const inferred = (0, currency_utils_1.inferCurrencyFromRegions)(targetRegions);
                (0, utils_1.updateTripState)(set, get, (trip) => {
                    trip.locations.regions = targetRegions;
                    trip.isOverseas = isOverseas;
                    if (inferred) {
                        if (!trip.budget.activeCurrencies)
                            trip.budget.activeCurrencies = [];
                        const exists = trip.budget.activeCurrencies.some(c => c.code === inferred);
                        if (!exists) {
                            trip.budget.activeCurrencies.push({
                                code: inferred,
                                rate: exchangeRateStore_1.useExchangeRateStore.getState().getRate(inferred),
                                symbol: currency_utils_1.CURRENCY_SYMBOLS[inferred] || inferred
                            });
                        }
                        if (!trip.budget.currency || trip.budget.currency === 'KRW') {
                            trip.budget.currency = inferred;
                            trip.budget.targetCurrency = inferred;
                            trip.budget.exchangeRate = exchangeRateStore_1.useExchangeRateStore.getState().getRate(inferred);
                        }
                    }
                });
                get().validateTrip();
            };
            if (shouldResolve) {
                const resolvedRegions = [];
                for (const loc of currentNames) {
                    const ids = await (0, region_service_1.resolveRegionIdsFromLocation)(loc);
                    const id = ids.cityId || ids.prefectureId || ids.countryId;
                    if (id) {
                        resolvedRegions.push({
                            id,
                            type: ids.cityId ? 'city' : (ids.prefectureId ? 'prefecture' : 'country'),
                            name: loc,
                            countryId: ids.countryId,
                            prefectureId: ids.prefectureId,
                            cityId: ids.cityId
                        });
                    }
                }
                await performSideEffects(resolvedRegions);
            }
            else {
                // If regions already provided, just run overseas/currency check
                await performSideEffects(currentRegions);
            }
        }
        // Validation is automatically handled inside updateTripState.
        // If specific logic is needed after update, it can be added here.
    },
    addParticipant: (p) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const id = (0, common_1.generateId)();
        trip.participants.push({ ...p, id });
        // Seamless: Add to budget
        if (!trip.budget.participantBudgets)
            trip.budget.participantBudgets = [];
        trip.budget.participantBudgets.push({
            participantId: id,
            allocatedAmount: trip.budget.individualAllocated || 0,
            personalExpenses: []
        });
    }),
    removeParticipant: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.participants = trip.participants.filter(p => p.id !== id);
        // Seamless: Remove from budget
        trip.budget.participantBudgets = trip.budget.participantBudgets.filter(pb => pb.participantId !== id);
        // Seamless: Orphan expenses
        trip.budget.expenses = trip.budget.expenses.map(e => e.participantId === id ? { ...e, participantId: undefined } : e);
    }),
    updateParticipant: (id, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const index = trip.participants.findIndex(p => p.id === id);
        if (index !== -1) {
            trip.participants[index] = { ...trip.participants[index], ...updates };
        }
    }),
    updateChecklistItem: (id, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const item = trip.checklist.find((i) => i.id === id);
        if (item) {
            Object.assign(item, updates);
        }
    }),
    addChecklistItem: (item) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const existingItem = trip.checklist.find((i) => i.title === item.title);
        if (existingItem) {
            if (item.tags) {
                const newTags = Array.from(new Set([...(existingItem.tags || []), ...item.tags]));
                existingItem.tags = newTags;
            }
        }
        else {
            trip.checklist.push({
                id: (0, common_1.generateId)(),
                title: item.title,
                isDone: false,
                tags: item.tags || []
            });
        }
    }),
    removeChecklistItem: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.checklist = trip.checklist.filter((item) => item.id !== id);
    }),
    addBucketListItem: (item) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.bucketList.push({ id: (0, common_1.generateId)(), ...item });
    }),
    updateBucketListItem: (id, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        const item = trip.bucketList.find(i => i.id === id);
        if (item) {
            Object.assign(item, updates);
        }
    }),
    removeBucketListItem: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        trip.bucketList = trip.bucketList.filter((item) => item.id !== id);
    })
});
exports.createTripInfoSlice = createTripInfoSlice;

import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { Trip } from '../../types/trip';
import { generateId } from '../../types/common';
import { WizardState } from '../wizardStore';
import { AIRPORTS } from '../../lib/airports';
import { resolveRegionIdsFromLocation, geocode, checkIsOverseas } from '../../lib/region-service';

import { validateTrip as validateTripFn } from '../../lib/trip-validator';
import { type GeoJSONGeometry } from '../../lib/geometry-service';
import { saveTrip } from '../../lib/tripService';
import { updateTripState } from '../utils';
import { inferCurrencyFromRegions, DEFAULT_EXCHANGE_RATES, CURRENCY_SYMBOLS } from '../../lib/currency-utils';
import { useExchangeRateStore } from '../exchangeRateStore';
import { useUserStore } from '../userStore';

export interface TripInfoSlice {
    trips: Trip[];
    currentTrip: Trip | null;
    isSaving: boolean;
    geometries: Record<string, GeoJSONGeometry>;

    setTrips: (trips: Trip[]) => void;
    setCurrentTrip: (trip: Trip | null) => void;
    setIsSaving: (isSaving: boolean) => void;
    addTrip: (trip: Trip) => void;
    deleteTrip: (id: string) => void;
    clearAllTrips: () => void;
    createTrip: (wizardData: WizardState, userId?: string, userProfile?: import('../../types/user').UserProfile | null) => Promise<string | void>;
    updateTrip: (idOrUpdates: string | Partial<Trip>, updates?: Partial<Trip>) => Promise<void>;
    updateChecklistItem: (id: string, updates: Partial<import('../../types/trip').ChecklistItem>) => void;
    addChecklistItem: (item: { title: string, tags?: string[] }) => void;
    removeChecklistItem: (id: string) => void;
    addBucketListItem: (item: Omit<import('../../types/trip').BucketListItem, 'id'>) => void;
    updateBucketListItem: (id: string, updates: Partial<import('../../types/trip').BucketListItem>) => void;
    removeBucketListItem: (id: string) => void;
    addParticipant: (participant: Omit<import('../../types/trip').Participant, 'id'>) => void;
    removeParticipant: (id: string) => void;
    updateParticipant: (id: string, updates: Partial<import('../../types/trip').Participant>) => void;
    validateTrip: () => void;
    loadGeometries: () => Promise<void>;
    fetchTrip: (id: string) => Promise<void>;
    finishTrip: (id: string) => void;
    addTimelineEvent: (tripId: string, date: string, event: Partial<import('../../types/trip').TripEvent>) => void;
}

export const createTripInfoSlice: StateCreator<TripState, [], [], TripInfoSlice> = (set, get) => ({
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

    addTrip: (trip) => {
        set((state) => ({ 
            trips: [trip, ...state.trips],
            currentTrip: trip 
        }));

        // Conditional background sync
        const userId = useUserStore.getState().profile?.userId;
        if (userId) {
            import('../../lib/tripService').then(({ saveTrip }) => {
                saveTrip(trip, { uid: userId, name: useUserStore.getState().profile?.displayName || 'Unknown' })
                    .catch(err => console.error("PPLANER: Background sync failed (addTrip):", err));
            });
        }
    },

    deleteTrip: async (id) => {
        console.log("PPLANER: Optimistic delete for trip", id);
        
        // 1. Update local state first for instant UI response
        set((state) => {
            const newTrips = state.trips.filter((t) => t.id !== id);
            return {
                trips: newTrips,
                currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
            };
        });

        // 2. Perform background deletion in Firestore
        const userId = useUserStore.getState().profile?.userId;
        if (userId) {
            try {
                const { deleteTrip: deleteFromDb } = await import('../../lib/tripService');
                await deleteFromDb(id);
                console.log("PPLANER: Firestore trip deleted", id);
            } catch (error) {
                console.error("PPLANER: Failed to delete trip from Firestore:", error);
                // Optionally: Rollback local state if needed, but for simplicity we assume success
            }
        }
    },
    
    clearAllTrips: () => set({ trips: [], currentTrip: null }),

    validateTrip: () => set((state) => {
        if (!state.currentTrip) return state;
        const travelStyle = useUserStore.getState().profile?.travelStyle;
        const warnings = validateTripFn(state.currentTrip, state.geometries, travelStyle);
        return {
            currentTrip: { ...state.currentTrip, warnings }
        };
    }),

    loadGeometries: async () => {
        // 지형 데이터 호출 중단 (404 에러 방지 및 성능 최적화)
        get().validateTrip();
    },

    fetchTrip: async (id: string) => {
        try {
            const { getTrip } = await import('../../lib/tripService');
            const trip = await getTrip(id);
            if (trip) {
                set({ currentTrip: trip });
                get().validateTrip();
            }

        } catch (error) {
            console.error("Failed to fetch trip:", error);
        }
    },

    createTrip: async (wizardData, userId, userProfile) => {

        const totalParticipants = wizardData.isParticipantsUndecided
            ? 0
            : wizardData.participants.reduce((acc, p) => acc + p.count, 0);

        // Resolve IDs for locations
        const regions: Trip['locations']['regions'] = [];
        for (const locItem of wizardData.locationDetails) {
            let ids = locItem.regionIds;
            
            // Fallback if regionIds are missing (e.g. legacy data or manual set)
            if (!ids) {
                ids = await resolveRegionIdsFromLocation(locItem.name);
            }

            const id = ids.cityId || ids.prefectureId || ids.countryId;
            if (id) {
                let type: 'country' | 'prefecture' | 'city' = 'country';
                if (ids.cityId) type = 'city';
                else if (ids.prefectureId) type = 'prefecture';

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
            const airportMatch = AIRPORTS.find(a => 
                (a.regionIds.cityName?.includes(firstLoc)) || 
                (a.regionIds.prefectureName?.includes(firstLoc)) ||
                a.nameKo.includes(firstLoc) || a.nameEn.toLowerCase().includes(firstLoc.toLowerCase())
            );
            
            if (airportMatch && airportMatch.lat && airportMatch.lng) {
                center = { lat: airportMatch.lat, lng: airportMatch.lng };
            } else {
                const coords = await geocode(firstLoc);
                if (coords) center = coords;
            }
        }

        // Detect if overseas using consolidated logic
        const isOverseas = checkIsOverseas(
            regions, 
            userProfile?.residence?.countryId, 
            userProfile?.residence?.country
        );

        const newTrip: Trip = {
            id: generateId(),
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
                : wizardData.participants.filter(p => p.count > 0).flatMap((p, idx) =>
                    Array.from({ length: p.count }).map((_, i) => {
                        const isMe = p.type === '나' && i === 0;
                        const participantId = isMe && userId ? userId : generateId();
                        return {
                            id: participantId,
                            name: isMe ? (userProfile?.displayName || '나') : `${p.type} ${i + 1}`,
                            role: isMe ? 'me' : 'group member',
                            status: 'accepted'
                        };
                    })
                ),
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
                    : wizardData.participants.filter(p => p.count > 0).flatMap((p, idx) =>
                        Array.from({ length: p.count }).map((_, i) => {
                            const isMe = p.type === '나' && i === 0;
                            const participantId = isMe && userId ? userId : generateId();
                            return {
                                participantId: participantId,
                                allocatedAmount: wizardData.budgetType === 'PER_PERSON' ? wizardData.amount : 0,
                                personalExpenses: []
                            };
                        })
                    ),
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
            const inferred = inferCurrencyFromRegions(regions);

            if (inferred && inferred !== 'KRW') {
                newTrip.budget.currency = inferred;
                newTrip.budget.activeCurrencies = [
                    { 
                        code: inferred, 
                        rate: useExchangeRateStore.getState().getRate(inferred),
                        symbol: CURRENCY_SYMBOLS[inferred] || inferred
                    }
                ];
            }
        }

        // 1. Update local state immediately
        set({ currentTrip: newTrip });
        get().validateTrip();

        // 2. Conditional background sync
        if (userId) {
            // Do not await here to keep UI responsive
            import('../../lib/tripService').then(({ saveTrip }) => {
                saveTrip(newTrip, { uid: userId, name: userProfile?.displayName || 'Unknown' })
                    .then(() => console.log("PPLANER: Background sync success (createTrip)"))
                    .catch(error => console.error("PPLANER: Background sync failed (createTrip):", error));
            });
        }

        return newTrip.id;
    },
    updateTrip: async (idOrUpdates: string | Partial<Trip>, updates?: Partial<Trip>) => {
        const actualUpdates = typeof idOrUpdates === 'string' ? updates : idOrUpdates;
        if (!actualUpdates) return;

        updateTripState(set, get, (trip) => {
            Object.assign(trip, actualUpdates);
        });

        // Trigger side effects for important changes (Location/Regions)
        if (actualUpdates.locations?.regionNames || actualUpdates.locations?.regions) {
            const currentTrip = get().currentTrip;
            if (!currentTrip) return;

            const currentRegions = actualUpdates.locations?.regions || currentTrip.locations.regions || [];
            
            const performSideEffects = async (targetRegions: Trip['locations']['regions']) => {
                const userProfile = useUserStore.getState().profile;
                const isOverseas = checkIsOverseas(targetRegions || [], userProfile?.residence?.countryId, userProfile?.residence?.country);
                const inferred = inferCurrencyFromRegions(targetRegions);

                updateTripState(set, get, (trip) => {
                    trip.locations.regions = targetRegions;
                    trip.isOverseas = isOverseas;
                    
                    if (inferred) {
                        if (!trip.budget.activeCurrencies) trip.budget.activeCurrencies = [];
                        const exists = trip.budget.activeCurrencies.some(c => c.code === inferred);
                        if (!exists) {
                            trip.budget.activeCurrencies.push({
                                code: inferred,
                                rate: useExchangeRateStore.getState().getRate(inferred),
                                symbol: CURRENCY_SYMBOLS[inferred] || inferred
                            });
                        }
                    }
                });
            };

            if (actualUpdates.locations?.regionNames && !actualUpdates.locations?.regions) {
                const resolvedRegions = await resolveRegionIdsFromLocation(actualUpdates.locations.regionNames[0]);
                const regions: Trip['locations']['regions'] = [];
                const id = resolvedRegions.cityId || resolvedRegions.prefectureId || resolvedRegions.countryId;
                if (id) {
                    regions.push({
                        id,
                        type: resolvedRegions.cityId ? 'city' : (resolvedRegions.prefectureId ? 'prefecture' : 'country'),
                        name: actualUpdates.locations.regionNames[0],
                        ...resolvedRegions
                    });
                }
                await performSideEffects(regions);
            } else {
                await performSideEffects(currentRegions);
            }
        }

        // Conditional background sync after state update
        const authUserId = useUserStore.getState().profile?.userId;
        const activeTrip = get().currentTrip;
        if (authUserId && activeTrip) {
            import('../../lib/tripService').then(({ updateTripInDb }) => {
                updateTripInDb(activeTrip.id, actualUpdates)
                    .catch(err => console.error("PPLANER: Background sync failed (updateTrip):", err));
            });
        }
    },

    addParticipant: (p) => updateTripState(set, get, (trip) => {
        const id = generateId();
        trip.participants.push({ ...p, id });
        
        // Seamless: Add to budget
        if (!trip.budget.participantBudgets) trip.budget.participantBudgets = [];
        trip.budget.participantBudgets.push({
            participantId: id,
            allocatedAmount: trip.budget.individualAllocated || 0,
            personalExpenses: []
        });
    }),

    removeParticipant: (id) => updateTripState(set, get, (trip) => {
        trip.participants = trip.participants.filter(p => p.id !== id);
        
        // Seamless: Remove from budget
        trip.budget.participantBudgets = trip.budget.participantBudgets.filter(pb => pb.participantId !== id);
        
        // Seamless: Orphan expenses
        trip.budget.expenses = trip.budget.expenses.map(e => 
            e.participantId === id ? { ...e, participantId: undefined } : e
        );
    }),

    updateParticipant: (id, updates) => updateTripState(set, get, (trip) => {
        const index = trip.participants.findIndex(p => p.id === id);
        if (index !== -1) {
            trip.participants[index] = { ...trip.participants[index], ...updates };
        }
    }),

    updateChecklistItem: (id, updates) => updateTripState(set, get, (trip) => {
        const item = trip.checklist.find((i) => i.id === id);
        if (item) {
            Object.assign(item, updates);
        }
    }),

    addChecklistItem: (item) => updateTripState(set, get, (trip) => {
        const existingItem = trip.checklist.find((i) => i.title === item.title);

        if (existingItem) {
            if (item.tags) {
                const newTags = Array.from(new Set([...(existingItem.tags || []), ...item.tags]));
                existingItem.tags = newTags;
            }
        } else {
            trip.checklist.push({
                id: generateId(),
                title: item.title,
                isDone: false,
                tags: item.tags || []
            });
        }
    }),

    removeChecklistItem: (id) => updateTripState(set, get, (trip) => {
        trip.checklist = trip.checklist.filter((item) => item.id !== id);
    }),

    addBucketListItem: (item) => updateTripState(set, get, (trip) => {
        trip.bucketList.push({ id: generateId(), ...item });
    }),

    updateBucketListItem: (id, updates) => updateTripState(set, get, (trip) => {
        const item = trip.bucketList.find(i => i.id === id);
        if (item) {
            Object.assign(item, updates);
        }
    }),

    removeBucketListItem: (id) => updateTripState(set, get, (trip) => {
        trip.bucketList = trip.bucketList.filter((item) => item.id !== id);
    }),

    finishTrip: (id) => updateTripState(set, get, (trip) => {
        if (trip.id === id) {
            trip.status = 'finished';
        }
    }),

    addTimelineEvent: (tripId, date, event) => updateTripState(set, get, (trip) => {
        if (trip.id === tripId) {
            if (!trip.dailyTimeline) trip.dailyTimeline = [];
            
            let dayPlan = trip.dailyTimeline.find(d => d.date === date);
            if (!dayPlan) {
                dayPlan = {
                    day: trip.dailyTimeline.length + 1,
                    date,
                    events: []
                };
                trip.dailyTimeline.push(dayPlan);
            }
            
            dayPlan.events.push({
                id: Math.random().toString(36).substring(7),
                ...event
            } as any);
        }
    })
});

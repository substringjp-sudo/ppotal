"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWizardStore = void 0;
const zustand_1 = require("zustand");
const immer_1 = require("immer");
const middleware_1 = require("zustand/middleware");
exports.useWizardStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    isOpen: false,
    currentStep: 'DATES',
    steps: ['DATES', 'LOCATION', 'PREFERENCES', 'REVIEW'],
    mode: 'PLAN',
    startDate: '',
    endDate: '',
    flexibility: 2,
    isDateUndecided: false,
    durationDays: 3,
    isFlexDays: false,
    locations: [],
    locationDetails: [],
    isLocationUndecided: false,
    participants: [{ type: '나', count: 1 }],
    isParticipantsUndecided: false,
    theme: '관광',
    titleSuggestion: '',
    tripId: undefined,
    isBudgetUnlimited: true,
    budgetType: 'TOTAL',
    amount: 0,
    excludeFlight: false,
    excludeHotel: false,
    open: (mode = 'PLAN') => {
        get().reset();
        set({ isOpen: true, mode });
    },
    close: () => set({ isOpen: false }),
    reset: () => set({
        currentStep: 'DATES',
        startDate: '',
        endDate: '',
        flexibility: 2,
        isDateUndecided: false,
        durationDays: 3,
        isFlexDays: false,
        locations: [],
        locationDetails: [],
        isLocationUndecided: false,
        participants: [{ type: '나', count: 1 }],
        isParticipantsUndecided: false,
        theme: '관광',
        titleSuggestion: '',
        tripId: undefined,
        isBudgetUnlimited: true,
        budgetType: 'TOTAL',
        amount: 0,
        excludeFlight: false,
        excludeHotel: false,
        mode: 'PLAN',
    }),
    next: () => set((0, immer_1.produce)((state) => {
        const currentIndex = state.steps.indexOf(state.currentStep);
        if (currentIndex < state.steps.length - 1) {
            state.currentStep = state.steps[currentIndex + 1];
        }
    })),
    prev: () => set((0, immer_1.produce)((state) => {
        const currentIndex = state.steps.indexOf(state.currentStep);
        if (currentIndex > 0) {
            state.currentStep = state.steps[currentIndex - 1];
        }
    })),
    setDates: (start, end, flex) => set((state) => ({
        startDate: start,
        endDate: end,
        flexibility: flex !== undefined ? flex : state.flexibility
    })),
    setDateUndecided: (undecided) => set({ isDateUndecided: undecided }),
    setDuration: (days) => set({ durationDays: days }),
    setFlexDays: (flex) => set({ isFlexDays: flex, ...(flex ? { flexibility: 3 } : { flexibility: 0 }) }),
    setLocations: (locs) => set({ locations: locs, locationDetails: locs.map(l => ({ name: l })) }),
    setLocationUndecided: (undecided) => set({ isLocationUndecided: undecided }),
    updateParticipant: (type, count) => set((0, immer_1.produce)((state) => {
        const participant = state.participants.find(p => p.type === type);
        if (participant) {
            participant.count = count;
        }
        else {
            state.participants.push({ type, count });
        }
    })),
    setParticipantsUndecided: (undecided) => set({ isParticipantsUndecided: undecided }),
    addLocation: (location, regionIds) => set((0, immer_1.produce)((state) => {
        if (state.locations.length < 5 && !state.locations.includes(location)) {
            state.locations.push(location);
            state.locationDetails.push({ name: location, regionIds });
        }
    })),
    removeLocation: (location) => set((state) => ({
        locations: state.locations.filter(l => l !== location),
        locationDetails: state.locationDetails.filter(ld => ld.name !== location)
    })),
    clearLocations: () => set({ locations: [], locationDetails: [] }),
    setTheme: (theme) => set({ theme }),
    setTitleSuggestion: (title) => set({ titleSuggestion: title }),
    setBudgetData: (data) => set({
        isBudgetUnlimited: data.isUnlimited,
        budgetType: data.type,
        amount: data.amount
    }),
    setTransportPreferences: (prefs) => set({
        excludeFlight: prefs.excludeFlight,
        excludeHotel: prefs.excludeHotel
    }),
    setTripId: (id) => set({ tripId: id }),
}), {
    name: 'pplaner-wizard-storage',
    partialize: (state) => {
        const { isOpen, ...rest } = state;
        return rest;
    },
}));

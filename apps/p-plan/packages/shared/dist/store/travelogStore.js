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
exports.useTravelogStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        return undefined;
    }
    catch (e) {
        return undefined;
    }
};
exports.useTravelogStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    travelogs: [],
    setTravelogs: (travelogs) => set({ travelogs }),
    addTravelog: (travelog) => set((state) => ({
        travelogs: [travelog, ...state.travelogs]
    })),
    updateTravelog: (travelog) => set((state) => ({
        travelogs: state.travelogs.map((t) => t.id === travelog.id ? travelog : t)
    })),
    deleteTravelog: (id) => set((state) => ({
        travelogs: state.travelogs.filter((t) => t.id !== id)
    })),
    createTravelog: async (wizardData, userId, userProfile) => {
        const { generateId } = await Promise.resolve().then(() => __importStar(require('../types/common')));
        const { saveTravelog } = await Promise.resolve().then(() => __importStar(require('../lib/recordService')));
        const { geocode } = await Promise.resolve().then(() => __importStar(require('../lib/region-service')));
        let center = { lat: 37.5665, lng: 126.9780 }; // Default Seoul
        if (wizardData.locations.length > 0) {
            const coords = await geocode(wizardData.locations[0]);
            if (coords)
                center = coords;
        }
        const newTravelog = {
            id: wizardData.tripId || `log_${generateId()}`,
            userId: userId || 'anonymous',
            tripId: wizardData.tripId || undefined,
            title: wizardData.isLocationUndecided
                ? `미정 지역 ${wizardData.theme} 여행기`
                : `${wizardData.locations[0] || '미정'} 여행기`,
            startDate: wizardData.isDateUndecided ? new Date().toISOString().split('T')[0] : wizardData.startDate,
            endDate: wizardData.isDateUndecided ? new Date().toISOString().split('T')[0] : wizardData.endDate,
            summary: '',
            theme: wizardData.theme || '힐링',
            memberCounts: {
                me: 1,
                partner: 0,
                family: 0,
                friends: 0
            },
            sourceContext: wizardData.tripId ? 'plan_only' : 'scratch',
            status: 'draft',
            isPublic: false,
            timeline: [],
            sections: [
                {
                    id: generateId(),
                    type: 'text',
                    content: ''
                }
            ],
            recordingMode: 'standard',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        set((state) => ({
            travelogs: [newTravelog, ...state.travelogs]
        }));
        if (userId) {
            try {
                await saveTravelog(newTravelog);
            }
            catch (error) {
                console.error("Failed to save new travelog:", error);
            }
        }
        return newTravelog.id;
    },
}), {
    name: 'travelog-storage',
    storage: (0, middleware_1.createJSONStorage)(() => getStorage() || {}),
}));

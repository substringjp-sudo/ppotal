import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Travelog } from '../types/record';

interface TravelogState {
    travelogs: Travelog[];
    setTravelogs: (travelogs: Travelog[]) => void;
    addTravelog: (travelog: Travelog) => void;
    updateTravelog: (travelog: Travelog) => void;
    deleteTravelog: (id: string) => void;
    clearAllTravelogs: () => void;
    createTravelog: (wizardData: any, userId?: string, userProfile?: any) => Promise<string | void>;
}

const getStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage;
        }
        return undefined;
    } catch (e) {
        return undefined;
    }
};

export const useTravelogStore = create<TravelogState>()(
    persist(
        (set) => ({
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
            clearAllTravelogs: () => set({ travelogs: [] }),
            createTravelog: async (wizardData, userId, userProfile) => {
                const { generateId } = await import('../types/common');
                const { saveTravelog } = await import('../lib/recordService');
                const { geocode } = await import('../lib/region-service');

                let center = { lat: 37.5665, lng: 126.9780 }; // Default Seoul
                if (wizardData.locations.length > 0) {
                    const coords = await geocode(wizardData.locations[0]);
                    if (coords) center = coords;
                }

                const newTravelog: Travelog = {
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
                    } catch (error) {
                        console.error("Failed to save new travelog:", error);
                    }
                }

                return newTravelog.id;
            },
        }),
        {
            name: 'travelog-storage',
            storage: createJSONStorage(() => getStorage() || ({} as any)),
        }
    )
);

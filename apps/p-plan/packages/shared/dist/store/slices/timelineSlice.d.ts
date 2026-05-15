import { StateCreator } from 'zustand';
import { TripState } from '../types';
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
export declare const createTimelineSlice: StateCreator<TripState, [], [], TimelineSlice>;

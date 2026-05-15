import { TripDocument } from '../types/trip';

export function parseTripFromJSON(jsonData: any): TripDocument {
    try {
        const rawData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        // Generate a new ID for the trip
        const newTripId = crypto.randomUUID();
        
        const newTrip = {
            ...rawData,
            id: newTripId,
            title: rawData.title ? `${rawData.title} (가져옴)` : '가져온 여행',
            planningStatus: 'ideation',
            participants: [], // Clear participants to avoid mapping wrong users
            comments: [], // Do not import comments
            // Clear metadata that will be overwritten
            createdAt: undefined,
            updatedAt: undefined,
            userId: undefined,
            members: [],
        };

        // Regenerate UUIDs for nested arrays to prevent ID collisions
        const resetListIds = (list: any[]) => {
            if (!Array.isArray(list)) return [];
            return list.map(item => ({ ...item, id: crypto.randomUUID() }));
        };

        if (newTrip.checklist) newTrip.checklist = resetListIds(newTrip.checklist);
        if (newTrip.bucketList) newTrip.bucketList = resetListIds(newTrip.bucketList);
        if (newTrip.flights) newTrip.flights = resetListIds(newTrip.flights);
        if (newTrip.accommodation) newTrip.accommodation = resetListIds(newTrip.accommodation);
        if (newTrip.driving) newTrip.driving = resetListIds(newTrip.driving);
        if (newTrip.publicTransport) newTrip.publicTransport = resetListIds(newTrip.publicTransport);
        if (newTrip.prepTimeline) newTrip.prepTimeline = resetListIds(newTrip.prepTimeline);
        if (newTrip.reservations) newTrip.reservations = resetListIds(newTrip.reservations);
        
        if (newTrip.dailyTimeline && Array.isArray(newTrip.dailyTimeline)) {
            newTrip.dailyTimeline = newTrip.dailyTimeline.map((day: any) => ({
                ...day,
                id: crypto.randomUUID(),
                events: resetListIds(day.events)
            }));
        }

        // Subcollections indication for tripService -> saveTrip
        newTrip._loadedSubCollections = [
            'dailyPlans', 'checklist', 'bucketList',
            'flights', 'accommodation', 'driving',
            'publicTransport', 'prepTimeline', 'reservations', 'comments'
        ];
        
        return newTrip as TripDocument;
    } catch (e) {
        throw new Error('유효하지 않은 여행 JSON 파일입니다.');
    }
}

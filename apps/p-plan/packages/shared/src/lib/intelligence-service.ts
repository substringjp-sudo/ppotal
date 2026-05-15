import { PhotoMetadata, ClusteredLocation } from './timeline-clustering';

export async function generateTimelineFromPhotos(photos: PhotoMetadata[]): Promise<ClusteredLocation[]> {
    if (typeof window !== 'undefined' && (window as any)._generateTimelineFromPhotos) {
        return await (window as any)._generateTimelineFromPhotos(photos);
    }
    throw new Error('Intelligence service and Firebase must be initialized in browser');
}

export async function solveRegionIdsFromPlace(place: any): Promise<any> {
    if (typeof window !== 'undefined' && (window as any)._solveRegionIdsFromPlace) {
        return await (window as any)._solveRegionIdsFromPlace(place);
    }
    // Fallback if not initialized (this can happen during early mount)
    return null;
}

export async function searchRegions(query: string): Promise<any[]> {
    if (typeof window !== 'undefined' && (window as any)._searchRegions) {
        return await (window as any)._searchRegions(query);
    }
    return [];
}

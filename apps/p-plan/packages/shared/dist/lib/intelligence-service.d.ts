import { PhotoMetadata, ClusteredLocation } from './timeline-clustering';
export declare function generateTimelineFromPhotos(photos: PhotoMetadata[]): Promise<ClusteredLocation[]>;
export declare function solveRegionIdsFromPlace(place: any): Promise<any>;
export declare function searchRegions(query: string): Promise<any[]>;

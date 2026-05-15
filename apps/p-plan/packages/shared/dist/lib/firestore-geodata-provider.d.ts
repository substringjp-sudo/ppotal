import { Firestore } from 'firebase/firestore';
import { IGeodataProvider, GeodataRecord } from './geodata-engine';
import { RegionIds } from '../types/common';
export declare class FirestoreGeodataProvider implements IGeodataProvider {
    private db;
    private _isReady;
    constructor(db: Firestore);
    get isReady(): boolean;
    initialize(): Promise<void>;
    private isPointInPolygon;
    private doesContainPoint;
    lookup(lat: number, lng: number): Promise<RegionIds | null>;
    getChildren(parentId: string | null, type: 'country' | 'region' | 'city', includeGeometry?: boolean): Promise<GeodataRecord[]>;
    getMetadata(id: string, includeGeometry?: boolean): Promise<GeodataRecord | null>;
    searchRegions(searchTerm: string, options?: {
        type?: 'country' | 'region' | 'city';
        parentId?: string;
        limit?: number;
    }): Promise<GeodataRecord[]>;
    private mapRecord;
}

import { Firestore } from 'firebase-admin/firestore';
import { IGeodataProvider, GeodataRecord } from './geodata-engine';
import { RegionIds } from '../types/common';
/**
 * Firestore Admin SDK 기반 지오데이터 프로바이더 (Shared)
 * Cloud Functions 등 서버 사이드 환경에서 사용됩니다.
 */
export declare class FirestoreAdminGeodataProvider implements IGeodataProvider {
    private db;
    private _isReady;
    constructor(db: Firestore);
    get isReady(): boolean;
    initialize(): Promise<void>;
    private isPointInPolygon;
    private doesContainPoint;
    lookup(lat: number, lng: number): Promise<RegionIds | null>;
    getChildren(parentId: string | null, type: 'country' | 'region' | 'city'): Promise<GeodataRecord[]>;
    getMetadata(id: string): Promise<GeodataRecord | null>;
    searchRegions(searchTerm: string, options?: {
        type?: 'country' | 'region' | 'city';
        parentId?: string;
        limit?: number;
    }): Promise<GeodataRecord[]>;
    private mapRecord;
}

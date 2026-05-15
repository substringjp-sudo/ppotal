import { Firestore } from 'firebase-admin/firestore';
import { IAviationProvider, Airport, Airline } from './aviation-engine';
/**
 * Firestore Admin SDK 기반 항공 데이터 프로바이더 (Shared)
 * Cloud Functions 등 서버 사이드 환경에서 사용됩니다.
 */
export declare class FirestoreAdminAviationProvider implements IAviationProvider {
    private db;
    private _isReady;
    constructor(db: Firestore);
    get isReady(): boolean;
    initialize(): Promise<void>;
    getAirport(code: string): Promise<Airport | null>;
    getAirline(code: string): Promise<Airline | null>;
    searchAirports(searchTerm: string, options?: {
        limit?: number;
        location?: {
            lat: number;
            lng: number;
        };
        departureCode?: string;
    }): Promise<Airport[]>;
    getRecommendedAirports(options: {
        favorites?: string[];
        residenceCountryId?: string;
        visitedCountryIds?: string[];
        limit?: number;
    }): Promise<Airport[]>;
    searchAirlines(queryStr: string): Promise<Airline[]>;
    private mapAirport;
}

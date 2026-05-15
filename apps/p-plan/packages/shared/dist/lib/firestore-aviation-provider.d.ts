import { Firestore } from 'firebase/firestore';
import { IAviationProvider, Airport, Airline } from './aviation-engine';
/**
 * Firestore 기반 항공 데이터 프로바이더 (Shared)
 */
export declare class FirestoreAviationProvider implements IAviationProvider {
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

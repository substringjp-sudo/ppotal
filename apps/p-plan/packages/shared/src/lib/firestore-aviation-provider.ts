import { collection, query, where, getDocs, doc, getDoc, limit, Firestore } from 'firebase/firestore';
import { IAviationProvider, Airport, Airline } from './aviation-engine';

/**
 * Firestore 기반 항공 데이터 프로바이더 (Shared)
 */
export class FirestoreAviationProvider implements IAviationProvider {
    private _isReady = false;

    constructor(private db: Firestore) {}

    get isReady() { return this._isReady; }

    async initialize(): Promise<void> {
        this._isReady = true;
    }

    async getAirport(code: string): Promise<Airport | null> {
        const docRef = doc(this.db, 'airports', code);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return this.mapAirport(snapshot.data());
    }

    async getAirline(code: string): Promise<Airline | null> {
        const docRef = doc(this.db, 'airlines', code);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return snapshot.data() as Airline;
    }

    async searchAirports(searchTerm: string, options?: { limit?: number; location?: { lat: number; lng: number }; departureCode?: string; }): Promise<Airport[]> {
        const collRef = collection(this.db, 'airports');
        let q = query(collRef, limit(options?.limit || 20));

        // Note: Complex searching (proximity, route matching) should ideally 
        // happen in a Cloud Function or via more complex Firestore queries.
        // This is a basic implementation.
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapAirport(doc.data()));
    }

    async getRecommendedAirports(options: { favorites?: string[]; residenceCountryId?: string; visitedCountryIds?: string[]; limit?: number; }): Promise<Airport[]> {
        const results: Airport[] = [];
        
        if (options.residenceCountryId) {
            const q = query(
                collection(this.db, 'airports'),
                where('regionIds.countryId', '==', options.residenceCountryId),
                limit(options.limit || 5)
            );
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(doc => this.mapAirport(doc.data())));
        }

        return results;
    }

    async searchAirlines(queryStr: string): Promise<Airline[]> {
        const q = queryStr.trim();
        if (!q) return [];
        
        const collRef = collection(this.db, 'airlines');
        const searchQ = query(
            collRef,
            where('nameEn', '>=', q),
            where('nameEn', '<=', q + '\uf8ff'),
            limit(10)
        );

        const snapshot = await getDocs(searchQ);
        return snapshot.docs.map(doc => doc.data() as Airline);
    }

    private mapAirport(data: any): Airport {
        return {
            code: data.iata,
            nameKo: data.nameKo,
            nameEn: data.nameEn,
            lat: data.location?.latitude || 0,
            lng: data.location?.longitude || 0,
            timezone: data.timezone || 0,
            regionIds: data.regionIds || {}
        };
    }
}

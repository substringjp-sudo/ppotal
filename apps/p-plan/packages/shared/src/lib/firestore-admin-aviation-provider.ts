import { Firestore } from 'firebase-admin/firestore';
import { IAviationProvider, Airport, Airline } from './aviation-engine';

/**
 * Firestore Admin SDK 기반 항공 데이터 프로바이더 (Shared)
 * Cloud Functions 등 서버 사이드 환경에서 사용됩니다.
 */
export class FirestoreAdminAviationProvider implements IAviationProvider {
    private _isReady = false;

    constructor(private db: Firestore) {}

    get isReady() { return this._isReady; }

    async initialize(): Promise<void> {
        this._isReady = true;
    }

    async getAirport(code: string): Promise<Airport | null> {
        const snapshot = await this.db.collection('airports').doc(code).get();
        if (!snapshot.exists) return null;
        return this.mapAirport(snapshot.data());
    }

    async getAirline(code: string): Promise<Airline | null> {
        const snapshot = await this.db.collection('airlines').doc(code).get();
        if (!snapshot.exists) return null;
        return snapshot.data() as Airline;
    }

    async searchAirports(searchTerm: string, options?: { limit?: number; location?: { lat: number; lng: number }; departureCode?: string; }): Promise<Airport[]> {
        const q = searchTerm?.trim() || "";
        const lim = options?.limit || 20;

        // 검색어가 없는 경우 기본 목록 반환
        if (!q) {
            const snapshot = await this.db.collection('airports')
                .limit(lim)
                .get();
            return snapshot.docs.map(doc => this.mapAirport(doc.data()));
        }

        const upperQ = q.toUpperCase();
        
        // 1. IATA 코드로 먼저 검색 시도 (대문자 기준)
        const iataSnapshot = await this.db.collection('airports')
            .where('iata', '>=', upperQ)
            .where('iata', '<=', upperQ + '\uf8ff')
            .limit(lim)
            .get();

        if (!iataSnapshot.empty) {
            return iataSnapshot.docs.map(doc => this.mapAirport(doc.data()));
        }

        // 2. 검색 결과가 없으면 영문 이름으로 검색 (이름 검색을 위해 대문자 처리는 상황에 따라 다를 수 있으나 원본 입력값 기준)
        const nameSnapshot = await this.db.collection('airports')
            .where('nameEn', '>=', q)
            .where('nameEn', '<=', q + '\uf8ff')
            .limit(lim)
            .get();

        return nameSnapshot.docs.map(doc => this.mapAirport(doc.data()));
    }

    async getRecommendedAirports(options: { favorites?: string[]; residenceCountryId?: string; visitedCountryIds?: string[]; limit?: number; }): Promise<Airport[]> {
        const results: Airport[] = [];
        
        if (options.residenceCountryId) {
            const snapshot = await this.db.collection('airports')
                .where('regionIds.countryId', '==', options.residenceCountryId)
                .limit(options.limit || 5)
                .get();
            results.push(...snapshot.docs.map(doc => this.mapAirport(doc.data())));
        }

        return results;
    }

    async searchAirlines(queryStr: string): Promise<Airline[]> {
        const q = queryStr.trim();
        if (!q) return [];
        
        const results = new Map<string, Airline>();
        const upperQ = q.toUpperCase();

        // 1. IATA 코드로 검색 (대문자)
        const codeSnapshot = await this.db.collection('airlines')
            .where('code', '>=', upperQ)
            .where('code', '<=', upperQ + '\uf8ff')
            .limit(10)
            .get();
        codeSnapshot.forEach(doc => results.set(doc.id, doc.data() as Airline));

        if (results.size < 10) {
            // 2. 한글 이름으로 검색
            const koSnapshot = await this.db.collection('airlines')
                .where('nameKo', '>=', q)
                .where('nameKo', '<=', q + '\uf8ff')
                .limit(10 - results.size)
                .get();
            koSnapshot.forEach(doc => results.set(doc.id, doc.data() as Airline));
        }

        if (results.size < 10) {
            // 3. 영문 이름으로 검색
            const enSnapshot = await this.db.collection('airlines')
                .where('nameEn', '>=', q)
                .where('nameEn', '<=', q + '\uf8ff')
                .limit(10 - results.size)
                .get();
            enSnapshot.forEach(doc => results.set(doc.id, doc.data() as Airline));
        }

        return Array.from(results.values());
    }

    private mapAirport(data: any): Airport {
        return {
            code: data.iata || data.code,
            nameKo: data.nameKo,
            nameEn: data.nameEn,
            lat: data.location?.latitude || data.lat || 0,
            lng: data.location?.longitude || data.lng || 0,
            timezone: data.timezone || 0,
            regionIds: data.regionIds || {}
        };
    }
}

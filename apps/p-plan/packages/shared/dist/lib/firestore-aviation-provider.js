"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAviationProvider = void 0;
const firestore_1 = require("firebase/firestore");
/**
 * Firestore 기반 항공 데이터 프로바이더 (Shared)
 */
class FirestoreAviationProvider {
    db;
    _isReady = false;
    constructor(db) {
        this.db = db;
    }
    get isReady() { return this._isReady; }
    async initialize() {
        this._isReady = true;
    }
    async getAirport(code) {
        const docRef = (0, firestore_1.doc)(this.db, 'airports', code);
        const snapshot = await (0, firestore_1.getDoc)(docRef);
        if (!snapshot.exists())
            return null;
        return this.mapAirport(snapshot.data());
    }
    async getAirline(code) {
        const docRef = (0, firestore_1.doc)(this.db, 'airlines', code);
        const snapshot = await (0, firestore_1.getDoc)(docRef);
        if (!snapshot.exists())
            return null;
        return snapshot.data();
    }
    async searchAirports(searchTerm, options) {
        const collRef = (0, firestore_1.collection)(this.db, 'airports');
        let q = (0, firestore_1.query)(collRef, (0, firestore_1.limit)(options?.limit || 20));
        // Note: Complex searching (proximity, route matching) should ideally 
        // happen in a Cloud Function or via more complex Firestore queries.
        // This is a basic implementation.
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map(doc => this.mapAirport(doc.data()));
    }
    async getRecommendedAirports(options) {
        const results = [];
        if (options.residenceCountryId) {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(this.db, 'airports'), (0, firestore_1.where)('regionIds.countryId', '==', options.residenceCountryId), (0, firestore_1.limit)(options.limit || 5));
            const snapshot = await (0, firestore_1.getDocs)(q);
            results.push(...snapshot.docs.map(doc => this.mapAirport(doc.data())));
        }
        return results;
    }
    async searchAirlines(queryStr) {
        const q = queryStr.trim();
        if (!q)
            return [];
        const collRef = (0, firestore_1.collection)(this.db, 'airlines');
        const searchQ = (0, firestore_1.query)(collRef, (0, firestore_1.where)('nameEn', '>=', q), (0, firestore_1.where)('nameEn', '<=', q + '\uf8ff'), (0, firestore_1.limit)(10));
        const snapshot = await (0, firestore_1.getDocs)(searchQ);
        return snapshot.docs.map(doc => doc.data());
    }
    mapAirport(data) {
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
exports.FirestoreAviationProvider = FirestoreAviationProvider;

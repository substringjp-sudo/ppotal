import * as SQLite from 'expo-sqlite';
import { IAviationProvider } from '@pplaner/shared';
import { Airport, Airline } from '@pplaner/shared';

/**
 * SQLite 기반 항공 데이터 프로바이더 (Mobile용)
 * f:/p-plan/packages/shared/data/geodata.db 에셋을 사용합니다.
 */
export class SQLiteAviationProvider implements IAviationProvider {
    private db: SQLite.SQLiteDatabase | null = null;
    private _isReady = false;

    get isReady() { return this._isReady; }

    async initialize(): Promise<void> {
        if (this._isReady) return;
        try {
            // geodata.db 에셋을 연다. (SQLiteGeodataProvider가 이미 파일을 복사해두었을 것임)
            this.db = await SQLite.openDatabaseAsync('geodata.db');
            this._isReady = true;
            console.log('PPLANER: SQLite Aviation Provider Initialized');
        } catch (e) {
            console.error('PPLANER: Failed to initialize SQLite Aviation Provider', e);
        }
    }

    async getAirport(code: string): Promise<Airport | null> {
        if (!this.db) return null;
        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM airports WHERE iata = ?',
            [code]
        );
        if (!result) return null;
        return this.mapAirport(result);
    }

    async getAirline(code: string): Promise<Airline | null> {
        if (!this.db) return null;
        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM airlines WHERE code = ?',
            [code]
        );
        if (!result) return null;
        return result as Airline;
    }

    async searchAirports(query: string, options?: { limit?: number; location?: { lat: number; lng: number }; departureCode?: string; }): Promise<Airport[]> {
        if (!this.db) return [];
        const limitCount = options?.limit || 20;
        
        let results: any[] = [];
        if (query) {
            const pattern = `%${query}%`;
            results = await this.db.getAllAsync<any>(
                'SELECT * FROM airports WHERE (iata LIKE ? OR nameKo LIKE ? OR nameEn LIKE ?) LIMIT ?',
                [pattern, pattern, pattern, limitCount]
            );
        } else if (options?.location) {
            const { lat, lng } = options.location;
            results = await this.db.getAllAsync<any>(
                'SELECT * FROM airports WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? LIMIT ?',
                [lat - 0.5, lat + 0.5, lng - 0.5, lng + 0.5, limitCount]
            );
        } else {
            // Fallback: popular airports
            results = await this.db.getAllAsync<any>(
                'SELECT * FROM airports LIMIT ?',
                [limitCount]
            );
        }

        return results.map(r => this.mapAirport(r));
    }

    async getRecommendedAirports(options: { favorites?: string[]; residenceCountryId?: string; visitedCountryIds?: string[]; limit?: number; }): Promise<Airport[]> {
        if (!this.db) return [];
        const limitCount = options.limit || 8;
        return this.searchAirports('', { limit: limitCount }); // Simplified for now
    }

    private mapAirport(row: any): Airport {
        return {
            code: row.iata,
            nameKo: row.nameKo,
            nameEn: row.nameEn,
            lat: row.lat,
            lng: row.lng,
            timezone: row.timezone,
            regionIds: {
                countryId: row.countryId,
                countryName: row.countryName,
                prefectureId: row.prefectureId,
                prefectureName: row.prefectureName,
                cityId: row.cityId,
                cityName: row.cityName
            }
        };
    }
}

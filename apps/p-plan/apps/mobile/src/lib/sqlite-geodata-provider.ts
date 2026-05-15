import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { IGeodataProvider, GeodataRecord } from '@pplaner/shared/src/lib/geodata-engine';
import { RegionIds } from '@pplaner/shared';
import { Platform } from 'react-native';

export class SQLiteGeodataProvider implements IGeodataProvider {
    private db: SQLite.SQLiteDatabase | null = null;
    private _isReady = false;

    constructor() {}

    get isReady() {
        return this._isReady;
    }

    async initialize() {
        if (this.db) return;
        
        // Web 환경에서는 SQLite Geodata Provider를 사용하지 않음 (FirestoreProvider 권장)
        if (Platform.OS === 'web') {
            console.log('PPLANER: SQLite Geodata Provider is skipped on Web.');
            return;
        }
        
        try {
            const dbDir = `${FileSystem.documentDirectory}SQLite/`;
            const dbPath = `${dbDir}geodata.db`;

            // SQLite 디렉토리 확인 및 생성
            // SDK 54의 deprecation 경고를 방지하기 위해 존재 여부 확인 후 처리
            const dirInfo = await FileSystem.getInfoAsync(dbDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { recursive: true });
            }

            // DB 파일이 없으면 에셋에서 복사
            const fileInfo = await FileSystem.getInfoAsync(dbPath);
            if (!fileInfo.exists) {
                console.log('PPLANER: Copying geodata.db from assets...');
                const asset = Asset.fromModule(require('../../assets/data/geodata.db'));
                await asset.downloadAsync();
                await FileSystem.copyAsync({
                    from: asset.localUri || asset.uri,
                    to: dbPath
                });
                console.log('PPLANER: geodata.db copied successfully');
            }

            // geodata 전용 DB 열기
            this.db = await SQLite.openDatabaseAsync('geodata.db');
            
            // 인덱스 및 테이블 확인 (이미 시딩되어 있으나 안정성 확보)
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS geodata (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    parentId TEXT,
                    bbox_min_lng REAL,
                    bbox_min_lat REAL,
                    bbox_max_lng REAL,
                    bbox_max_lat REAL,
                    geometry TEXT,
                    properties TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_geodata_bbox ON geodata (bbox_min_lng, bbox_max_lng, bbox_min_lat, bbox_max_lat);
                CREATE INDEX IF NOT EXISTS idx_geodata_type ON geodata (type);
                CREATE INDEX IF NOT EXISTS idx_geodata_parent ON geodata (parentId);
            `);
            
            this._isReady = true;
            console.log('PPLANER: SQLite Geodata Provider Initialized');
        } catch (error) {
            console.error('PPLANER: Failed to initialize Geodata Provider', error);
        }
    }

    // ... (lookup, getChildren 등 나머지 구현은 동일하므로 생략하지 않고 전체 유지)
    private isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
        let inside = false;
        const x = point[0], y = point[1];
        for (let i = 0; i < polygon.length; i++) {
            const ring = polygon[i];
            if (!ring || ring.length < 3) continue;
            for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) {
                const xi = ring[j][0], yi = ring[j][1];
                const xj = ring[k][0], yj = ring[k][1];
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
        }
        return inside;
    }

    private doesContainPoint(geometry: any, point: [number, number]): boolean {
        if (!geometry) return false;
        const type = geometry.type;
        const coords = geometry.coordinates;
        if (type === 'Polygon') {
            return this.isPointInPolygon(point, coords);
        } else if (type === 'MultiPolygon') {
            return coords.some((poly: any) => this.isPointInPolygon(point, poly));
        }
        return false;
    }

    async lookup(lat: number, lng: number): Promise<RegionIds | null> {
        if (!this.db) return null;

        const point: [number, number] = [lng, lat];
        
        const cityRows = await this.db.getAllAsync<any>(
            `SELECT * FROM geodata 
             WHERE type = 'city' 
             AND ? BETWEEN bbox_min_lng AND bbox_max_lng 
             AND ? BETWEEN bbox_min_lat AND bbox_max_lat`,
            [lng, lat]
        );

        let matchedCity = null;
        for (const row of cityRows) {
            if (!row.geometry) continue;
            try {
                const geometry = JSON.parse(row.geometry);
                if (this.doesContainPoint(geometry, point)) {
                    matchedCity = row;
                    break;
                }
            } catch (e) {
                console.warn(`PPLANER: Failed to parse geometry for city ${row.id}`, e);
            }
        }

        if (!matchedCity) {
            const countryRows = await this.db.getAllAsync<any>(
                `SELECT * FROM geodata WHERE type = 'country' AND ? BETWEEN bbox_min_lng AND bbox_max_lng AND ? BETWEEN bbox_min_lat AND bbox_max_lat`,
                [lng, lat]
            );
            if (countryRows.length > 0) {
                return {
                    countryId: countryRows[0].id,
                    countryName: countryRows[0].name
                };
            }
            return null;
        }

        let matchedRegion = null;
        let matchedCountry = null;

        if (matchedCity.parentId) {
            matchedRegion = await this.db.getFirstAsync<any>('SELECT * FROM geodata WHERE id = ?', [matchedCity.parentId]);
            if (matchedRegion?.parentId) {
                matchedCountry = await this.db.getFirstAsync<any>('SELECT * FROM geodata WHERE id = ?', [matchedRegion.parentId]);
            }
        }

        return {
            countryId: matchedCountry?.id || matchedRegion?.parentId || null,
            countryName: matchedCountry?.name || null,
            prefectureId: matchedRegion?.id || null,
            prefectureName: matchedRegion?.name || null,
            cityId: matchedCity.id,
            cityName: matchedCity.name
        };
    }

    async getChildren(parentId: string | null, type: string): Promise<GeodataRecord[]> {
        if (!this.db) return [];
        const rows = await this.db.getAllAsync<any>(
            'SELECT * FROM geodata WHERE parentId = ? AND type = ?',
            [parentId, type]
        );
        return rows.map(r => ({
            id: r.id,
            type: r.type as any,
            name: r.name,
            parentId: r.parentId,
            bbox: [r.bbox_min_lng, r.bbox_min_lat, r.bbox_max_lng, r.bbox_max_lat],
            geometry: r.geometry ? JSON.parse(r.geometry) : null,
            properties: JSON.parse(r.properties || '{}')
        }));
    }

    // 인터페이스 미구현 메서드 추가 (에러 방지)
    async getMetadata(id: string, includeGeometry?: boolean): Promise<GeodataRecord | null> {
        if (!this.db) return null;
        const row = await this.db.getFirstAsync<any>('SELECT * FROM geodata WHERE id = ?', [id]);
        if (!row) return null;
        return {
            id: row.id,
            type: row.type as any,
            name: row.name,
            parentId: row.parentId,
            bbox: [row.bbox_min_lng, row.bbox_min_lat, row.bbox_max_lng, row.bbox_max_lat],
            geometry: row.geometry ? JSON.parse(row.geometry) : null,
            properties: JSON.parse(row.properties || '{}')
        };
    }

    async searchRegions(query: string, options?: { type?: 'country' | 'region' | 'city', parentId?: string, limit?: number }): Promise<GeodataRecord[]> {
        if (!this.db) return [];
        let sql = 'SELECT * FROM geodata WHERE name LIKE ?';
        const params: any[] = [`%${query}%`];
        
        if (options?.type) {
            sql += ' AND type = ?';
            params.push(options.type);
        }
        if (options?.parentId) {
            sql += ' AND parentId = ?';
            params.push(options.parentId);
        }
        
        sql += ' LIMIT ?';
        params.push(options?.limit || 10);

        const rows = await this.db.getAllAsync<any>(sql, params);
        return rows.map(r => ({
            id: r.id,
            type: r.type as any,
            name: r.name,
            parentId: r.parentId,
            bbox: [r.bbox_min_lng, r.bbox_min_lat, r.bbox_max_lng, r.bbox_max_lat],
            geometry: r.geometry ? JSON.parse(r.geometry) : null,
            properties: JSON.parse(r.properties || '{}')
        }));
    }
}

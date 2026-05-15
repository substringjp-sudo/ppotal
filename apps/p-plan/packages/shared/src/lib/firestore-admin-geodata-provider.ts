import { Firestore } from 'firebase-admin/firestore';
import { IGeodataProvider, GeodataRecord } from './geodata-engine';
import { RegionIds } from '../types/common';

/**
 * Firestore Admin SDK 기반 지오데이터 프로바이더 (Shared)
 * Cloud Functions 등 서버 사이드 환경에서 사용됩니다.
 */
export class FirestoreAdminGeodataProvider implements IGeodataProvider {
    private _isReady = false;

    constructor(private db: Firestore) {}

    get isReady() {
        return this._isReady;
    }

    async initialize() {
        this._isReady = true;
    }

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
        
        let geom = geometry;
        if (typeof geometry === 'string') {
            try {
                geom = JSON.parse(geometry);
            } catch (e) {
                console.warn('PPLANER: Failed to parse geometry string', e);
                return false;
            }
        }

        const type = geom.type;
        const coords = geom.coordinates;
        if (type === 'Polygon') {
            return this.isPointInPolygon(point, coords);
        } else if (type === 'MultiPolygon') {
            return coords.some((poly: any) => this.isPointInPolygon(point, poly));
        }
        return false;
    }

    async lookup(lat: number, lng: number): Promise<RegionIds | null> {
        const point: [number, number] = [lng, lat];
        
        // 1. 도시(city) 단위 검색
        const citySnapshots = await this.db.collection('geodata')
            .where('type', '==', 'city')
            .where('bbox_min_lng', '<=', lng)
            .orderBy('bbox_min_lng', 'desc')
            .limit(200)
            .get();

        let matchedCity: any = null;
        for (const d of citySnapshots.docs) {
            const data = d.data();
            if (lng <= data.bbox_max_lng && lat >= data.bbox_min_lat && lat <= data.bbox_max_lat) {
                if (this.doesContainPoint(data.geometry, point)) {
                    matchedCity = { id: d.id, ...data };
                    break;
                }
            }
        }

        if (!matchedCity) {
            // 2. 국가(country) 단위 검색
            const countrySnapshots = await this.db.collection('geodata')
                .where('type', '==', 'country')
                .where('bbox_min_lng', '<=', lng)
                .orderBy('bbox_min_lng', 'desc')
                .limit(100)
                .get();

            const candidates: { id: string, name: string, area: number, hasGeometry: boolean, isInside: boolean }[] = [];

            for (const d of countrySnapshots.docs) {
                const data = d.data();
                if (lng <= data.bbox_max_lng && lat >= data.bbox_min_lat && lat <= data.bbox_max_lat) {
                    const area = (data.bbox_max_lng - data.bbox_min_lng) * (data.bbox_max_lat - data.bbox_min_lat);
                    const hasGeom = !!data.geometry;
                    const isInside = hasGeom ? this.doesContainPoint(data.geometry, point) : false; // fallback to false if geometry exists but point not inside

                    candidates.push({ id: d.id, name: data.name, area, hasGeometry: hasGeom, isInside });
                }
            }

            // 1순위: 지오메트리 검증을 통과한(isInside) 국가 중 면적이 가장 작은 것
            const geomMatch = candidates
                .filter(c => c.hasGeometry && c.isInside)
                .sort((a, b) => a.area - b.area)[0];

            if (geomMatch) {
                return { countryId: geomMatch.id, countryName: geomMatch.name };
            }

            // 2순위: 지오메트리 데이터가 없는 국가 중 Bbox가 가장 작은 것 (fallback)
            const fallbackMatch = candidates
                .filter(c => !c.hasGeometry)
                .sort((a, b) => a.area - b.area)[0];

            if (fallbackMatch) {
                return { countryId: fallbackMatch.id, countryName: fallbackMatch.name };
            }

            return null;
        }

        // 3. 상위 계층 조회
        let matchedRegion: any = null;
        let matchedCountry: any = null;

        if (matchedCity.parentId) {
            const regionDoc = await this.db.collection('geodata').doc(matchedCity.parentId).get();
            if (regionDoc.exists) {
                const regionData = regionDoc.data() || {};
                matchedRegion = { id: regionDoc.id, ...regionData };
                if (regionData.parentId) {
                    const countryDoc = await this.db.collection('geodata').doc(regionData.parentId).get();
                    if (countryDoc.exists) {
                        matchedCountry = { id: countryDoc.id, ...countryDoc.data() };
                    }
                }
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

    async getChildren(parentId: string | null, type: 'country' | 'region' | 'city'): Promise<GeodataRecord[]> {
        const snapshots = await this.db.collection('search_registry')
            .where('parentId', '==', parentId)
            .where('type', '==', type)
            .get();
        return snapshots.docs.map(d => this.mapRecord(d.data()));
    }

    async getMetadata(id: string): Promise<GeodataRecord | null> {
        const snapshot = await this.db.collection('search_registry').doc(id).get();
        if (!snapshot.exists) return null;
        return this.mapRecord(snapshot.data());
    }

    async searchRegions(searchTerm: string, options?: { type?: 'country' | 'region' | 'city', parentId?: string, limit?: number }): Promise<GeodataRecord[]> {
        let query = this.db.collection('search_registry') as any;
        
        if (options?.type) {
            query = query.where('type', '==', options.type);
        }
        if (options?.parentId) {
            query = query.where('parentId', '==', options.parentId);
        }

        // 검색어가 있는 경우 접두어 검색 쿼리 추가
        if (searchTerm) {
            query = query.orderBy('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
        }
        
        const lim = options?.limit || 10;
        const snapshot = await query.limit(lim).get();

        return snapshot.docs.map((doc: any) => this.mapRecord(doc.data()));
    }

    private mapRecord(data: any): GeodataRecord {
        return {
            id: data.id,
            type: data.type,
            name: data.name,
            parentId: data.parentId || null,
            bbox: data.bbox || [0, 0, 0, 0],
            geometry: null, 
            properties: data.properties || {}
        };
    }
}

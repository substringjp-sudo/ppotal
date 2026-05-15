import { collection, query, where, getDocs, doc, getDoc, limit, Firestore } from 'firebase/firestore';
import { IGeodataProvider, GeodataRecord } from './geodata-engine';
import { RegionIds } from '../types/common';

export class FirestoreGeodataProvider implements IGeodataProvider {
    private _isReady = false;

    constructor(private db: Firestore) {}

    get isReady() {
        return this._isReady;
    }

    async initialize() {
        // Firestore는 지연 초기화되므로 상태만 true로 변경
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
        
        // Firestore에서 문자열로 저장된 경우 파싱
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
        // PPLANER: 파이어스토어는 지리 쿼리에 제약이 있으므로, 도시(city) 단위로 먼저 후보군을 좁힙니다.
        const cityQuery = query(
            collection(this.db, 'geodata'),
            where('type', '==', 'city'),
            where('bbox_min_lng', '<=', lng)
        );

        const snapshots = await getDocs(cityQuery);
        const point: [number, number] = [lng, lat];
        
        let matchedCity: any = null;
        for (const d of snapshots.docs) {
            const data = d.data() as any;
            if (lng <= data.bbox_max_lng && lat >= data.bbox_min_lat && lat <= data.bbox_max_lat) {
                if (this.doesContainPoint(data.geometry, point)) {
                    matchedCity = { id: d.id, ...data };
                    break;
                }
            }
        }

        if (!matchedCity) {
            // 도시 수준에서 매칭이 안 되면 국가 수준만이라도 시도
            const countryQuery = query(
                collection(this.db, 'geodata'),
                where('type', '==', 'country'),
                where('bbox_min_lng', '<=', lng)
            );
            const countrySnapshots = await getDocs(countryQuery);
            for (const d of countrySnapshots.docs) {
                const data = d.data() as any;
                if (lng <= data.bbox_max_lng && lat >= data.bbox_min_lat && lat <= data.bbox_max_lat) {
                    // 국가 geometry는 보통 크므로 있으면 체크
                    if (!data.geometry || this.doesContainPoint(data.geometry, point)) {
                        return { countryId: d.id, countryName: data.name };
                    }
                }
            }
            return null;
        }

        // 상위 계층(Region/Country) 조회
        let matchedRegion: any = null;
        let matchedCountry: any = null;

        if (matchedCity.parentId) {
            const regionDoc = await getDoc(doc(this.db, 'geodata', matchedCity.parentId));
            if (regionDoc.exists()) {
                matchedRegion = { id: regionDoc.id, ...regionDoc.data() };
                if (matchedRegion.parentId) {
                    const countryDoc = await getDoc(doc(this.db, 'geodata', matchedRegion.parentId));
                    if (countryDoc.exists()) {
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

    async getChildren(parentId: string | null, type: 'country' | 'region' | 'city', includeGeometry?: boolean): Promise<GeodataRecord[]> {
        // Use search_registry for light metadata listing, or geodata for geometry
        const collectionName = includeGeometry ? 'geodata' : 'search_registry';
        const collRef = collection(this.db, collectionName);
        
        // If type is 'region', we also accept 'prefecture' for backward compatibility
        const typesToQuery = type === 'region' ? ['region', 'prefecture'] : [type];
        
        console.log(`PPLANER: getChildren - collection: ${collectionName}, parentId: ${parentId}, types: ${JSON.stringify(typesToQuery)}`);
        
        try {
            const q = query(
                collRef,
                where('parentId', '==', parentId),
                where('type', 'in', typesToQuery)
            );
            const snapshots = await getDocs(q);
            console.log(`PPLANER: getChildren - found ${snapshots.size} documents`);
            return snapshots.docs.map(d => this.mapRecord(d.data()));
        } catch (error: any) {
            console.error('PPLANER: getChildren error details:', {
                message: error.message,
                code: error.code,
                name: error.name,
                stack: error.stack,
                query: { collectionName, parentId, typesToQuery }
            });
            throw error;
        }
    }

    async getMetadata(id: string, includeGeometry?: boolean): Promise<GeodataRecord | null> {
        const collectionName = includeGeometry ? 'geodata' : 'search_registry';
        const docRef = doc(this.db, collectionName, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return this.mapRecord(snapshot.data());
    }

    async searchRegions(searchTerm: string, options?: { type?: 'country' | 'region' | 'city', parentId?: string, limit?: number }): Promise<GeodataRecord[]> {
        const collRef = collection(this.db, 'search_registry');
        let q = query(collRef);
        
        if (options?.type) {
            q = query(q, where('type', '==', options.type));
        }
        if (options?.parentId) {
            q = query(q, where('parentId', '==', options.parentId));
        }
        
        const lim = options?.limit || 10;
        q = query(q, limit(lim));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapRecord(doc.data()));
    }

    private mapRecord(data: any): GeodataRecord {
        let geom = data.geometry || null;
        if (typeof geom === 'string') {
            try {
                geom = JSON.parse(geom);
            } catch (e) {
                console.warn('PPLANER: Failed to parse geometry string in mapRecord', e);
                geom = null;
            }
        }

        return {
            id: data.id || '',
            type: data.type,
            name: data.name,
            parentId: data.parentId || null,
            bbox: data.bbox || [0, 0, 0, 0],
            geometry: geom, 
            properties: data.properties || {}
        };
    }
}



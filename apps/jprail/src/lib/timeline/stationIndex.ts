import { metersBetween } from './geo';
import type { IndexedStation, StationHit } from './types';

/**
 * A grid over the station set, for "what is near this point".
 *
 * 9,091 stations is small enough that a linear scan would work for one query
 * and far too slow for the hundreds of thousands a full import makes. A grid is
 * enough — the queries are all "within a few hundred metres", so a cell size
 * near that radius means a lookup touches nine cells and a handful of stations.
 */

/** Degrees of latitude per cell. ~0.01° is roughly 1.1km. */
const CELL_DEG = 0.01;

export class StationIndex {
    private cells = new Map<string, IndexedStation[]>();
    readonly size: number;

    constructor(stations: IndexedStation[]) {
        this.size = stations.length;
        for (const s of stations) {
            const key = StationIndex.key(s.lat, s.lon);
            const bucket = this.cells.get(key);
            if (bucket) bucket.push(s); else this.cells.set(key, [s]);
        }
    }

    /** Build from the app's `stations_master.json` shape. */
    static fromMaster(master: Record<string, { id: string; name: string; lat: number; lon: number }>): StationIndex {
        const list: IndexedStation[] = [];
        for (const s of Object.values(master)) {
            if (typeof s?.lat !== 'number' || typeof s?.lon !== 'number') continue;
            list.push({ id: s.id, name: s.name, lat: s.lat, lon: s.lon });
        }
        return new StationIndex(list);
    }

    private static key(lat: number, lon: number): string {
        return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lon / CELL_DEG)}`;
    }

    /**
     * Stations within `radiusMeters` of a point, nearest first.
     *
     * `limit` matters: in central Tokyo a 400m radius can catch a dozen
     * stations, and every one of them becomes a routing hypothesis. Taking the
     * nearest few is the difference between a fast import and a slow one.
     */
    near(lon: number, lat: number, radiusMeters: number, limit = 6): StationHit[] {
        // How many cells the radius spans. Longitude cells shrink with latitude,
        // so the span is computed against the local metre-per-degree.
        const latSpan = Math.ceil(radiusMeters / 111_320 / CELL_DEG);
        const metersPerLonDeg = 111_320 * Math.max(0.2, Math.cos(lat * Math.PI / 180));
        const lonSpan = Math.ceil(radiusMeters / metersPerLonDeg / CELL_DEG);

        const baseLat = Math.floor(lat / CELL_DEG);
        const baseLon = Math.floor(lon / CELL_DEG);
        const hits: StationHit[] = [];

        for (let dy = -latSpan; dy <= latSpan; dy++) {
            for (let dx = -lonSpan; dx <= lonSpan; dx++) {
                const bucket = this.cells.get(`${baseLat + dy}:${baseLon + dx}`);
                if (!bucket) continue;
                for (const s of bucket) {
                    const meters = metersBetween([lon, lat], [s.lon, s.lat]);
                    if (meters <= radiusMeters) hits.push({ ...s, meters });
                }
            }
        }
        hits.sort((a, b) => a.meters - b.meters);
        return hits.length > limit ? hits.slice(0, limit) : hits;
    }
}

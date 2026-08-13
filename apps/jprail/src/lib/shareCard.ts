import { Trip } from '../types/trip';
import { RailData, Section, Station, Line } from '../types/railData';

/**
 * What a share card is about, and what it can say.
 */

export type ShareScopeKind = 'all' | 'prefecture' | 'company' | 'line';

export interface ShareScope {
    kind: ShareScopeKind;
    /** Prefecture id, `company::line` id, or company id. Unused for 'all'. */
    id?: string;
    label?: string;
}

/** Blocks the user can put on the card. */
export type ShareBlockId = 'map' | 'totals' | 'lines' | 'prefectures' | 'badges';

export const SHARE_BLOCKS: ShareBlockId[] = ['map', 'totals', 'lines', 'prefectures', 'badges'];

export interface LineProgress {
    id: string;
    name: string;
    color: string;
    ridden: number;
    total: number;
    percent: number;
    stationsRidden: number;
    stationsTotal: number;
}

export interface ShareStats {
    distance: number;
    totalDistance: number;
    stations: number;
    totalStations: number;
    lines: number;
    totalLines: number;
    companies: number;
    totalCompanies: number;
    trips: number;
    /** Internal prefecture ids, of the form `p10`. Not JIS codes. */
    prefectures: Set<string>;
    /** Ridden lines, most complete first. */
    lineProgress: LineProgress[];
    firstTrip: Date | null;
    lastTrip: Date | null;
    /** Corner points of everything in scope, for framing the map. */
    bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number } | null;
}

const emptyStats = (): ShareStats => ({
    distance: 0, totalDistance: 0, stations: 0, totalStations: 0, lines: 0, totalLines: 0, companies: 0, totalCompanies: 0, trips: 0,
    prefectures: new Set(), lineProgress: [], firstTrip: null, lastTrip: null, bounds: null
});

/** Sections keyed by id, built once per rail dataset. */
const sectionIndexCache = new WeakMap<object, Map<number, Section>>();

function sectionIndex(railData: RailData): Map<number, Section> {
    const cached = sectionIndexCache.get(railData as unknown as object);
    if (cached) return cached;
    const index = new Map<number, Section>();
    const all = railData.sections?.lod?.high ?? railData.sections?.sections ?? [];
    for (const section of all) index.set(section.id, section);
    sectionIndexCache.set(railData as unknown as object, index);
    return index;
}

const fullLineId = (section: Section) => `${section.company_id}::${section.line_id}`;

/** Does this section belong to the scope the card is about? */
function sectionInScope(section: Section, scope: ShareScope, railData: RailData): boolean {
    switch (scope.kind) {
        case 'all':
            return true;
        case 'line':
            return fullLineId(section) === scope.id;
        case 'company':
            return String(section.company_id) === scope.id;
        case 'prefecture': {
            const stations = railData.stations as Record<string, Station>;
            const start = stations[section.start];
            const end = stations[section.end];
            return String(start?.prefecture_id) === scope.id || String(end?.prefecture_id) === scope.id;
        }
        default:
            return true;
    }
}

/**
 * Everything a card can show, for one scope.
 */
export function computeShareStats(
    trips: Trip[],
    railData: RailData | null,
    lineLengths: Record<string, number>,
    scope: ShareScope
): ShareStats {
    if (!railData) return emptyStats();

    const index = sectionIndex(railData);
    const stations = railData.stations as Record<string, Station>;
    const lines = railData.lines as Record<string, Line>;

    const stationIds = new Set<string>();
    const companies = new Set<string>();
    const prefectures = new Set<string>();
    const riddenSections = new Set<number>();
    let trips_ = 0;
    let firstTrip: Date | null = null;
    let lastTrip: Date | null = null;
    let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;

    for (const trip of trips) {
        let touchesScope = false;

        for (const sectionId of trip.sectionIds || []) {
            const section = index.get(Number(sectionId));
            if (!section || !sectionInScope(section, scope, railData)) continue;
            touchesScope = true;
            riddenSections.add(section.id);
            companies.add(String(section.company_id));
        }

        if (!touchesScope) continue;
        trips_++;

        for (const stationId of trip.path || []) {
            const station = stations[stationId];
            if (!station) continue;
            if (scope.kind === 'prefecture' && String(station.prefecture_id) !== scope.id) continue;
            stationIds.add(stationId);
            if (station.prefecture_id) prefectures.add(String(station.prefecture_id));
            if (station.lat < minLat) minLat = station.lat;
            if (station.lat > maxLat) maxLat = station.lat;
            if (station.lon < minLon) minLon = station.lon;
            if (station.lon > maxLon) maxLon = station.lon;
        }

        const when = trip.createdAt ? new Date(trip.createdAt) : null;
        if (when && !Number.isNaN(when.getTime())) {
            if (!firstTrip || when < firstTrip) firstTrip = when;
            if (!lastTrip || when > lastTrip) lastTrip = when;
        }
    }

    // Ridden distance per line & station counts per line
    const riddenPerLine = new Map<string, number>();
    const lineStationMap = new Map<string, Set<string>>();
    const lineRiddenStationMap = new Map<string, Set<string>>();

    let distance = 0;
    const allSections = railData.sections?.lod?.high ?? railData.sections?.sections ?? [];
    for (const section of allSections) {
        const id = fullLineId(section);
        if (!lineStationMap.has(id)) lineStationMap.set(id, new Set());
        if (section.start) lineStationMap.get(id)!.add(section.start);
        if (section.end) lineStationMap.get(id)!.add(section.end);

        if (riddenSections.has(section.id)) {
            const km = (section.length || 0) / 1000;
            distance += km;
            riddenPerLine.set(id, (riddenPerLine.get(id) || 0) + km);

            if (!lineRiddenStationMap.has(id)) lineRiddenStationMap.set(id, new Set());
            if (section.start) lineRiddenStationMap.get(id)!.add(section.start);
            if (section.end) lineRiddenStationMap.get(id)!.add(section.end);
        }
    }

    // Calculate nationwide totals
    let totalDistance = 0;
    for (const len of Object.values(lineLengths)) {
        totalDistance += len;
    }
    totalDistance = Math.round(totalDistance * 10) / 10;
    const totalStations = Object.keys(stations).length;
    const totalLines = Object.keys(lineLengths).length || Object.keys(lines).length;
    const totalCompanies = Object.keys(railData.companies || {}).length;

    const lineProgress: LineProgress[] = [];
    for (const [id, ridden] of riddenPerLine) {
        const total = lineLengths[id] || 0;
        const lineId = id.split('::')[1];
        const line = lines[lineId];
        const totalSt = lineStationMap.get(id)?.size || 0;
        const riddenSt = lineRiddenStationMap.get(id)?.size || 0;

        lineProgress.push({
            id,
            name: line?.name || id,
            color: line?.color ? `#${String(line.color).replace('#', '')}` : '#64748b',
            ridden: Math.round(ridden * 10) / 10,
            total: Math.round(total * 10) / 10,
            percent: total > 0 ? Math.min(100, Math.round((ridden / total) * 100)) : 0,
            stationsRidden: riddenSt,
            stationsTotal: totalSt
        });
    }

    lineProgress.sort((a, b) => b.ridden - a.ridden || b.total - a.total);

    return {
        distance: Math.round(distance * 10) / 10,
        totalDistance,
        stations: stationIds.size,
        totalStations,
        lines: riddenPerLine.size,
        totalLines,
        companies: companies.size,
        totalCompanies,
        trips: trips_,
        prefectures,
        lineProgress,
        firstTrip,
        lastTrip,
        bounds: minLat === Infinity ? null : { minLat, minLon, maxLat, maxLon }
    };
}

/** The scopes worth offering — only ones the user has actually ridden in. */
export function availableScopes(
    trips: Trip[],
    railData: RailData | null,
    regionNames: Record<string, { name?: string; name_en?: string; name_kr?: string }> | null,
    language: string
): { prefectures: ShareScope[]; companies: ShareScope[]; lines: ShareScope[] } {
    if (!railData) return { prefectures: [], companies: [], lines: [] };

    const index = sectionIndex(railData);
    const stations = railData.stations as Record<string, Station>;
    const lines = railData.lines as Record<string, Line>;
    const companyData = railData.companies as Record<string, { name?: string; name_en?: string; name_kr?: string }>;

    const prefectureIds = new Set<string>();
    const companyIds = new Set<string>();
    const lineIds = new Set<string>();

    for (const trip of trips) {
        for (const stationId of trip.path || []) {
            const prefecture = stations[stationId]?.prefecture_id;
            if (prefecture) prefectureIds.add(String(prefecture));
        }
        for (const sectionId of trip.sectionIds || []) {
            const section = index.get(Number(sectionId));
            if (!section) continue;
            companyIds.add(String(section.company_id));
            lineIds.add(fullLineId(section));
        }
    }

    const localised = (entry: { name?: string; name_en?: string; name_kr?: string } | undefined, fallback: string) => {
        if (!entry) return fallback;
        if (language === 'ko' && entry.name_kr) return entry.name_kr;
        if (language === 'en' && entry.name_en) return entry.name_en;
        return entry.name || fallback;
    };

    const byLabel = (a: ShareScope, b: ShareScope) => (a.label || '').localeCompare(b.label || '');

    return {
        prefectures: Array.from(prefectureIds)
            .map(id => ({ kind: 'prefecture' as const, id, label: localised(regionNames?.[id], id) }))
            .sort(byLabel),
        companies: Array.from(companyIds)
            .map(id => ({ kind: 'company' as const, id, label: localised(companyData?.[id], id) }))
            .sort(byLabel),
        lines: Array.from(lineIds)
            .map(id => ({ kind: 'line' as const, id, label: localised(lines[id.split('::')[1]], id) }))
            .sort(byLabel)
    };
}

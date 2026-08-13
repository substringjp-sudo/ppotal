import { Trip } from '../types/trip';
import { RailData, Section, Station, Line } from '../types/railData';

/**
 * What a share card is about, and what it can say.
 *
 * The map on screen is wherever the user happened to leave it. A card should
 * instead be about something — everything they have ridden, or one prefecture,
 * one operator, one line — and frame itself to that. Everything here is derived
 * from data the app already holds; nothing new is fetched.
 */

export type ShareScopeKind = 'all' | 'prefecture' | 'company' | 'line';

/**
 * Prefecture ids in this dataset look like `p10` and are an internal
 * numbering, not JIS codes — `p10` is Tokyo, `p46` is Hokkaido. They are kept
 * as strings here so nothing is tempted to read them as a number.
 */

export interface ShareScope {
    kind: ShareScopeKind;
    /** Prefecture id, `company::line` id, or company id. Unused for 'all'. */
    id?: string;
    label?: string;
}

/** Blocks the user can put on the card. */
export type ShareBlockId = 'map' | 'totals' | 'lines' | 'prefectures' | 'badges' | 'period';

export const SHARE_BLOCKS: ShareBlockId[] = ['map', 'totals', 'lines', 'prefectures', 'badges', 'period'];

export interface LineProgress {
    id: string;
    name: string;
    color: string;
    ridden: number;
    total: number;
    percent: number;
}

export interface ShareStats {
    distance: number;
    stations: number;
    lines: number;
    companies: number;
    trips: number;
    /** Internal prefecture ids, of the form `p10`. Not JIS codes — see below. */
    prefectures: Set<string>;
    /** Ridden lines, most complete first. */
    lineProgress: LineProgress[];
    firstTrip: Date | null;
    lastTrip: Date | null;
    /** Corner points of everything in scope, for framing the map. */
    bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number } | null;
}

const emptyStats = (): ShareStats => ({
    distance: 0, stations: 0, lines: 0, companies: 0, trips: 0,
    prefectures: new Set(), lineProgress: [], firstTrip: null, lastTrip: null, bounds: null
});

/** Sections keyed by id, built once per rail dataset. */
const sectionIndexCache = new WeakMap<object, Map<number, Section>>();

function sectionIndex(railData: RailData): Map<number, Section> {
    const cached = sectionIndexCache.get(railData as unknown as object);
    if (cached) return cached;
    const index = new Map<number, Section>();
    // The full-detail list is the one with every section in it; the LOD copies
    // are the same sections with coarser geometry.
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
 *
 * `lineLengths` is the published length of each line, so completion is ridden
 * against the whole line even when the scope is narrower.
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
    // A section ridden twice is one section of track, not two.
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
            // For a narrow scope, only count stations that are actually in it.
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

    // Ridden distance per line, counting each stretch of track once.
    const riddenPerLine = new Map<string, number>();
    let distance = 0;
    for (const sectionId of riddenSections) {
        const section = index.get(sectionId);
        if (!section) continue;
        const km = (section.length || 0) / 1000;
        distance += km;
        const id = fullLineId(section);
        riddenPerLine.set(id, (riddenPerLine.get(id) || 0) + km);
    }

    const lineProgress: LineProgress[] = [];
    for (const [id, ridden] of riddenPerLine) {
        const total = lineLengths[id] || 0;
        const lineId = id.split('::')[1];
        const line = lines[lineId];
        lineProgress.push({
            id,
            name: line?.name || id,
            color: line?.color ? `#${String(line.color).replace('#', '')}` : '#64748b',
            ridden: Math.round(ridden * 10) / 10,
            total: Math.round(total * 10) / 10,
            percent: total > 0 ? Math.min(100, Math.round((ridden / total) * 100)) : 0
        });
    }
    // Ranking by completion alone puts a 300m shuttle line ahead of the
    // Yamanote loop, because anything short is trivially 100%. Weighting by the
    // square root of the line's length balances how complete against how much
    // there was to complete, which is what makes a card worth showing.
    const notability = (line: LineProgress) => line.percent * Math.sqrt(Math.max(0.5, line.total));
    lineProgress.sort((a, b) => notability(b) - notability(a) || b.ridden - a.ridden);

    return {
        distance: Math.round(distance * 10) / 10,
        stations: stationIds.size,
        lines: riddenPerLine.size,
        companies: companies.size,
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

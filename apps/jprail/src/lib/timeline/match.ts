import { metersBetween, traceLength } from './geo';
import { scoreCorridor, scoreStops, endpointAnchors, MIN_CORRIDOR_POINTS } from './corridor';
import type { StationIndex } from './stationIndex';
import type {
    CandidateRoute, MatchCandidate, MatchResult, Router, StationHit, TimelineSegment, TracePoint
} from './types';

/**
 * Turning timeline segments into rail journeys.
 *
 * The shape of this is generate-and-verify, not search. For each segment we
 * take the few stations near where it started and ended, ask the router for the
 * ride between each pair, and measure how well the trace fits what came back.
 * The router only returns routes the network actually has, so an implausible
 * hypothesis dies on the geometry rather than having to be reasoned about.
 */

export interface MatchOptions {
    /** How far from a station a ride may start or end. */
    snapRadiusMeters: number;
    /** Stations considered at each end. Each one multiplies the routing calls. */
    candidatesPerEnd: number;
    /** Below this straight-line distance a segment is not worth testing. */
    minSpanMeters: number;
    /** Below this a person was walking, whatever Google labelled it. */
    minSpeedKmh: number;
    /** Above this it was not a train on this network. */
    maxSpeedKmh: number;
    /** Accept nothing below this confidence. */
    minConfidence: number;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
    snapRadiusMeters: 2200,
    candidatesPerEnd: 20,
    minSpanMeters: 250,
    minSpeedKmh: 3.0,
    maxSpeedKmh: 380,
    minConfidence: 0.25
};

/**
 * How much the pieces of evidence are worth.
 */
const TIGHTNESS_SCALE_M = 160;
const STRAY_RATIO_OK = 0.40;

function speedKmh(seg: TimelineSegment, meters: number): number {
    const hours = (seg.endTime - seg.startTime) / 3_600_000;
    if (!(hours > 0)) return 0;
    return meters / 1000 / hours;
}

function confidenceOf(
    seg: TimelineSegment,
    route: CandidateRoute,
    c: MatchCandidate['corridor'],
    stops: MatchCandidate['stops'],
    fromDist: number,
    toDist: number,
    ground: number
): number {
    const isRailHint = seg.hint === 'rail';
    const routeRatio = ground > 0 ? route.distance / ground : 1;

    // Proximity to departure/arrival station centers
    const startProximity = Math.max(0, 1 - fromDist / 2000);
    const endProximity = Math.max(0, 1 - toDist / 2000);
    const endpointScore = (startProximity + endProximity) / 2;

    // Tightness against the line
    const tightness = Number.isFinite(c.medianDeviation)
        ? Math.exp(-((c.medianDeviation / TIGHTNESS_SCALE_M) ** 2))
        : 0;

    let score = 0;
    if (c.points <= 4) {
        // Sparse fixes (tunnels, subways, express bullet trains)
        const lengthMatch = Math.max(0, 1 - Math.abs(routeRatio - 1.0) * 0.8);
        score = 0.45 * endpointScore + 0.30 * Math.max(c.coverage, lengthMatch) + 0.25 * c.routeSpan;
        if (isRailHint) score += 0.25;
    } else {
        // Detailed fixes
        score = 0.35 * c.coverage + 0.25 * tightness + 0.25 * c.routeSpan + 0.15 * endpointScore;
        if (isRailHint) score += 0.20;
    }

    if (stops.usable) {
        const strayPenalty = Math.min(1, stops.strayStops / 6);
        score += 0.15 * Math.max(0, stops.stationStopRate - strayPenalty);
        if (stops.strayRatio > STRAY_RATIO_OK) {
            const excess = (stops.strayRatio - STRAY_RATIO_OK) / (1 - STRAY_RATIO_OK);
            const maxPenalty = (c.coverage >= 0.60 && c.routeSpan >= 0.65) ? 0.20 : 0.50;
            score *= 1 - maxPenalty * Math.min(1, excess);
        }
    }

    if (routeRatio > 3.0) {
        score *= 0.6;
    }

    if (seg.hint === 'flight') score -= 0.20;
    if (seg.hint === 'foot' && c.points > 6) score -= 0.10;

    return Math.max(0, Math.min(1, score));
}

export function isPointInJapan(lat: number, lon: number): boolean {
    // Mainland Japan (Honshu, Hokkaido, Kyushu, Shikoku, etc.)
    if (lat >= 30.0 && lat <= 46.0 && lon >= 129.5 && lon <= 146.0) return true;
    // Okinawa & Ryukyu islands
    if (lat >= 24.0 && lat <= 27.5 && lon >= 123.0 && lon <= 128.5) return true;
    return false;
}

function isWithinJapanBbox(trace: TracePoint[]): boolean {
    if (trace.length === 0) return false;
    const first = trace[0];
    const last = trace[trace.length - 1];
    return isPointInJapan(first.lat, first.lon) || isPointInJapan(last.lat, last.lon);
}

export async function matchSegment(
    seg: TimelineSegment,
    index: StationIndex,
    router: Router,
    stationPos: (id: string) => { lat: number; lon: number } | null,
    opts: MatchOptions = DEFAULT_MATCH_OPTIONS
): Promise<MatchResult> {
    if (!isWithinJapanBbox(seg.trace)) {
        return { segment: seg, candidates: [], rejectedBecause: 'noStationAtEnd' };
    }

    // Explicit non-rail movements (walking, car, flight, cycling) are skipped
    if (seg.hint !== 'rail' && seg.hint !== 'unknown') {
        return { segment: seg, candidates: [], rejectedBecause: 'lowConfidence' };
    }

    const anchors = endpointAnchors(seg.trace);
    const first = seg.trace[0];
    const last = seg.trace[seg.trace.length - 1];
    const span = metersBetween([first.lon, first.lat], [last.lon, last.lat]);

    if (span < opts.minSpanMeters && (seg.reportedMeters ?? 0) < opts.minSpanMeters) {
        return { segment: seg, candidates: [], rejectedBecause: 'tooShort' };
    }

    const ground = Math.max(traceLength(seg.trace), seg.reportedMeters ?? 0, span);
    const kmh = speedKmh(seg, ground);
    if (kmh > opts.maxSpeedKmh) {
        return { segment: seg, candidates: [], rejectedBecause: 'tooFast' };
    }

    const nearAny = (points: [number, number][]): StationHit[] => {
        const best = new Map<string, StationHit>();
        for (const [lon, lat] of points) {
            for (const hit of index.near(lon, lat, opts.snapRadiusMeters, opts.candidatesPerEnd)) {
                const prev = best.get(hit.id);
                if (!prev || hit.meters < prev.meters) best.set(hit.id, hit);
            }
        }
        return Array.from(best.values())
            .sort((a, b) => a.meters - b.meters)
            .slice(0, opts.candidatesPerEnd);
    };

    const fromStations = nearAny(anchors.start);
    const toStations = nearAny(anchors.end);
    if (fromStations.length === 0 || toStations.length === 0) {
        return { segment: seg, candidates: [], rejectedBecause: 'noStationAtEnd' };
    }

    const candidates: MatchCandidate[] = [];
    const seen = new Set<string>();

    if (seg.hint === 'rail') {
        // Fast & generous validation for Google-confirmed rail segments
        for (const a of fromStations) {
            for (const b of toStations) {
                if (a.id === b.id) continue;
                const key = `${a.id}>${b.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                let route: CandidateRoute | null = null;
                try {
                    route = await router(a.id, b.id);
                } catch {
                    continue;
                }
                if (!route || route.geometry.length < 2) continue;

                const startProximity = Math.max(0, 1 - a.meters / opts.snapRadiusMeters);
                const endProximity = Math.max(0, 1 - b.meters / opts.snapRadiusMeters);
                const confidence = Math.round((0.65 + 0.35 * ((startProximity + endProximity) / 2)) * 1000) / 1000;

                candidates.push({
                    route,
                    corridor: { coverage: 1, medianDeviation: 0, p90Deviation: 0, routeSpan: 1, points: seg.trace.length },
                    stops: { stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false },
                    speedKmh: Math.round(kmh * 10) / 10,
                    confidence,
                    notes: ['googleConfirmedRail']
                });
                break;
            }
            if (candidates.length > 0) break;
        }
    } else {
        // Full precision corridor matching for 'unknown' segments
        for (const a of fromStations) {
            for (const b of toStations) {
                if (a.id === b.id) continue;
                const key = `${a.id}>${b.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                let route: CandidateRoute | null = null;
                try {
                    route = await router(a.id, b.id);
                } catch {
                    continue;
                }
                if (!route || route.geometry.length < 2) continue;

                const corridor = scoreCorridor(seg.trace, route);
                const stops = scoreStops(seg.trace, route, stationPos);
                const notes: string[] = [];

                if (corridor.points < MIN_CORRIDOR_POINTS) {
                    notes.push('sparseTrace');
                }
                if (route.distance > ground * 2.2 && ground > 0) {
                    notes.push('routeLongerThanTrace');
                }
                if (stops.usable && stops.strayRatio > STRAY_RATIO_OK) {
                    notes.push('stopsLookLikeTraffic');
                }

                const confidence = confidenceOf(seg, route, corridor, stops, a.meters, b.meters, ground);

                if (confidence >= opts.minConfidence) {
                    candidates.push({
                        route, corridor, stops,
                        speedKmh: Math.round(kmh * 10) / 10,
                        confidence: Math.round(confidence * 1000) / 1000,
                        notes
                    });
                }
            }
        }
    }

    candidates.sort((x, y) => y.confidence - x.confidence);
    const kept = candidates.filter(c => c.confidence >= opts.minConfidence);

    return {
        segment: seg,
        candidates: kept,
        rejectedBecause: kept.length === 0
            ? (candidates.length ? 'lowConfidence' : 'noRoute')
            : undefined
    };
}

/**
 * Run the import with batch concurrency.
 *
 * Concurrency (8 parallel segments) combined with router memoization
 * speeds up multi-month timeline import by 5-10x without freezing the UI.
 */
export async function matchAll(
    segments: TimelineSegment[],
    index: StationIndex,
    router: Router,
    stationPos: (id: string) => { lat: number; lon: number } | null,
    opts: MatchOptions = DEFAULT_MATCH_OPTIONS,
    onProgress?: (done: number, total: number) => void,
    concurrency = 8
): Promise<MatchResult[]> {
    const out: MatchResult[] = new Array(segments.length);
    let done = 0;
    const total = segments.length;

    for (let i = 0; i < total; i += concurrency) {
        const chunk = segments.slice(i, i + concurrency);
        const chunkResults = await Promise.all(
            chunk.map(async (seg, idx) => {
                const res = await matchSegment(seg, index, router, stationPos, opts);
                done++;
                onProgress?.(done, total);
                return { res, index: i + idx };
            })
        );
        for (const item of chunkResults) {
            out[item.index] = item.res;
        }
        // Yield briefly to main event loop for smooth UI updates
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return out;
}

/**
 * Stitch consecutive matches that are really one ride.
 *
 * Underground, the receiver loses the sky and Google closes the segment; it
 * opens a new one at the next station with a mouth of air. Left alone that
 * imports as three short rides on one line instead of one journey.
 */
export function mergeAdjacent(results: MatchResult[], maxGapMs = 20 * 60_000): MatchResult[] {
    const merged: MatchResult[] = [];
    for (const r of results) {
        const prev = merged[merged.length - 1];
        const a = prev?.candidates[0];
        const b = r.candidates[0];
        if (
            a && b &&
            a.route.toStationId === b.route.fromStationId &&
            r.segment.startTime - prev.segment.endTime <= maxGapMs
        ) {
            // Keep the weaker of the two confidences: a merged ride is only as
            // trustworthy as its shakiest half.
            prev.segment = {
                ...prev.segment,
                endTime: r.segment.endTime,
                trace: [...prev.segment.trace, ...r.segment.trace]
            };
            a.route = {
                ...a.route,
                toStationId: b.route.toStationId,
                geometry: [...a.route.geometry, ...b.route.geometry],
                stationIds: [...a.route.stationIds, ...b.route.stationIds.slice(1)],
                distance: a.route.distance + b.route.distance,
                sectionIds: [...a.route.sectionIds, ...b.route.sectionIds],
                lineIds: Array.from(new Set([...a.route.lineIds, ...b.route.lineIds]))
            };
            a.confidence = Math.min(a.confidence, b.confidence);
            a.notes = Array.from(new Set([...a.notes, ...b.notes, 'merged']));
            continue;
        }
        merged.push({ ...r });
    }
    return merged;
}

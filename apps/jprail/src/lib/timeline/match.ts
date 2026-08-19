import { metersBetween, traceLength } from './geo';
import { scoreCorridor, scoreStops, endpointAnchors, MIN_CORRIDOR_POINTS } from './corridor';
import type { StationIndex } from './stationIndex';
import type {
    CandidateRoute, MatchCandidate, MatchResult, Router, StationHit, TimelineSegment
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
    snapRadiusMeters: 400,
    candidatesPerEnd: 4,
    minSpanMeters: 1_200,
    // Brisk walking tops out near 7km/h and a bicycle near 25, but a subway
    // ride of two stops with long platform walks either side can average
    // surprisingly little, so this is deliberately generous. The corridor test
    // is what actually rejects walks — this only saves routing calls.
    minSpeedKmh: 12,
    // Shinkansen runs to 320km/h; anything faster was a flight.
    maxSpeedKmh: 340,
    // 0.60 is where the sweep separates cleanly: below it a car on a road
    // beside the track starts getting through, above it genuine sparse rides
    // start dropping out. See the harness notes in the PR.
    minConfidence: 0.60
};

/**
 * How much the pieces of evidence are worth.
 *
 * Coverage dominates because it is the direct question — were you on this
 * line. Span guards against a short trace scoring perfectly against a long
 * route. The stop pattern is worth less on its own but is the only thing that
 * separates a train from a car in a shared corridor, so it gets a real share
 * when it is usable at all.
 */
const W = { coverage: 0.35, span: 0.15, tightness: 0.35, stops: 0.15 };

/**
 * The scale on which "off the line" stops being noise and starts being a
 * different line.
 *
 * A linear ramp to the 150m tolerance is useless — everything scores "mostly
 * on it" — so tightness falls off as a Gaussian. The scale is set by real
 * traces, not by the decoys: city GPS on a genuine ride lands 35–40m off the
 * track once the receiver is fighting buildings, which is the same range as a
 * road running beside it. Tuning this tight enough to reject that road costs
 * far more real rides than it saves, so it is set to accept honest noise and
 * the stop pattern is left to do the separating.
 */
const TIGHTNESS_SCALE_M = 55;

/**
 * How many of a trace's slow points may be away from a station before it stops
 * looking like a train. Some slack: trains do hold at signals, and a station's
 * registered position is not always where the train stopped.
 */
const STRAY_RATIO_OK = 0.35;

function speedKmh(seg: TimelineSegment, meters: number): number {
    const hours = (seg.endTime - seg.startTime) / 3_600_000;
    if (!(hours > 0)) return 0;
    return meters / 1000 / hours;
}

function confidenceOf(
    c: MatchCandidate['corridor'],
    stops: MatchCandidate['stops'],
    hintBonus: number
): number {
    const tightness = Number.isFinite(c.medianDeviation)
        ? Math.exp(-((c.medianDeviation / TIGHTNESS_SCALE_M) ** 2))
        : 0;

    let score = W.coverage * c.coverage
        + W.span * c.routeSpan
        + W.tightness * tightness;

    if (stops.usable) {
        // Stray stops are the car signature: many slow points nowhere near a
        // station. Normalised against the stops we did place.
        const strayPenalty = Math.min(1, stops.strayStops / 8);
        score += W.stops * Math.max(0, stops.stationStopRate - strayPenalty);
    }
    // When the stop test cannot run — a two-station hop, or a trace too sparse
    // to show a stop — its share is simply not awarded. Handing it back as a
    // coverage bonus is what let a car on a parallel road score like a train.

    return Math.max(0, Math.min(1, score + hintBonus));
}

/**
 * Google's label as a nudge, never a gate.
 *
 * A ride Google called a walk still gets tested, and a walk Google called a
 * train still has to earn it on the geometry. This only breaks ties.
 */
function hintBonus(seg: TimelineSegment): number {
    const p = seg.hintProbability ?? 0.5;
    switch (seg.hint) {
        case 'rail': return 0.05 * p;
        case 'flight': return -0.10;
        case 'foot': return -0.02;
        default: return 0;
    }
}

export async function matchSegment(
    seg: TimelineSegment,
    index: StationIndex,
    router: Router,
    stationPos: (id: string) => { lat: number; lon: number } | null,
    opts: MatchOptions = DEFAULT_MATCH_OPTIONS
): Promise<MatchResult> {
    const anchors = endpointAnchors(seg.trace);
    const first = seg.trace[0];
    const last = seg.trace[seg.trace.length - 1];
    const span = metersBetween([first.lon, first.lat], [last.lon, last.lat]);

    if (span < opts.minSpanMeters) {
        return { segment: seg, candidates: [], rejectedBecause: 'tooShort' };
    }

    // Ground distance rather than straight line, so a loop line is not judged
    // on its chord. Falls back to the reported distance when the trace is only
    // two points, which is the normal case for a subway ride.
    const ground = Math.max(traceLength(seg.trace), seg.reportedMeters ?? 0, span);
    const kmh = speedKmh(seg, ground);
    if (kmh < opts.minSpeedKmh) {
        return { segment: seg, candidates: [], rejectedBecause: 'tooSlow' };
    }
    if (kmh > opts.maxSpeedKmh) {
        return { segment: seg, candidates: [], rejectedBecause: 'tooFast' };
    }

    // Best station across each anchor point rather than around one averaged
    // position — see `endpointAnchors` for why the average is the wrong shape.
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

    const bonus = hintBonus(seg);
    const candidates: MatchCandidate[] = [];
    const seen = new Set<string>();

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
                continue; // a routing failure is not a match failure
            }
            if (!route || route.geometry.length < 2) continue;

            const corridor = scoreCorridor(seg.trace, route);
            const stops = scoreStops(seg.trace, route, stationPos);
            const notes: string[] = [];

            if (corridor.points < MIN_CORRIDOR_POINTS) {
                notes.push('sparseTrace');
            }
            // A route far longer than the ground truth means the router went
            // the long way round — the same two stations, a different journey.
            if (route.distance > ground * 1.8 && ground > 0) {
                notes.push('routeLongerThanTrace');
            }
            // A train slows at stations. When most of a trace's slow points are
            // not at any station on the route, whatever it was, it was not on
            // this railway — however well the geometry lines up.
            if (stops.usable && stops.strayRatio > STRAY_RATIO_OK) {
                notes.push('stopsLookLikeTraffic');
            }
            if (seg.hint === 'foot' || seg.hint === 'road') {
                notes.push(`googleSaid:${seg.hint}`);
            }

            let confidence = confidenceOf(corridor, stops, bonus);
            if (notes.includes('routeLongerThanTrace')) confidence *= 0.7;
            if (notes.includes('stopsLookLikeTraffic')) {
                // Scaled by how bad it is rather than a flat cut, so a ride
                // with one signal stop is not treated like a drive across town.
                const excess = (stops.strayRatio - STRAY_RATIO_OK) / (1 - STRAY_RATIO_OK);
                confidence *= 1 - 0.7 * Math.min(1, excess);
            }

            candidates.push({
                route, corridor, stops,
                speedKmh: Math.round(kmh * 10) / 10,
                confidence: Math.round(confidence * 1000) / 1000,
                notes
            });
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
 * Run the whole import.
 *
 * Sequential on purpose: the router is a network call per hypothesis and a
 * year of timeline is thousands of them, so this needs to stay polite and
 * interruptible rather than fast. `onProgress` is what the UI drives from.
 */
export async function matchAll(
    segments: TimelineSegment[],
    index: StationIndex,
    router: Router,
    stationPos: (id: string) => { lat: number; lon: number } | null,
    opts: MatchOptions = DEFAULT_MATCH_OPTIONS,
    onProgress?: (done: number, total: number) => void
): Promise<MatchResult[]> {
    const out: MatchResult[] = [];
    for (let i = 0; i < segments.length; i++) {
        out.push(await matchSegment(segments[i], index, router, stationPos, opts));
        onProgress?.(i + 1, segments.length);
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
export function mergeAdjacent(results: MatchResult[], maxGapMs = 3 * 60_000): MatchResult[] {
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

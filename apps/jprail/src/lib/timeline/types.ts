/**
 * Google Timeline import — the shared vocabulary.
 *
 * Everything downstream works on `TimelineSegment`, never on Google's own
 * shapes, because Google has shipped at least three different export formats
 * and will ship more. The parser absorbs that; nothing else needs to know.
 */

/** A point on the ground with a time. Longitude first, to match GeoJSON. */
export interface TracePoint {
    lon: number;
    lat: number;
    /** Epoch milliseconds. */
    t: number;
}

/**
 * What Google thought the user was doing. Kept as a hint, never as a decision:
 * the whole premise of this feature is that these labels are wrong often enough
 * to be useless as a filter — rides get called walks, drives get called trains.
 */
export type ActivityHint =
    | 'rail'      // IN_TRAIN, IN_SUBWAY, IN_TRAM
    | 'road'      // IN_PASSENGER_VEHICLE, IN_BUS, IN_TAXI
    | 'foot'      // WALKING, RUNNING
    | 'cycle'
    | 'flight'
    | 'unknown';

/** One movement between two places, normalised out of whichever export format. */
export interface TimelineSegment {
    /** Stable within one import, for referring back to the source. */
    id: string;
    startTime: number;
    endTime: number;
    /** Time-ordered, may be as sparse as two points (tunnels, or a coarse export). */
    trace: TracePoint[];
    hint: ActivityHint;
    /** Google's own confidence in `hint`, 0–1, when the export carries one. */
    hintProbability?: number;
    /** Distance Google reported, in metres. Independent of `trace`. */
    reportedMeters?: number;
    /** Which export this came out of, for diagnostics. */
    source: 'semanticSegments' | 'activitySegment' | 'records';
}

export interface ParseResult {
    segments: TimelineSegment[];
    /** Counts by reason, so an import that finds nothing can say why. */
    skipped: Record<string, number>;
}

/** A station the index can return. */
export interface IndexedStation {
    id: string;
    name: string;
    lat: number;
    lon: number;
}

export interface StationHit extends IndexedStation {
    /** Metres from the query point. */
    meters: number;
}

/**
 * A route the matcher is testing a segment against. The matcher does not build
 * these — it asks a router for them, so the same code works against the real
 * server routing and against a local graph in tests.
 */
export interface CandidateRoute {
    fromStationId: string;
    toStationId: string;
    /** [lon, lat] along the whole ride, already stitched across sections. */
    geometry: [number, number][];
    /** Stations passed through, in order, including both ends. */
    stationIds: string[];
    /** Metres. */
    distance: number;
    sectionIds: number[];
    lineIds: number[];
}

export type Router = (
    fromStationId: string,
    toStationId: string
) => Promise<CandidateRoute | null>;

/** How well one segment fits one candidate route. */
export interface CorridorScore {
    /** Fraction of trace points within the tolerance band. 0–1. */
    coverage: number;
    /** Median metres from a trace point to the route. */
    medianDeviation: number;
    /** 90th percentile deviation — catches a trace that leaves and comes back. */
    p90Deviation: number;
    /**
     * How much of the route the trace actually spans, 0–1. Guards against a
     * short trace scoring perfectly against a long route it only touched.
     */
    routeSpan: number;
    /** Trace points used. Low counts mean the other numbers are weak evidence. */
    points: number;
}

export interface StopEvidence {
    /** Of the intermediate stations on the route, the fraction slowed near. */
    stationStopRate: number;
    /** Slow points that were nowhere near a station — traffic, not stations. */
    strayStops: number;
    /** Every point the trace was crawling at. */
    slowPoints: number;
    /**
     * `strayStops / slowPoints` — the separator that actually works.
     *
     * `stationStopRate` looks like the right question and is not: scatter six
     * traffic lights along a route with four stations and two will land near a
     * station by chance, so a car scores 0.5 and passes for a train. What a
     * train cannot fake is the converse — nearly every time it slows, it is at
     * a station. A car slowing at lights has a stray ratio near 1.
     */
    strayRatio: number;
    /** Whether the trace was dense enough for any of this to mean anything. */
    usable: boolean;
}

export interface MatchCandidate {
    route: CandidateRoute;
    corridor: CorridorScore;
    stops: StopEvidence;
    /** Mean speed over the segment, km/h. */
    speedKmh: number;
    /** 0–1. */
    confidence: number;
    /** Human-readable reasons, for the review UI and for debugging. */
    notes: string[];
}

export interface MatchResult {
    segment: TimelineSegment;
    /** Best first. Empty when nothing plausible was found. */
    candidates: MatchCandidate[];
    /** Set when the segment was rejected before routing was attempted. */
    rejectedBecause?: string;
}

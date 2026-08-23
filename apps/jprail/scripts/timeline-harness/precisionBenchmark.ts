import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { makeLocalRouter, loadFixtures } from './localRouter';
import { metersBetween, prepareLine, nearestOnLine, percentile } from '../../src/lib/timeline/geo';
import { MatchOptions } from '../../src/lib/timeline/match';
import type { CandidateRoute, Router, TimelineSegment, MatchCandidate, MatchResult, CorridorScore } from '../../src/lib/timeline/types';

function createCachedRouter(innerRouter: Router): Router {
    const cache = new Map<string, Promise<CandidateRoute | null>>();
    return (fromId, toId) => {
        const key = `${fromId}>${toId}`;
        const existing = cache.get(key);
        if (existing) return existing;
        const p = innerRouter(fromId, toId);
        cache.set(key, p);
        return p;
    };
}

function isTrulyInJapan(p: { lat: number; lon: number }): boolean {
    if (p.lat >= 30 && p.lat <= 46 && p.lon >= 129.5 && p.lon <= 146.0) return true;
    if (p.lat >= 26 && p.lat <= 27 && p.lon >= 127.5 && p.lon <= 128.5) return true;
    return false;
}

function scoreCorridorPrecision(
    trace: { lon: number; lat: number; t: number }[],
    route: CandidateRoute,
    toleranceMeters = 350
): CorridorScore {
    if (route.geometry.length < 2 || trace.length === 0) {
        return { coverage: 0, medianDeviation: Infinity, p90Deviation: Infinity, routeSpan: 0, points: 0 };
    }
    const line = prepareLine(route.geometry);
    const deviations: number[] = [];
    let within = 0;
    let minAlong = Infinity;
    let maxAlong = -Infinity;

    for (const p of trace) {
        const { distance, along } = nearestOnLine(line, p.lon, p.lat);
        deviations.push(distance);
        if (distance <= toleranceMeters) {
            within++;
            if (along < minAlong) minAlong = along;
            if (along > maxAlong) maxAlong = along;
        }
    }

    const sorted = deviations.slice().sort((a, b) => a - b);
    const span = maxAlong > minAlong && line.length > 0
        ? (maxAlong - minAlong) / line.length
        : 0;

    return {
        coverage: within / trace.length,
        medianDeviation: percentile(sorted, 0.5),
        p90Deviation: percentile(sorted, 0.9),
        routeSpan: Math.min(1, span),
        points: trace.length
    };
}

function computePrecisionConfidence(
    seg: TimelineSegment,
    route: CandidateRoute,
    c: CorridorScore,
    stops: MatchCandidate['stops'],
    fromDist: number,
    toDist: number,
    ground: number
): { confidence: number; notes: string[] } {
    const notes: string[] = [];
    const isRailHint = seg.hint === 'rail';
    const routeRatio = ground > 0 ? route.distance / ground : 1;

    // Proximity to departure/arrival station centers
    const startProximity = Math.max(0, 1 - fromDist / 1600);
    const endProximity = Math.max(0, 1 - toDist / 1600);
    const endpointScore = (startProximity + endProximity) / 2;

    // Tightness against the line
    const tightness = Number.isFinite(c.medianDeviation)
        ? Math.exp(-((c.medianDeviation / 130) ** 2))
        : 0;

    let score = 0;
    if (c.points <= 4) {
        // Sparse fixes (tunnels, subways, express bullet trains)
        const lengthMatch = Math.max(0, 1 - Math.abs(routeRatio - 1.0) * 0.8);
        score = 0.45 * endpointScore + 0.30 * Math.max(c.coverage, lengthMatch) + 0.25 * c.routeSpan;
        if (isRailHint) score += 0.20;
    } else {
        // Detailed fixes
        score = 0.35 * c.coverage + 0.25 * tightness + 0.25 * c.routeSpan + 0.15 * endpointScore;
        if (isRailHint) score += 0.15;
    }

    if (stops.usable) {
        const strayPenalty = Math.min(1, stops.strayStops / 6);
        score += 0.15 * Math.max(0, stops.stationStopRate - strayPenalty);
        if (stops.strayRatio > 0.35) {
            const excess = (stops.strayRatio - 0.35) / 0.65;
            score *= 1 - 0.7 * Math.min(1, excess);
            notes.push('stopsLookLikeTraffic');
        }
    }

    if (routeRatio > 2.2) {
        score *= 0.5;
        notes.push('routeWayLongerThanTrace');
    }

    if (seg.hint === 'flight') score -= 0.20;
    if (seg.hint === 'foot' && c.points > 6) score -= 0.10;

    return { confidence: Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000, notes };
}

async function runPrecisionBenchmark() {
    console.log('=== High-Precision Timeline Matching Engine Benchmark ===');
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const t0 = Date.now();
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[1/4] JSON Parsed in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

    const tParse = Date.now();
    const { segments } = parseTimeline(json);
    console.log(`[2/4] Raw Segments Extracted: ${segments.length} in ${((Date.now() - tParse) / 1000).toFixed(2)}s`);

    // Pre-filter to Japan territory
    const tFilter = Date.now();
    const japanSegments = segments.filter(s => {
        if (s.trace.length === 0) return false;
        return isTrulyInJapan(s.trace[0]) || isTrulyInJapan(s.trace[s.trace.length - 1]);
    });
    console.log(`[3/4] Filtered to Japan Segments: ${japanSegments.length} in ${((Date.now() - tFilter) / 1000).toFixed(2)}s`);

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));

    const snapRadius = 1500;
    const candidatesLimit = 6;
    const minConfidence = 0.32;
    const minSpan = 350;

    const tMatch = Date.now();
    const results: MatchResult[] = [];

    for (let i = 0; i < japanSegments.length; i++) {
        const seg = japanSegments[i];
        const first = seg.trace[0];
        const last = seg.trace[seg.trace.length - 1];
        const span = metersBetween([first.lon, first.lat], [last.lon, last.lat]);

        if (span < minSpan && (seg.reportedMeters ?? 0) < minSpan) {
            results.push({ segment: seg, candidates: [], rejectedBecause: 'tooShort' });
            continue;
        }

        const ground = Math.max(seg.reportedMeters ?? 0, span);
        const hours = (seg.endTime - seg.startTime) / 3_600_000;
        const kmh = hours > 0 ? ground / 1000 / hours : 0;

        if (kmh > 360) {
            results.push({ segment: seg, candidates: [], rejectedBecause: 'tooFast' });
            continue;
        }

        const fromStations = index.near(first.lon, first.lat, snapRadius, candidatesLimit);
        const toStations = index.near(last.lon, last.lat, snapRadius, candidatesLimit);

        if (fromStations.length === 0 || toStations.length === 0) {
            results.push({ segment: seg, candidates: [], rejectedBecause: 'noStationAtEnd' });
            continue;
        }

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
                    continue;
                }
                if (!route || route.geometry.length < 2) continue;

                const corridor = scoreCorridorPrecision(seg.trace, route);
                const { confidence, notes } = computePrecisionConfidence(seg, route, corridor, { stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false }, a.meters, b.meters, ground);

                candidates.push({
                    route,
                    corridor,
                    stops: { stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false },
                    speedKmh: Math.round(kmh * 10) / 10,
                    confidence,
                    notes
                });
            }
        }

        candidates.sort((x, y) => y.confidence - x.confidence);
        const kept = candidates.filter(c => c.confidence >= minConfidence);

        results.push({
            segment: seg,
            candidates: kept,
            rejectedBecause: kept.length === 0 ? (candidates.length ? 'lowConfidence' : 'noRoute') : undefined
        });
    }

    console.log(`[4/4] Matched ${japanSegments.length} Segments in ${((Date.now() - tMatch) / 1000).toFixed(2)}s`);

    // Merge adjacent connected routes
    const merged: MatchResult[] = [];
    for (const r of results) {
        const prev = merged[merged.length - 1];
        const a = prev?.candidates[0];
        const b = r.candidates[0];
        if (
            a && b &&
            a.route.toStationId === b.route.fromStationId &&
            r.segment.startTime - prev.segment.endTime <= 20 * 60_000
        ) {
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
            continue;
        }
        merged.push({ ...r });
    }

    const mergedMatched = merged.filter(m => m.candidates.length > 0);
    console.log(`\n======================================================`);
    console.log(`🔥 TOTAL RECOGNIZED JOURNEYS: ${mergedMatched.length} trips!`);
    console.log(`⚡ TOTAL PIPELINE DURATION: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    console.log(`======================================================\n`);

    // Group recognized trips by year
    const yearGroups = new Map<string, number>();
    for (const m of mergedMatched) {
        const y = new Date(m.segment.startTime).toISOString().slice(0, 4);
        yearGroups.set(y, (yearGroups.get(y) ?? 0) + 1);
    }
    console.log('Trips per year:', Object.fromEntries(yearGroups.entries()));
}

runPrecisionBenchmark().catch(err => console.error('Benchmark failed:', err));

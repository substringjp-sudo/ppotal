import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { makeLocalRouter, loadFixtures } from './localRouter';
import { metersBetween, prepareLine, nearestOnLine, percentile } from '../../src/lib/timeline/geo';
import { MatchOptions } from '../../src/lib/timeline/match';
import type { CandidateRoute, Router, TimelineSegment, MatchCandidate, MatchResult, CorridorScore, StopEvidence } from '../../src/lib/timeline/types';

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

/** Robust corridor scoring designed for real-world sparse/curved traces */
function scoreCorridorRobust(
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

function calculateRobustConfidence(
    seg: TimelineSegment,
    route: CandidateRoute,
    corridor: CorridorScore,
    fromDist: number,
    toDist: number,
    ground: number
): { confidence: number; notes: string[] } {
    const notes: string[] = [];
    const isRailHint = seg.hint === 'rail';

    // Route length vs ground length ratio
    const routeRatio = ground > 0 ? route.distance / ground : 1;
    if (routeRatio > 2.0) {
        notes.push('routeWayLongerThanTrace');
    }

    // Endpoint proximity score (0..1)
    const startScore = Math.max(0, 1 - fromDist / 1500);
    const endScore = Math.max(0, 1 - toDist / 1500);
    const endpointScore = (startScore + endScore) / 2;

    // Tightness (Gaussian with 120m scale)
    const tightness = Number.isFinite(corridor.medianDeviation)
        ? Math.exp(-((corridor.medianDeviation / 120) ** 2))
        : 0;

    let score = 0;
    if (corridor.points <= 4) {
        // Sparse trace (tunnel/fast train): heavily rely on endpoints, span, and length ratio
        const lengthMatch = Math.max(0, 1 - Math.abs(routeRatio - 1.0));
        score = 0.40 * endpointScore + 0.35 * Math.max(corridor.coverage, lengthMatch) + 0.25 * corridor.routeSpan;
        if (isRailHint) score += 0.20;
    } else {
        // Rich trace
        score = 0.35 * corridor.coverage + 0.25 * tightness + 0.25 * corridor.routeSpan + 0.15 * endpointScore;
        if (isRailHint) score += 0.15;
    }

    if (notes.includes('routeWayLongerThanTrace')) {
        score *= 0.6;
    }

    const finalConf = Math.max(0, Math.min(1, score));
    return { confidence: Math.round(finalConf * 1000) / 1000, notes };
}

async function testImprovedMatcher() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const parseRes = parseTimeline(json);

    function isTrulyInJapan(p: { lat: number; lon: number }): boolean {
        if (p.lat >= 30 && p.lat <= 46 && p.lon >= 129.5 && p.lon <= 146.0) return true;
        if (p.lat >= 26 && p.lat <= 27 && p.lon >= 127.5 && p.lon <= 128.5) return true;
        return false;
    }

    const realJapanSegments = parseRes.segments.filter(s => {
        if (s.trace.length === 0) return false;
        return isTrulyInJapan(s.trace[0]) || isTrulyInJapan(s.trace[s.trace.length - 1]);
    });

    console.log(`Total real Japan segments: ${realJapanSegments.length}`);

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));

    const snapRadius = 1500;
    const candidatesLimit = 6;
    const minConfidence = 0.35;

    const start = Date.now();
    const results: MatchResult[] = [];

    for (let i = 0; i < realJapanSegments.length; i++) {
        const seg = realJapanSegments[i];
        const first = seg.trace[0];
        const last = seg.trace[seg.trace.length - 1];
        const span = metersBetween([first.lon, first.lat], [last.lon, last.lat]);

        if (span < 400 && (seg.reportedMeters ?? 0) < 400) {
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

                const corridor = scoreCorridorRobust(seg.trace, route);
                const { confidence, notes } = calculateRobustConfidence(seg, route, corridor, a.meters, b.meters, ground);

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

    console.log(`Matching finished in ${((Date.now() - start) / 1000).toFixed(2)}s`);

    const rejections: Record<string, number> = {};
    let withCandidate = 0;
    for (const m of results) {
        if (m.candidates.length > 0) {
            withCandidate++;
        } else if (m.rejectedBecause) {
            rejections[m.rejectedBecause] = (rejections[m.rejectedBecause] ?? 0) + 1;
        }
    }

    console.log(`Matched segments: ${withCandidate} / ${realJapanSegments.length} (${(withCandidate / realJapanSegments.length * 100).toFixed(1)}%)`);
    console.log('Rejections:', rejections);

    // Merge adjacent
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
    console.log(`\n🎉 FINAL MERGED TRIPS: ${mergedMatched.length} routes recognized!`);

    // Let's print out the trips across different years/trips
    console.log('\n--- Timeline of Recognized Trips (Sample of 40) ---');
    for (const m of mergedMatched.slice(0, 40)) {
        const c = m.candidates[0]!;
        const fromName = (fixtures.stations as any)[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const toName = (fixtures.stations as any)[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(0, 16).replace('T', ' ');
        const distKm = (c.route.distance / 1000).toFixed(1);
        const linesStr = c.route.lineIds.map(lid => (fixtures.lines as any)[String(lid)]?.name ?? lid).slice(0, 3).join(', ');
        console.log(`  [${dt}] ${fromName} -> ${toName} (${distKm}km, conf=${c.confidence}, hint=${m.segment.hint}) [${linesStr}]`);
    }
}

testImprovedMatcher().catch(err => console.error('Failed:', err));

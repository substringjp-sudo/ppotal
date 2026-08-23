import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { makeLocalRouter, loadFixtures } from './localRouter';
import { metersBetween, prepareLine, nearestOnLine, percentile } from '../../src/lib/timeline/geo';
import { isPointInJapan } from '../../src/lib/timeline/match';
import type { CandidateRoute, Router, MatchCandidate, MatchResult, CorridorScore, TimelineSegment } from '../../src/lib/timeline/types';

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

async function testUserRequestedStrategy() {
    console.log('=== Testing User Requested 2-Stage Strategy on 133MB Timeline ===');
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const t0 = Date.now();
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[1] JSON Parsed in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

    const tParse = Date.now();
    const { segments } = parseTimeline(json);
    console.log(`[2] Raw Segments Extracted: ${segments.length} in ${((Date.now() - tParse) / 1000).toFixed(2)}s`);

    // Step 1: Filter to Japan territory AND (hint === 'rail' OR hint === 'unknown')
    const tFilter = Date.now();
    const targetSegments = segments.filter(s => {
        if (s.trace.length === 0) return false;
        const f = s.trace[0];
        const l = s.trace[s.trace.length - 1];
        if (!isPointInJapan(f.lat, f.lon) && !isPointInJapan(l.lat, l.lon)) return false;

        // Skip anything Google determined as non-rail (foot, road, cycling, flight, ferry, still)
        if (s.hint !== 'rail' && s.hint !== 'unknown') {
            return false;
        }
        return true;
    });

    const railCount = targetSegments.filter(s => s.hint === 'rail').length;
    const unknownCount = targetSegments.filter(s => s.hint === 'unknown').length;
    console.log(`[3] Japan Target Segments: ${targetSegments.length} (rail: ${railCount}, unknown: ${unknownCount}) filtered in ${((Date.now() - tFilter) / 1000).toFixed(3)}s`);

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));

    const snapRadius = 1500;
    const candidatesLimit = 6;
    const minSpan = 350;

    const tMatch = Date.now();
    const results: MatchResult[] = [];

    for (let i = 0; i < targetSegments.length; i++) {
        const seg = targetSegments[i];
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

        // For Google-confirmed 'rail': fast validation
        if (seg.hint === 'rail') {
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

                    // Length consistency check: route shouldn't be wildly out of proportion
                    const routeRatio = ground > 0 ? route.distance / ground : 1;
                    if (routeRatio > 2.5 || routeRatio < 0.4) continue;

                    const startProximity = Math.max(0, 1 - a.meters / 1600);
                    const endProximity = Math.max(0, 1 - b.meters / 1600);
                    const confidence = Math.round((0.5 + 0.5 * ((startProximity + endProximity) / 2)) * 1000) / 1000;

                    candidates.push({
                        route,
                        corridor: { coverage: 1, medianDeviation: 0, p90Deviation: 0, routeSpan: 1, points: seg.trace.length },
                        stops: { stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false },
                        speedKmh: Math.round(kmh * 10) / 10,
                        confidence,
                        notes: ['googleConfirmedRail']
                    });
                    break; // Found primary connecting route
                }
                if (candidates.length > 0) break;
            }
        } else {
            // For 'unknown': run precision corridor & stop pattern scoring
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
                    const routeRatio = ground > 0 ? route.distance / ground : 1;
                    const startProximity = Math.max(0, 1 - a.meters / 1600);
                    const endProximity = Math.max(0, 1 - b.meters / 1600);
                    const endpointScore = (startProximity + endProximity) / 2;

                    const tightness = Number.isFinite(corridor.medianDeviation)
                        ? Math.exp(-((corridor.medianDeviation / 130) ** 2))
                        : 0;

                    let score = 0;
                    if (corridor.points <= 4) {
                        const lengthMatch = Math.max(0, 1 - Math.abs(routeRatio - 1.0) * 0.8);
                        score = 0.45 * endpointScore + 0.30 * Math.max(corridor.coverage, lengthMatch) + 0.25 * corridor.routeSpan;
                    } else {
                        score = 0.35 * corridor.coverage + 0.25 * tightness + 0.25 * corridor.routeSpan + 0.15 * endpointScore;
                    }

                    if (routeRatio > 2.2) score *= 0.5;

                    const confidence = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
                    if (confidence >= 0.32) {
                        candidates.push({
                            route,
                            corridor,
                            stops: { stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false },
                            speedKmh: Math.round(kmh * 10) / 10,
                            confidence,
                            notes: ['matchedUnknown']
                        });
                    }
                }
            }
        }

        candidates.sort((x, y) => y.confidence - x.confidence);
        results.push({
            segment: seg,
            candidates,
            rejectedBecause: candidates.length === 0 ? 'noRoute' : undefined
        });
    }

    console.log(`[4] Matched in ${((Date.now() - tMatch) / 1000).toFixed(2)}s`);

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
    console.log(`\n======================================================`);
    console.log(`🎉 RECOGNIZED JOURNEYS: ${mergedMatched.length} routes`);
    console.log(`⚡ TOTAL PIPELINE TIME: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    console.log(`======================================================\n`);

    const yearGroups = new Map<string, number>();
    for (const m of mergedMatched) {
        const y = new Date(m.segment.startTime).toISOString().slice(0, 4);
        yearGroups.set(y, (yearGroups.get(y) ?? 0) + 1);
    }
    console.log('Trips per year:', Object.fromEntries(yearGroups.entries()));
}

testUserRequestedStrategy().catch(err => console.error('Failed:', err));

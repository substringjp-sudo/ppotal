import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS } from '../../src/lib/timeline/match';
import { makeLocalRouter, loadFixtures } from './localRouter';
import type { CandidateRoute, Router } from '../../src/lib/timeline/types';

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

async function analyze() {
    console.log('Loading real timeline file (133MB)...');
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const startRead = Date.now();
    const raw = fs.readFileSync(filePath, 'utf-8');
    console.log(`File read in ${((Date.now() - startRead) / 1000).toFixed(2)}s`);

    const startParseJson = Date.now();
    const json = JSON.parse(raw);
    console.log(`JSON.parse in ${((Date.now() - startParseJson) / 1000).toFixed(2)}s`);

    console.log('Top-level keys / type:', Array.isArray(json) ? `Array length ${json.length}` : Object.keys(json));
    if (Array.isArray(json) && json.length > 0) {
        console.log('First 3 items keys:', json.slice(0, 3).map(x => Object.keys(x || {})));
        console.log('Sample item 0:', JSON.stringify(json[0], null, 2).slice(0, 500));
    } else if (typeof json === 'object') {
        for (const k of Object.keys(json)) {
            const val = (json as any)[k];
            console.log(`Key "${k}": type=${typeof val}, length=${Array.isArray(val) ? val.length : 'N/A'}`);
        }
    }

    console.log('\n--- Running parseTimeline ---');
    const startParse = Date.now();
    const parseRes = parseTimeline(json);
    console.log(`parseTimeline finished in ${((Date.now() - startParse) / 1000).toFixed(2)}s`);
    console.log(`Total segments parsed: ${parseRes.segments.length}`);
    console.log('Skipped summary:', parseRes.skipped);

    // Analyze segment locations (Japan vs outside Japan)
    let inJapan = 0;
    let outOfJapan = 0;
    let zeroTrace = 0;
    const hintsCount: Record<string, number> = {};
    const sourcesCount: Record<string, number> = {};

    for (const s of parseRes.segments) {
        sourcesCount[s.source] = (sourcesCount[s.source] ?? 0) + 1;
        hintsCount[s.hint] = (hintsCount[s.hint] ?? 0) + 1;
        if (s.trace.length === 0) {
            zeroTrace++;
            continue;
        }
        const p = s.trace[0];
        if (p.lat >= 20 && p.lat <= 48 && p.lon >= 120 && p.lon <= 155) {
            inJapan++;
        } else {
            outOfJapan++;
        }
    }

    console.log('\n--- Segments Geography & Hints ---');
    console.log(`In Japan bounds: ${inJapan}, Out of Japan: ${outOfJapan}, Empty trace: ${zeroTrace}`);
    console.log('Sources:', sourcesCount);
    console.log('Hints:', hintsCount);

    // Load rail network fixtures and match
    console.log('\n--- Loading Rail Network & Index ---');
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    console.log('\n--- Accurate Japan Segments Filtering ---');
    // Japan mainland: lat 30..46, lon 129.5..146 (Okinawa: lat 26..27, lon 127.5..128.5)
    function isTrulyInJapan(p: { lat: number; lon: number }): boolean {
        if (p.lat >= 30 && p.lat <= 46 && p.lon >= 129.5 && p.lon <= 146.0) return true;
        if (p.lat >= 26 && p.lat <= 27 && p.lon >= 127.5 && p.lon <= 128.5) return true;
        return false;
    }

    const realJapanSegments = parseRes.segments.filter(s => {
        if (s.trace.length === 0) return false;
        return isTrulyInJapan(s.trace[0]) || isTrulyInJapan(s.trace[s.trace.length - 1]);
    });

    console.log(`True Japan segments: ${realJapanSegments.length} (out of ${parseRes.segments.length})`);
    const realJapanHints: Record<string, number> = {};
    for (const s of realJapanSegments) {
        realJapanHints[s.hint] = (realJapanHints[s.hint] ?? 0) + 1;
    }
    console.log('Japan segments hints:', realJapanHints);

    // Group Japan segments by travel dates (trip clusters)
    const dateClusters = new Map<string, typeof realJapanSegments>();
    for (const s of realJapanSegments) {
        const d = new Date(s.startTime).toISOString().slice(0, 10);
        if (!dateClusters.has(d)) dateClusters.set(d, []);
        dateClusters.get(d)!.push(s);
    }
    console.log(`Found ${dateClusters.size} distinct days in Japan:`, Array.from(dateClusters.keys()).sort());

    console.log(`\n--- Running Matching on ALL ${realJapanSegments.length} Japan Segments ---`);
    const startMatch = Date.now();
    const matched = await matchAll(realJapanSegments, index, router, stationPos, DEFAULT_MATCH_OPTIONS, (done, total) => {
        if (done % 500 === 0 || done === total) {
            console.log(`Progress: ${done} / ${total} (${((Date.now() - startMatch) / 1000).toFixed(1)}s)`);
        }
    });
    console.log(`Matching finished in ${((Date.now() - startMatch) / 1000).toFixed(2)}s`);

    const rejections: Record<string, number> = {};
    let withCandidate = 0;
    for (const m of matched) {
        if (m.candidates.length > 0) {
            withCandidate++;
        } else if (m.rejectedBecause) {
            rejections[m.rejectedBecause] = (rejections[m.rejectedBecause] ?? 0) + 1;
        }
    }

    console.log('\n--- Japan Matching Results ---');
    console.log(`Segments with >= 1 match: ${withCandidate} / ${realJapanSegments.length} (${(withCandidate / realJapanSegments.length * 100).toFixed(1)}%)`);
    console.log('Rejection breakdown:', rejections);

    const merged = mergeAdjacent(matched);
    const mergedMatched = merged.filter(m => m.candidates.length > 0);
    console.log(`After mergeAdjacent: ${mergedMatched.length} trips (from ${merged.length} total segments)`);

    console.log('\n--- List of Recognized Trips ---');
    for (const m of mergedMatched) {
        const c = m.candidates[0]!;
        const fromName = (fixtures.stations as any)[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const toName = (fixtures.stations as any)[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(0, 16).replace('T', ' ');
        const distKm = (c.route.distance / 1000).toFixed(1);
        const linesStr = c.route.lineIds.map(lid => (fixtures.lines as any)[String(lid)]?.name ?? lid).join(', ');
        console.log(`  [${dt}] ${fromName} -> ${toName} (${distKm}km, speed=${c.speedKmh}km/h, conf=${c.confidence}, hint=${m.segment.hint}) [${linesStr}]`);
    }
    // Let's inspect some of the rejected segments to see WHY they were rejected
    console.log('\n--- Sample Rejections Analysis ---');
    const noStationSample = matched.filter(m => m.rejectedBecause === 'noStationAtEnd').slice(0, 10);
    console.log('Sample noStationAtEnd segments:');
    for (const sm of noStationSample) {
        const t0 = sm.segment.trace[0];
        const tEnd = sm.segment.trace[sm.segment.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 2000, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 2000, 3);
        console.log(`  [${sm.segment.id}] span=${(sm.segment.trace.length)}pts, start=(${t0.lat.toFixed(4)}, ${t0.lon.toFixed(4)}) nearest=${startNear.map(s => `${s.name}(${Math.round(s.meters)}m)`).join(', ')} | end=(${tEnd.lat.toFixed(4)}, ${tEnd.lon.toFixed(4)}) nearest=${endNear.map(s => `${s.name}(${Math.round(s.meters)}m)`).join(', ')}`);
    }

    const lowConfSample = matched.filter(m => m.rejectedBecause === 'lowConfidence').slice(0, 10);
    console.log('\nSample lowConfidence segments:');
    for (const sm of lowConfSample) {
        console.log(`  [${sm.segment.id}] hint=${sm.segment.hint}, top candidate conf=${sm.candidates[0]?.confidence ?? 'none'}, notes=${sm.candidates[0]?.notes?.join(',')}`);
    }

    const tooSlowSample = matched.filter(m => m.rejectedBecause === 'tooSlow').slice(0, 10);
    console.log('\nSample tooSlow segments:');
    for (const sm of tooSlowSample) {
        console.log(`  [${sm.segment.id}] hint=${sm.segment.hint}, trace length=${sm.segment.trace.length}, time span=${((sm.segment.endTime - sm.segment.startTime)/60000).toFixed(1)}min`);
    }
}

analyze().catch(err => console.error('Analyze failed:', err));

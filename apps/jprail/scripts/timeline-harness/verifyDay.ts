import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS, isPointInJapan } from '../../src/lib/timeline/match';
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

async function verifySpecificDay() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);

    const targetSegments = segments.filter(s => {
        if (s.trace.length === 0) return false;
        if (s.hint !== 'rail' && s.hint !== 'unknown') return false;
        const f = s.trace[0];
        const l = s.trace[s.trace.length - 1];
        return isPointInJapan(f.lat, f.lon) || isPointInJapan(l.lat, l.lon);
    });

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const matched = await matchAll(targetSegments, index, router, stationPos, DEFAULT_MATCH_OPTIONS, undefined, 12);
    const merged = mergeAdjacent(matched);

    const march28_2019 = merged.filter(m => {
        const d = new Date(m.segment.startTime).toISOString().slice(0, 10);
        return d === '2019-03-28' && m.candidates.length > 0;
    });

    console.log(`\nRecognized Trips on 2019-03-28 (Total ${march28_2019.length}):`);
    for (const m of march28_2019) {
        const c = m.candidates[0]!;
        const fromName = (fixtures.stations as any)[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const toName = (fixtures.stations as any)[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(11, 16);
        const distKm = (c.route.distance / 1000).toFixed(1);
        console.log(`  [${dt}] ${fromName} -> ${toName} (${distKm}km, conf=${c.confidence}, hint=${m.segment.hint}) [${c.route.stationIds.length} stations]`);
    }
}

verifySpecificDay().catch(err => console.error(err));

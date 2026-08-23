import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS, isPointInJapan } from '../../src/lib/timeline/match';

async function testMay15RinkuToWakayama() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    // Test routing Rinku-town (007996) -> Wakayama (008365) via Hineno (008072)
    const rDirect = await router('007996', '008365');
    console.log(`Router Rinku-town(007996) -> Wakayama(008365):`, rDirect ? `${(rDirect.distance / 1000).toFixed(1)}km, stops=${rDirect.stationIds.length}` : 'NO ROUTE');

    if (rDirect) {
        console.log(`Stops: ${rDirect.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
    }

    // Now test 2019-03-30 Seto to Okayama vs Okayama to Tottori
    console.log('\n=== Testing 2019-03-30 ===');
    const segs20190330 = segments.filter(s => {
        const d = new Date(s.startTime).toISOString().slice(0, 10);
        return d === '2019-03-30';
    });
    console.log(`Found ${segs20190330.length} segments on 2019-03-30`);

    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const matched = await matchAll(segs20190330, index, router, stationPos, DEFAULT_MATCH_OPTIONS);
    const merged = mergeAdjacent(matched);

    for (const m of merged) {
        if (m.candidates.length === 0) continue;
        const c = m.candidates[0]!;
        const fName = fixtures.stations[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const tName = fixtures.stations[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(11, 16);
        console.log(`  [${dt}] ${fName} -> ${tName} (${(c.route.distance / 1000).toFixed(1)}km, conf=${c.confidence.toFixed(2)}, hint=${m.segment.hint}) [${c.route.stationIds.length} stations]`);
    }
}

testMay15RinkuToWakayama().catch(err => console.error(err));

import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';

async function testOkayamaDirect() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:9314')!;
    const last = seg.trace[seg.trace.length - 1];

    const toHits = index.near(last.lon, last.lat, 2500, 25);
    console.log('Hits within 2.5km of end point:');
    for (const h of toHits) {
        console.log(`  ${h.name} (${h.id}): ${Math.round(h.meters)}m`);
    }

    const r = await router('006397', '007310'); // Kamigori -> Okayama
    console.log(`\nRouter Kamigori(006397) -> Okayama(007310):`);
    if (r) {
        console.log(`  Distance: ${(r.distance / 1000).toFixed(1)}km, stops: ${r.stationIds.length}`);
        console.log(`  Stops: ${r.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
    }
}

testOkayamaDirect().catch(err => console.error(err));

import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { scoreCorridor } from '../../src/lib/timeline/corridor';
import { metersBetween } from '../../src/lib/timeline/geo';

async function debugSeg30362Detail() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    console.log(`=== Debugging Segment 30362 ===`);
    console.log(`Hint: ${seg.hint}`);
    console.log(`Points: ${seg.trace.length}`);

    const fromHits = index.near(seg.trace[0].lon, seg.trace[0].lat, 2000, 5);
    const toHits = index.near(seg.trace[seg.trace.length - 1].lon, seg.trace[seg.trace.length - 1].lat, 2000, 5);

    const route = await router(fromHits[0].id, toHits[0].id);
    if (!route) {
        console.log('No route');
        return;
    }

    console.log(`Route: ${fromHits[0].name} -> ${toHits[0].name} (${(route.distance / 1000).toFixed(1)}km, geometry pts=${route.geometry.length})`);
    console.log(`Stops: ${route.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);

    const corridor = scoreCorridor(seg.trace, route);
    console.log(`\nCorridor score:`, corridor);

    console.log('\nTrace point deviations:');
    for (let i = 0; i < seg.trace.length; i++) {
        const p = seg.trace[i];
        let minDist = Infinity;
        for (const g of route.geometry) {
            const d = metersBetween([p.lon, p.lat], [g[0], g[1]]);
            if (d < minDist) minDist = d;
        }
        console.log(`  pt[${i}] (${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}) -> deviation: ${Math.round(minDist)}m`);
    }
}

debugSeg30362Detail().catch(err => console.error(err));

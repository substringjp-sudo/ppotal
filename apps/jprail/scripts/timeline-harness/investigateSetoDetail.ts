import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateSetoOkayamaDetail() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    console.log('Searching all segments where trace is between Seto and Okayama...');
    const target = segments.filter(s => {
        const startNear = index.near(s.trace[0]?.lon || 0, s.trace[0]?.lat || 0, 3000, 3);
        const endNear = index.near(s.trace[s.trace.length - 1]?.lon || 0, s.trace[s.trace.length - 1]?.lat || 0, 3000, 3);

        const hasSeto = startNear.some(x => x.name.includes('瀬戸')) || endNear.some(x => x.name.includes('瀬戸'));
        const hasOkayama = startNear.some(x => x.name.includes('岡山')) || endNear.some(x => x.name.includes('岡山'));
        return hasSeto || (hasOkayama && s.trace.length > 5);
    });

    console.log(`Found ${target.length} segments matching Seto / Okayama criteria\n`);

    for (const s of target) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 3000, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 3000, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');

        console.log(`[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km`);
        console.log(`  Start: ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        console.log(`  End:   ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
    }
}

investigateSetoOkayamaDetail().catch(err => console.error(err));

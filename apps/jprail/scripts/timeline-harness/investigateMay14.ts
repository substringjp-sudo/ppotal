import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateMay14_15() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const may1415 = segments.filter(s => {
        const dt = new Date(s.startTime).toISOString().slice(0, 10);
        return dt === '2024-05-14' || dt === '2024-05-15';
    });

    console.log(`May 14-15 segments count: ${may1415.length}`);
    for (const s of may1415) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 2500, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 2500, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');
        const durMin = (s.endTime - s.startTime) / 60000;
        const kmh = durMin > 0 ? (dist / 1000) / (durMin / 60) : 0;

        console.log(`\n[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km, dur=${durMin.toFixed(0)}m, speed=${kmh.toFixed(1)}km/h`);
        console.log(`  Start: ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        console.log(`  End:   ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
    }
}

investigateMay14_15().catch(err => console.error(err));

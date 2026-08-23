import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateSetoAndRinku() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    console.log('=== Case 1: Search segments near Seto (瀬戸) and Okayama (岡山) ===');
    // Seto station: 瀬戸 (lat: ~34.741, lon: ~134.048)
    // Okayama: 岡山 (lat: ~34.666, lon: ~133.918)
    const setoSegs = segments.filter(s => {
        return s.trace.some(p => {
            return (p.lat >= 34.6 && p.lat <= 34.8 && p.lon >= 133.85 && p.lon <= 134.15);
        });
    });

    console.log(`Found ${setoSegs.length} segments near Seto/Okayama`);
    for (const s of setoSegs) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 2500, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 2500, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');

        // Check if touches Seto or Okayama
        const touchesSeto = s.trace.some(p => metersBetween([p.lon, p.lat], [134.0489, 34.7417]) < 5000);
        if (touchesSeto) {
            console.log(`\n[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km`);
            console.log(`  Start: ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
            console.log(`  End:   ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        }
    }

    console.log('\n=== Case 2: Search segments near Rinku-town / Hineno / Wakayama ===');
    // Rinku-town: りんくうタウン (lat: ~34.410, lon: ~135.299)
    // Hineno: 日根野 (lat: ~34.381, lon: ~135.334)
    // Wakayama: 和歌山 (lat: ~34.229, lon: ~135.191)
    const rinkuSegs = segments.filter(s => {
        return s.trace.some(p => {
            return (p.lat >= 34.2 && p.lat <= 34.45 && p.lon >= 135.15 && p.lon <= 135.38);
        });
    });

    console.log(`Found ${rinkuSegs.length} segments near Rinku/Hineno/Wakayama`);
    for (const s of rinkuSegs) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 2500, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 2500, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');

        console.log(`\n[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km`);
        console.log(`  Start: ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        console.log(`  End:   ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
    }
}

investigateSetoAndRinku().catch(err => console.error('Failed:', err));

import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { makeLocalRouter, loadFixtures } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateAllJapanTrips() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
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

    // Group by calendar days
    const dayGroups = new Map<string, typeof realJapanSegments>();
    for (const s of realJapanSegments) {
        const d = new Date(s.startTime).toISOString().slice(0, 10);
        if (!dayGroups.has(d)) dayGroups.set(d, []);
        dayGroups.get(d)!.push(s);
    }

    console.log(`Distinct Japan Days: ${dayGroups.size}`);

    // Let's inspect a few days in detail (e.g. 2016-10-17, 2024-03-08, 2026-05-25)
    const targetDays = ['2016-10-17', '2024-03-08', '2026-05-25'];

    for (const day of targetDays) {
        const segs = dayGroups.get(day) ?? [];
        console.log(`\n======================================================`);
        console.log(`DAY: ${day} (${segs.length} segments)`);
        console.log(`======================================================`);

        for (const s of segs) {
            const t0 = s.trace[0];
            const tEnd = s.trace[s.trace.length - 1];
            const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
            const durationMin = (s.endTime - s.startTime) / 60000;
            const kmh = durationMin > 0 ? (dist / 1000) / (durationMin / 60) : 0;
            const startNear = index.near(t0.lon, t0.lat, 2000, 2);
            const endNear = index.near(tEnd.lon, tEnd.lat, 2000, 2);
            const timeStr = `${new Date(s.startTime).toISOString().slice(11, 16)} ~ ${new Date(s.endTime).toISOString().slice(11, 16)}`;

            console.log(`[${timeStr}] (${durationMin.toFixed(0)}m, ${dist.toFixed(0)}m, ${kmh.toFixed(1)}km/h) id=${s.id} hint=${s.hint} pts=${s.trace.length}`);
            console.log(`   Start: (${t0.lat.toFixed(4)}, ${t0.lon.toFixed(4)}) near: ${startNear.map(x => `${x.name}(${Math.round(x.meters)}m)`).join(', ')}`);
            console.log(`   End:   (${tEnd.lat.toFixed(4)}, ${tEnd.lon.toFixed(4)}) near: ${endNear.map(x => `${x.name}(${Math.round(x.meters)}m)`).join(', ')}`);
        }
    }
}

investigateAllJapanTrips().catch(err => console.error('Failed:', err));

import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { scoreCorridor, scoreStops, endpointAnchors } from '../../src/lib/timeline/corridor';
import { metersBetween, traceLength } from '../../src/lib/timeline/geo';

async function traceMatchSegment() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const anchors = endpointAnchors(seg.trace);
    console.log('Anchors:', anchors);

    const nearAny = (points: [number, number][]) => {
        const best = new Map<string, any>();
        for (const [lon, lat] of points) {
            for (const hit of index.near(lon, lat, 1800, 16)) {
                const prev = best.get(hit.id);
                if (!prev || hit.meters < prev.meters) best.set(hit.id, hit);
            }
        }
        return Array.from(best.values())
            .sort((a, b) => a.meters - b.meters)
            .slice(0, 16);
    };

    const fromStations = nearAny(anchors.start);
    const toStations = nearAny(anchors.end);
    console.log('fromStations:', fromStations.map(s => s.name));
    console.log('toStations:', toStations.map(s => s.name));

    for (const a of fromStations) {
        for (const b of toStations) {
            console.log(`Testing pair ${a.name}(${a.id}) -> ${b.name}(${b.id})...`);
            let route: any = null;
            try {
                route = await router(a.id, b.id);
            } catch (e) {
                console.log('Router threw:', e);
                continue;
            }
            if (!route) {
                console.log('No route returned by router');
                continue;
            }
            console.log('Route distance:', route.distance, 'geometry len:', route.geometry.length);
            const corridor = scoreCorridor(seg.trace, route);
            console.log('corridor:', corridor);
            const stops = scoreStops(seg.trace, route, stationPos);
            console.log('stops:', stops);
        }
    }
}

traceMatchSegment().catch(err => console.error(err));

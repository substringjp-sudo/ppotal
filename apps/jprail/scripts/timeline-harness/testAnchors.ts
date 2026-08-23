import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { endpointAnchors } from '../../src/lib/timeline/corridor';

async function testAnchors() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    const anchors = endpointAnchors(seg.trace);
    console.log('Anchors start:', anchors.start);
    console.log('Anchors end:', anchors.end);

    const nearAny = (points: [number, number][]) => {
        const best = new Map<string, any>();
        for (const [lon, lat] of points) {
            for (const hit of index.near(lon, lat, 1800, 16)) {
                const prev = best.get(hit.id);
                if (!prev || hit.meters < prev.meters) best.set(hit.id, hit);
            }
        }
        return Array.from(best.values()).sort((a, b) => a.meters - b.meters).slice(0, 16);
    };

    const fromStations = nearAny(anchors.start);
    const toStations = nearAny(anchors.end);

    console.log('From stations:', fromStations.map(s => `${s.name}(${s.id}, ${Math.round(s.meters)}m)`));
    console.log('To stations:', toStations.map(s => `${s.name}(${s.id}, ${Math.round(s.meters)}m)`));

    for (const a of fromStations) {
        for (const b of toStations) {
            const r = await router(a.id, b.id);
            if (r) {
                console.log(`Route: ${a.name} -> ${b.name}: ${r.distance}m`);
            } else {
                console.log(`NO ROUTE: ${a.name} -> ${b.name}`);
            }
        }
    }
}

testAnchors().catch(err => console.error(err));

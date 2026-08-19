/**
 * Regression tests for `parseTimeline`'s coordinate handling.
 *
 * These are not synthetic-geometry cases like `harness.ts`/`stress.ts` — they
 * exercise the parser itself against JSON shapes reported from real exports,
 * and exist because the parser silently produced zero segments for a real
 * Android export before this file did. `parseCoordinate` used to match one
 * exact shape (`"geo:LAT,LON"`) via `Number()` on a plain comma split; a real
 * export carried a trailing `°` on each number, `Number("35.68°")` is `NaN`,
 * and every point in the file failed the same way — silent, and indistinguishable
 * from "this file really has no rail rides in it" until someone went looking.
 *
 * Run with: npx tsx scripts/timeline-harness/parseRegressions.ts
 */
import { parseTimeline } from '../../src/lib/timeline/parse';

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
    if (!condition) failures++;
}

// ---------------------------------------------------------------------------
// Degree-suffixed coordinates, as seen from a real Android export. Every
// point in this fixture would previously fail Number() and vanish.
// ---------------------------------------------------------------------------
{
    const fixture = {
        semanticSegments: [{
            startTime: '2026-06-15T08:15:00+09:00',
            endTime: '2026-06-15T08:45:00+09:00',
            activity: {
                start: { latLng: '35.681236°,139.767125°' },
                end: { latLng: '35.658034°,139.701636°' },
                distanceMeters: 5200,
                topCandidate: { type: 'IN_TRAIN', probability: 0.7 }
            },
            timelinePath: [
                { point: 'geo:35.681236°,139.767125°', time: '2026-06-15T08:15:00+09:00' },
                { point: '35.670000°,139.740000°', time: '2026-06-15T08:25:00+09:00' },
                { point: '35.658034°,139.701636°', time: '2026-06-15T08:45:00+09:00' }
            ]
        }]
    };
    const { segments } = parseTimeline(fixture);
    check('degree-suffixed coordinates are not dropped', segments.length === 1,
        `got ${segments.length} segment(s)`);
    if (segments.length === 1) {
        check('degree-suffixed trace keeps all 5 points (3 path + 2 anchors)',
            segments[0].trace.length === 5, `got ${segments[0].trace.length}`);
        const first = segments[0].trace[0];
        check('degree symbol did not corrupt the value itself',
            Math.abs(first.lat - 35.681236) < 1e-6 && Math.abs(first.lon - 139.767125) < 1e-6,
            `got lat=${first.lat} lon=${first.lon}`);
    }
}

// ---------------------------------------------------------------------------
// activity.start/end as a nested {latitude, longitude} object rather than a
// "geo:" string. These anchors matter more than the sampled path (a ride
// must begin and end at a station), so losing them silently is worse than it
// looks from segment count alone.
// ---------------------------------------------------------------------------
{
    const fixture = {
        semanticSegments: [{
            startTime: '2026-06-15T08:15:00+09:00',
            endTime: '2026-06-15T08:45:00+09:00',
            activity: {
                start: { latLng: { latitude: 35.681236, longitude: 139.767125 } },
                end: { latLng: { latitude: 35.658034, longitude: 139.701636 } },
                distanceMeters: 5200,
                topCandidate: { type: 'IN_TRAIN', probability: 0.7 }
            },
            timelinePath: [
                { point: 'geo:35.670000,139.740000', time: '2026-06-15T08:25:00+09:00' }
            ]
        }]
    };
    const { segments } = parseTimeline(fixture);
    check('nested {latitude,longitude} object anchors are not dropped',
        segments.length === 1 && segments[0].trace.length === 3,
        segments.length ? `trace length ${segments[0].trace.length}, expected 3 (1 path + 2 anchors)` : 'no segment found');
}

// ---------------------------------------------------------------------------
// A garbage pair should be rejected, not accepted as a bogus mid-ocean point.
// ---------------------------------------------------------------------------
{
    const fixture = {
        semanticSegments: [{
            startTime: '2026-06-15T08:15:00+09:00',
            endTime: '2026-06-15T08:45:00+09:00',
            activity: {
                start: { latLng: 'geo:35.681236,139.767125' },
                end: { latLng: 'geo:200.000000,999.000000' }, // out of range on purpose
                distanceMeters: 5200
            },
            timelinePath: [
                { point: 'geo:35.681236,139.767125', time: '2026-06-15T08:15:00+09:00' },
                { point: 'geo:35.670000,139.740000', time: '2026-06-15T08:25:00+09:00' }
            ]
        }]
    };
    const { segments } = parseTimeline(fixture);
    const endPoints = segments[0]?.trace.map(p => `${p.lat},${p.lon}`) ?? [];
    check('an out-of-range pair is dropped rather than kept',
        !endPoints.some(p => p.startsWith('200')), `trace: ${JSON.stringify(endPoints)}`);
}

// ---------------------------------------------------------------------------
// iOS-style export: the file's own top level is the segments array, not
// wrapped in {semanticSegments: [...]}. Reported as a case that had been
// confused with Takeout's one-root-per-file convention elsewhere; this
// project's parseTimeline recurses per input root, so a genuine multi-file
// case (two iOS-shaped files at once) is checked here to keep it that way.
// ---------------------------------------------------------------------------
{
    const iosFile = (start: string, end: string) => [{
        startTime: start, endTime: end,
        activity: {
            start: { latLng: 'geo:35.681236,139.767125' },
            end: { latLng: 'geo:35.658034,139.701636' },
            distanceMeters: 5200,
            topCandidate: { type: 'IN_TRAIN', probability: 0.7 }
        },
        timelinePath: [
            { point: 'geo:35.681236,139.767125', time: start },
            { point: 'geo:35.658034,139.701636', time: end }
        ]
    }];
    const { segments } = parseTimeline([
        iosFile('2026-06-15T08:15:00+09:00', '2026-06-15T08:45:00+09:00'),
        iosFile('2026-06-16T08:15:00+09:00', '2026-06-16T08:45:00+09:00')
    ]);
    check('two iOS-style top-level-array files both parse (not merged/lost)',
        segments.length === 2, `got ${segments.length}`);
}

console.log(failures === 0 ? '\nALL PARSER REGRESSION CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
if (failures > 0) process.exit(1);

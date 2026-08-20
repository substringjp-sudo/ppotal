# Timeline matching harness

Measures the Google Timeline importer against the real rail network, offline.

```sh
npx tsx scripts/timeline-harness/harness.ts          # precision/recall + threshold sweep
npx tsx scripts/timeline-harness/stress.ts           # the cases expected to be hard
npx tsx scripts/timeline-harness/parseRegressions.ts # real-export JSON shapes the parser must not drop
SEED=123 QUIET=1 npx tsx scripts/timeline-harness/harness.ts   # one line, for sweeping seeds
DUMP=1 npx tsx scripts/timeline-harness/harness.ts # why each miss missed
```

`harness.ts` and `stress.ts` build `TimelineSegment`s directly from synthetic
traces — they test the *matcher*, not the *parser*, and never touch
`parse.ts`. `parseRegressions.ts` is the parser's own suite: it feeds
`parseTimeline` real-shaped JSON fixtures reported from actual exports. It
exists because `parseCoordinate` (`src/lib/timeline/parse.ts`) once matched
only `"geo:LAT,LON"` via `Number()` on a plain comma split, and a real
Android export used `"35.681236°,139.767125°"` — `Number("35.681236°")` is
`NaN`, every point in the file failed the same way, and the failure surfaced
as "no movement found" for a file that was full of movement. Silent and
total: nothing about the symptom pointed at the cause.

`localRouter.ts` is a Dijkstra over `station_graph.json`, standing in for the
server routing so accuracy can be measured without a network. `synth.ts` builds
traces from real section geometry: rides at three sampling rates, and the decoys
that matter — a car on a road beside the track, and a walk along it.

Everything is seeded, so a change in the numbers is a change in the matcher.

**A warning worth keeping.** Four of the first five "algorithm failures" here
were bugs in this harness, not in the matcher: an endpoint anchor averaged over
points hundreds of metres apart, a sampler that stopped a kilometre short of the
destination, ground truth taken from a random walk the router would never
return, and synthetic station stops emitted wherever the sampler had advanced to
rather than at the station. Each one looked exactly like a real accuracy
problem. Dump the failing cases before tuning anything.

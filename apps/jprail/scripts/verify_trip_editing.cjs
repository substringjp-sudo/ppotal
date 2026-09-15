/**
 * 여정 편집 연산 검증.
 *
 * 여정은 끝점 두 개와 그 사이에 고른 경로로 정해진다. 편집이 그 둘을 망가뜨리지
 * 않는지 — 뒤집어도 탄 선로가 그대로인지, 줄일 때 구간과 폴리라인이 같이 줄는지,
 * 늘릴 후보에 이미 지나간 역이 섞이지 않는지 — 를 본다.
 *
 *   npm run verify:tripedit
 */
const {
    startIdOf,
    endIdOf,
    reverseTrip,
    applyRoute,
    retractTrip,
    neighboursToExtend,
    needsResearch,
    isRoundTrip
} = require('../.verify/lib/tripEditing.js');

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};
const eq = (actual, expected, label) => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    checks += 1;
    if (a !== b) {
        failures += 1;
        console.error(`  ✗ ${label}\n      기대: ${b}\n      실제: ${a}`);
    }
};

console.log('여정 편집 검증');

const trip = () => ({
    id: 't1',
    name: 'A → C',
    date: '2024-05-01',
    start: 'A',
    end: 'C',
    startId: 'a',
    endId: 'c',
    distance: 12,
    path: ['a', 'b', 'c'],
    waypoints: ['a', 'c'],
    sectionIds: [1, 2],
    geometries: [[[139.0, 35.0], [139.1, 35.0]], [[139.1, 35.0], [139.2, 35.0]]]
});

// --- 끝점 읽기 ---------------------------------------------------------------
eq(startIdOf(trip()), 'a', '시작 역');
eq(endIdOf(trip()), 'c', '종료 역');
{
    // startId 가 없으면 지나간 역에서 끌어온다(앱에서 넘어온 기록).
    const bare = { ...trip(), startId: undefined, endId: undefined };
    eq(startIdOf(bare), 'a', 'startId 가 없으면 path 첫 칸');
    eq(endIdOf(bare), 'c', 'endId 가 없으면 path 마지막 칸');
}

// --- 순환 판별 ---------------------------------------------------------------
{
    ok(!isRoundTrip(trip()), 'a 에서 c 로 갔으면 순환이 아니다');

    const loop = { ...trip(), startId: 'a', endId: 'a', path: ['a', 'b', 'c', 'a'], sectionIds: [1, 2, 3] };
    ok(isRoundTrip(loop), '제자리로 돌아오면 순환');

    // 앱에서 넘어온 기록은 끝점이 비어 있다. undefined === undefined 로 전부 순환이
    // 되어 버리던 자리다.
    const bare = { ...trip(), startId: undefined, endId: undefined };
    ok(!isRoundTrip(bare), '끝점을 모르는 기록을 순환이라 하지 않는다');

    // 지나간 역에서 끌어온 끝점도 같은 규칙을 탄다.
    const bareLoop = { ...trip(), startId: undefined, endId: undefined, path: ['a', 'b', 'c', 'a'], sectionIds: [1, 2, 3] };
    ok(isRoundTrip(bareLoop), 'path 로 끌어온 끝점이 같으면 순환');

    // 한 정거장 갔다 온 것은 왕복이지 순환이 아니다.
    const there = { ...trip(), startId: 'a', endId: 'a', path: ['a', 'b', 'a'], sectionIds: [1, 2] };
    ok(!isRoundTrip(there), '구간이 둘뿐이면 순환이 아니다');
}

// --- 뒤집기 ------------------------------------------------------------------
{
    const r = reverseTrip(trip());
    eq(r.startId, 'c', '뒤집으면 시작이 c');
    eq(r.endId, 'a', '뒤집으면 종료가 a');
    eq(r.start, 'C', '이름도 따라 바뀐다');
    eq(r.path, ['c', 'b', 'a'], '지나간 역 순서가 반대');
    eq(r.sectionIds, [2, 1], '구간 순서가 반대');
    eq(r.distance, 12, '거리는 그대로 — 같은 선로다');
    // 폴리라인은 묶음 순서와 점 순서를 모두 뒤집어야 선이 거꾸로 자란다.
    eq(r.geometries[0][0], [139.2, 35.0], '첫 점이 원래 끝점');
    eq(r.geometries[1][1], [139.0, 35.0], '마지막 점이 원래 시작점');
    ok(JSON.stringify(reverseTrip(r)) === JSON.stringify(trip()), '두 번 뒤집으면 제자리');
}

// --- 경로 갈아 끼우기 --------------------------------------------------------
{
    const route = {
        stationIds: ['a', 'x', 'y', 'c'],
        sectionIds: [7, 8, 9],
        geometries: [[[1, 1]], [[2, 2]], [[3, 3]]],
        distance: 18
    };
    const t = applyRoute(trip(), route);
    eq(t.path, ['a', 'x', 'y', 'c'], '지나간 역이 새 경로로');
    eq(t.distance, 18, '거리도 새 경로로');
    eq(t.startId, 'a', '끝점은 건드리지 않는다');
    eq(t.endId, 'c', '끝점은 건드리지 않는다');
    eq(t.date, '2024-05-01', '날짜는 사용자가 적은 것 — 그대로');
    eq(t.name, 'A → C', '이름도 그대로');
}

// --- 줄이기 ------------------------------------------------------------------
{
    const s = retractTrip(trip(), 'start');
    eq(s.path, ['b', 'c'], '앞에서 한 역 줄인다');
    eq(s.startId, 'b', '시작이 b 로');
    eq(s.sectionIds, [2], '구간도 같이 줄어든다');
    eq(s.geometries.length, 1, '폴리라인도 같이 줄어든다');

    const e = retractTrip(trip(), 'end');
    eq(e.path, ['a', 'b'], '뒤에서 한 역 줄인다');
    eq(e.endId, 'b', '종료가 b 로');
    eq(e.sectionIds, [1], '뒤쪽 구간이 빠진다');

    // 역 하나짜리는 여정이 아니다.
    const two = { ...trip(), path: ['a', 'b'], sectionIds: [1], geometries: [[[1, 1]]] };
    ok(retractTrip(two, 'start') === null, '두 역짜리는 더 줄일 수 없다');
    ok(retractTrip(two, 'end') === null, '두 역짜리는 더 줄일 수 없다(뒤)');
}

// --- 늘릴 후보 ---------------------------------------------------------------
{
    const graph = {
        adj: new Map([
            ['c', [
                { to: 'd', isWalk: false },
                { to: 'b', isWalk: false },   // 이미 지나간 역
                { to: 'w', isWalk: true },    // 걸어서 가는 곳
                { to: 'd', isWalk: false }    // 같은 역이 두 번
            ]],
            ['a', [{ to: 'b', isWalk: false }, { to: 'z', isWalk: false }]]
        ])
    };
    eq(neighboursToExtend(graph, trip(), 'end'), ['d'],
        '이미 지나간 역·도보·중복을 뺀다');
    eq(neighboursToExtend(graph, trip(), 'start'), ['z'],
        '앞쪽도 같은 규칙');
    eq(neighboursToExtend({ adj: new Map() }, trip(), 'end'), [],
        '이어진 곳이 없으면 빈 목록');
}

// --- 다시 찾아야 하는지 ------------------------------------------------------
{
    const before = trip();
    ok(!needsResearch(before, { ...before, name: '새 이름' }),
        '이름만 바꾸면 다시 찾지 않는다');
    ok(!needsResearch(before, { ...before, date: '2025-01-01' }),
        '날짜만 바꾸면 다시 찾지 않는다');
    ok(needsResearch(before, { ...before, endId: 'z' }),
        '끝점이 바뀌면 다시 찾는다');
    ok(needsResearch(before, reverseTrip(before)),
        '뒤집으면 끝점이 바뀐 것으로 본다');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

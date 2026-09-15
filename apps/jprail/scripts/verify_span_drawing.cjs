/**
 * 지도에 구간을 그릴 때의 세 규칙 검증.
 *
 *   1. 가장자리에서 지도가 따라오는 감촉(`edgePan`)
 *   2. 기억한 역과 앱이 채운 역을 가르는 규칙(`spanCertainty`)
 *   3. 마우스와 손가락을 갈라 보는 규칙(`pointerInput`)
 *
 * 둘 다 앱(jpApp)의 `EdgePan.kt` · `SpanDrawing.kt` 와 같은 규칙이다. 한쪽만 고치면
 * 같은 손짓이 기기마다 다른 답을 낸다.
 *
 *   npm run verify:span
 */
const path = require('path');
const load = name => {
    for (const p of [`../.verify/${name}.js`, `../.verify/lib/${name}.js`]) {
        try { return require(p); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
    }
    throw new Error(`${name} 를 .verify 에서 찾지 못했습니다`);
};
const edgePan = load('edgePan');
const certainty = load('spanCertainty');
const pointer = load('pointerInput');
const drag = load('dragRouting');

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};
const near = (actual, expected, tolerance, label) =>
    ok(Math.abs(actual - expected) <= tolerance, `${label} — ${actual} (기대 ${expected})`);
const eq = (actual, expected, label) =>
    ok(actual === expected, `${label} — ${actual} (기대 ${expected})`);

console.log('구간 그리기 검증');

// ── 가장자리 이동 ────────────────────────────────────────────────────────
const BAND = edgePan.BAND_PX;
const MAX = edgePan.MAX_SPEED_PX_PER_SEC;
const speed = (position, size = 1000) => edgePan.axisSpeed(position, size, BAND, MAX);

// 가운데서는 지도가 움직이지 않는다. 띠 경계까지도 멈춰 있다.
eq(speed(500), 0, '가운데는 정지');
eq(speed(BAND), 0, '띠 경계 안쪽은 정지');
eq(speed(1000 - BAND), 0, '반대쪽 띠 경계도 정지');

// 띠에 들어서자마자 튀어 나가면 안 된다 — 깊이의 제곱으로 오른다.
const justInside = speed(BAND - 1);
ok(justInside < 0 && -justInside < MAX * 0.01, `경계 바로 안쪽은 거의 정지 — ${justInside}`);
near(speed(BAND / 2), -MAX * 0.25, 1, '절반 깊이에서 최고 속도의 1/4');
near(speed(0), -MAX, 1, '가장자리에서 최고 속도');

ok(speed(10) < 0, '왼쪽은 음수로 민다');
ok(speed(990) > 0, '오른쪽은 양수로 민다');
near(speed(-400), -MAX, 1, '화면 밖에서도 최고 속도를 넘지 않는다');
near(speed(1400), MAX, 1, '반대쪽 화면 밖도 마찬가지');

// 좁은 화면에서 띠가 양쪽에서 겹치면 어디에 있든 지도가 움직이게 된다.
eq(edgePan.axisSpeed(50, 100, BAND, MAX), 0, '띠가 화면 절반보다 넓으면 절반으로 줄인다');

const corner = edgePan.step(5, 5, 1000, 1000, 0.016);
ok(corner[0] < 0 && corner[1] < 0, '모서리에서는 대각선으로 흐른다');

const short = edgePan.step(0, 500, 1000, 1000, 0.016)[0];
const long = edgePan.step(0, 500, 1000, 1000, 0.032)[0];
near(long / short, 2, 0.001, '민 거리는 흐른 시간에 비례한다');

ok(!edgePan.isActive(500, 500, 1000, 1000), '띠 밖에서는 쉰다');
ok(edgePan.isActive(10, 500, 1000, 1000), '띠 안에서는 깨어 있다');

// ── 기억한 역과 앱이 채운 역 ─────────────────────────────────────────────
// 선로가 위로 휘는데 손가락은 곧게 갔다면, 휜 자리의 역은 앱이 채운 것이다.
const bent = {
    A: { x: 0, y: 0 },
    B: { x: 100, y: 0 },
    C: { x: 150, y: 120 },
    D: { x: 200, y: 0 },
    E: { x: 300, y: 0 }
};
const project = id => bent[id] ?? null;
const pathIds = ['A', 'B', 'C', 'D', 'E'];

const fast = certainty.touchedStations({
    path: pathIds,
    previous: new Set(['A']),
    known: new Set(['A']),
    project,
    trail: [{ x: 0, y: 0 }, { x: 300, y: 0 }]
});
eq([...fast].sort().join(','), 'A,B,D,E', '곧게 그으면 휘어 있는 역은 흐림으로 남는다');
eq(certainty.unsureCount(pathIds, fast), 1, '흐린 역이 하나');

// 같은 길을 잘게 나눠 그어도 답이 같아야 한다. 찍힌 점으로 재면 여기서 갈라진다 —
// 구간이 자라기 전에 손가락이 이미 지나가 버린 역을 영영 세지 못하기 때문이다.
let slowTouched = new Set(['A']);
let slowKnown = new Set(['A']);
const slowTrail = [{ x: 0, y: 0 }];
for (let step = 1; step <= 10; step += 1) {
    slowTrail.push({ x: 30 * step, y: 0 });
    // 손가락이 x=270 을 넘어서야 C·D·E 가 경로에 붙는다고 보고 흉내 낸다.
    const grown = 30 * step >= 270 ? pathIds : ['A', 'B'];
    slowTouched = certainty.touchedStations({
        path: grown,
        previous: slowTouched,
        known: slowKnown,
        project,
        trail: slowTrail
    });
    slowKnown = new Set(grown);
}
eq([...slowTouched].sort().join(','), 'A,B,D,E', '빨리 긋든 천천히 긋든 같은 답이 나온다');

// 줄였다가 늘리면 그 사이 역이 스치지도 않은 채 확실한 역으로 남아서는 안 된다.
const shrunk = certainty.touchedStations({
    path: ['A', 'B'],
    previous: new Set(['A', 'B', 'D', 'E']),
    known: new Set(pathIds),
    project,
    trail: [{ x: 110, y: 0 }, { x: 100, y: 0 }]
});
eq([...shrunk].sort().join(','), 'A,B', '경로에서 빠진 역은 기억한 역에서도 빠진다');

// 찾아 준 경로는 가운데를 사용자가 아니라 탐색이 채웠다.
const found = certainty.touchedForFoundRoute(['A', 'B', 'C', 'D']);
eq([...found].sort().join(','), 'A,D', '찾아 준 경로는 양 끝만 기억한 역이다');
eq(certainty.unsureCount(['A', 'B', 'C', 'D'], found), 2, '가운데 둘이 흐림');

const spans = certainty.unsureSpans(['A', 'B', 'C', 'D'], found);
eq(JSON.stringify(spans), '[[0,3]]', '흐린 자리는 양옆의 확실한 역까지 물린다');
eq(JSON.stringify(certainty.unsureSpans(pathIds, new Set(pathIds))), '[]', '전부 기억했으면 흐린 자리가 없다');

// 점이 아니라 선분까지의 거리로 잰다.
near(certainty.distanceToSegment({ x: 150, y: 10 }, { x: 0, y: 0 }, { x: 300, y: 0 }), 10, 0.01,
    '선분 한가운데 옆은 가깝다');
near(certainty.distanceToSegment({ x: 150, y: 10 }, { x: 0, y: 0 }, { x: 0, y: 0 }), 150, 1,
    '선분이 한 점이면 그 점까지의 거리');
near(certainty.distanceToSegment({ x: -50, y: 0 }, { x: 0, y: 0 }, { x: 300, y: 0 }), 50, 0.01,
    '선분 밖은 가까운 끝에서 잰다');

// ── 마우스와 손가락 ────────────────────────────────────────────────────────
// 창 너비가 아니라 이번 짚음이 무엇이냐로 가른다.
eq(pointer.entryFor('mouse', false), 'immediate', '마우스는 누르는 순간 그리기 시작');
eq(pointer.entryFor('touch', false), 'hold', '손가락은 눌러 두어야 열린다');
eq(pointer.entryFor('pen', false), 'hold', '펜도 지도를 미는 도구라 손가락 쪽이다');
eq(pointer.entryFor('mouse', true), 'immediate',
    '터치 기기에 꽂은 마우스도 마우스다 — 창 너비·기기가 아니라 짚은 방식으로 가른다');
eq(pointer.entryFor('unknown', true), 'hold', '모를 때는 손가락뿐인 기기면 눌러 두기');
eq(pointer.entryFor('unknown', false), 'immediate', '모를 때 마우스가 있는 기기면 바로');

eq(pointer.normalisePointerType('touch'), 'touch', 'pointerType 은 그대로 쓴다');
eq(pointer.normalisePointerType(''), 'unknown', '빈 값은 모르는 것');
eq(pointer.normalisePointerType(undefined), 'unknown', '없는 값도 모르는 것');

// 손가락을 뗀 직후 브라우저가 흉내로 쏘는 마우스 이벤트를, 짚기 한 번이 그리기 두 번이
// 되지 않도록 흘려보낸다.
ok(pointer.isCompatibilityMouse(1000, 1100), '뗀 직후의 마우스는 흉내');
ok(!pointer.isCompatibilityMouse(1000, 1000 + pointer.COMPAT_MOUSE_WINDOW_MS),
    '창이 지나면 진짜 마우스');
ok(!pointer.isCompatibilityMouse(null, 1000), '손가락을 쓴 적이 없으면 언제나 진짜');
ok(!pointer.isCompatibilityMouse(2000, 1000), '시계가 거꾸로 가면 흉내로 보지 않는다');

ok(!pointer.acceptsMouseDown('touch', false, null, 1000), '손가락의 mousedown 은 받지 않는다');
ok(!pointer.acceptsMouseDown('mouse', false, 1000, 1100), '뗀 직후의 마우스도 받지 않는다');
ok(pointer.acceptsMouseDown('mouse', false, 1000, 3000), '한참 뒤의 마우스는 받는다');
ok(pointer.acceptsMouseDown('mouse', true, null, 1000),
    '넓은 화면이든 좁은 화면이든 마우스는 받는다');
ok(!pointer.acceptsMouseDown('unknown', true, null, 1000),
    '포인터 종류를 모르는 터치 전용 기기에서는 받지 않는다');

// ── 반대쪽 끝에서 읽기 ────────────────────────────────────────────────────
// 그리기는 머리에서만 자란다. 그래서 시작역을 옮기려면 먼저 돌려세워야 한다.
const trail = {
    waypoints: ['A', 'C', 'E'],
    segments: [
        { path: ['A', 'B', 'C'], sectionIds: [1, 2], geometries: [[[0, 0], [1, 1]], [[1, 1], [2, 2]]], distance: 3 },
        { path: ['C', 'D', 'E'], sectionIds: [3], geometries: [[[2, 2], [4, 4]]], distance: 5 }
    ],
    drawn: [[[0, 0], [1, 1]], [[1, 1], [2, 2]], [[2, 2], [4, 4]]],
    usedSections: new Set([1, 2, 3])
};
const back = drag.reverseTrail(trail);
eq(back.waypoints.join(','), 'E,C,A', '경유역이 뒤집힌다');
eq(drag.stationPath(back).join(','), 'E,D,C,B,A', '지나는 역도 뒤집힌다');
eq(drag.stationPath(trail).join(','), 'A,B,C,D,E', '원래 것은 그대로다');
eq(back.segments.map(s => s.distance).join(','), '5,3', '거리는 그대로 따라온다');
eq(JSON.stringify(back.drawn[0]), '[[4,4],[2,2]]', '그린 선도 지나는 차례대로 뒤집힌다');
eq(back.usedSections.size, 3, '이미 쓴 구간은 그대로다');
eq(JSON.stringify(drag.stationPath(drag.reverseTrail(back))), JSON.stringify(drag.stationPath(trail)),
    '두 번 뒤집으면 제자리');
eq(drag.stationPath(drag.createTrail('A')).join(','), 'A', '아직 자라지 않은 그리기는 시작역 하나');

// 앱과 같은 값이어야 한다. 갈라지면 같은 손짓이 기기마다 다른 답을 낸다.
eq(edgePan.BAND_PX, 76, '가장자리 띠는 앱과 같은 76');
eq(edgePan.MAX_SPEED_PX_PER_SEC, 1100, '최고 속도는 앱과 같은 1100');
eq(certainty.TOUCH_RADIUS_PX, 24, '스침 반경은 앱과 같은 24');

if (failures > 0) {
    console.error(`검증 실패 — ${failures}건 / ${checks}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

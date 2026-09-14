/**
 * 되짚기 타임라인 계산 검증.
 *
 * 이 저장소에는 테스트 러너가 없다. 대신 안드로이드 앱(jpApp)의
 * TripAnimationTest 와 **같은 경우들**을 여기서 돌린다. 두 쪽이 갈라지면 같은
 * 기록에서 다른 영상이 나오므로, 규칙을 옮겨 적는 것으로 끝내지 않는다.
 *
 *   npm run verify:animation
 */
const { TripAnimation, AnimationStroke, MIN_STROKE_MS, MAX_STROKE_MS } =
    require('../.verify/tripAnimation.js');

let failures = 0;
let checks = 0;

function ok(condition, label) {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
}

function eq(actual, expected, label) {
    checks += 1;
    if (actual !== expected) {
        failures += 1;
        console.error(`  ✗ ${label}\n      기대: ${expected}\n      실제: ${actual}`);
    }
}

function near(actual, expected, tolerance, label) {
    checks += 1;
    if (!(Math.abs(actual - expected) <= tolerance)) {
        failures += 1;
        console.error(`  ✗ ${label}\n      기대: ${expected} (±${tolerance})\n      실제: ${actual}`);
    }
}

function line(...lonLat) {
    const out = [];
    for (let i = 0; i < lonLat.length; i += 2) out.push([lonLat[i], lonLat[i + 1]]);
    return out;
}

function trip(id, date, order = 0, geometries = [line(139.0, 35.0, 139.1, 35.0)]) {
    return { id, name: `여정 ${id}`, date, color: '#2563EB', order, geometries };
}

function strokeOf(geometries) {
    return new AnimationStroke('t', '2024-01-01', '여정', '#2563EB', geometries);
}

function lengthOf(geometries) {
    const { distanceKm } = require('../.verify/tripAnimation.js');
    let sum = 0;
    for (const one of geometries) {
        for (let i = 1; i < one.length; i += 1) {
            sum += distanceKm(one[i - 1][1], one[i - 1][0], one[i][1], one[i][0]);
        }
    }
    return sum;
}

console.log('되짚기 타임라인 검증');

// --- 획 만들기 ---------------------------------------------------------------
{
    const animation = TripAnimation.build([
        trip('c', '2024-05-03'), trip('a', '2024-01-10'), trip('b', '2024-03-21')
    ]);
    eq(animation.strokes.map(s => s.tripId).join(','), 'a,b,c', '여정은 날짜순으로 획이 된다');
    eq(animation.dateRange.join('~'), '2024-01-10~2024-05-03', '날짜 범위');
}
{
    const animation = TripAnimation.build([
        trip('late', '2024-02-02', 900), trip('early', '2024-02-02', 100)
    ]);
    eq(animation.strokes.map(s => s.tripId).join(','), 'early,late', '같은 날짜면 기록된 순서를 따른다');
}
{
    const animation = TripAnimation.build([
        trip('no-date-1', ''), trip('dated-late', '2024-05-03'),
        trip('no-date-2', ''), trip('dated-early', '2024-01-10')
    ]);
    const order = animation.strokes.map(s => s.tripId);
    eq(order.slice(0, 2).join(','), 'dated-early,dated-late', '날짜를 아는 여정이 먼저, 시간순으로');
    eq(order.slice(2).sort().join(','), 'no-date-1,no-date-2', '날짜를 모르는 여정은 뒤에 몰린다');
}
{
    // 미리 본 것과 저장한 영상의 순서가 달라지면 안 된다.
    const trips = Array.from({ length: 12 }, (_, i) => trip(`t${i + 1}`, ''));
    const first = TripAnimation.build(trips).strokes.map(s => s.tripId).join(',');
    const again = TripAnimation.build(trips.slice().reverse()).strokes.map(s => s.tripId).join(',');
    eq(again, first, '같은 기록이면 언제 돌려도 같은 순서');
    ok(first !== trips.map(t => t.id).join(','), '들어온 순서를 그대로 쓰지 않는다');
}
{
    const { shuffleKey } = require('../.verify/tripAnimation.js');
    // 앱(Kotlin)의 FNV-1a 와 같은 값이어야 두 쪽 순서가 어긋나지 않는다.
    eq(shuffleKey(''), 2166136261, 'FNV-1a 시작값');
    ok(shuffleKey('a') !== shuffleKey('b'), '다른 id 는 다른 자리');
    ok(shuffleKey('trip_1730000000000') >= 0, '부호 없는 32비트');
}
{
    const animation = TripAnimation.build([
        trip('empty', '2024-01-01', 0, []),
        trip('dot', '2024-01-02', 0, [line(139.0, 35.0)]),
        trip('real', '2024-01-03')
    ]);
    eq(animation.strokes.map(s => s.tripId).join(','), 'real', '선로 좌표가 없는 여정은 빠진다');
}
{
    const animation = TripAnimation.build([
        trip('mixed', '2024-01-01', 0, [line(139.0, 35.0), line(139.0, 35.0, 139.1, 35.0)])
    ]);
    eq(animation.strokes[0].geometries.length, 1, '점 하나짜리 폴리라인은 획에서 걸러진다');
}

// --- 한 획 시간 --------------------------------------------------------------
{
    eq(TripAnimation.build([trip('a', '2024-01-01')], 1).strokeDurationMs, MIN_STROKE_MS, '하한으로 잘린다');
    eq(TripAnimation.build([trip('a', '2024-01-01')], 99999).strokeDurationMs, MAX_STROKE_MS, '상한으로 잘린다');

    const animation = TripAnimation.build([1, 2, 3].map(i => trip(`t${i}`, `2024-01-0${i}`)), 500);
    const faster = animation.withStrokeDuration(200);
    eq(faster.strokeDurationMs, 200, '속도만 바꾼다');
    eq(faster.totalDurationMs, 600, '전체 길이가 따라 바뀐다');
    ok(animation.strokes === faster.strokes, '좌표를 다시 재지 않는다');
    eq(TripAnimation.build([1, 2, 3, 4].map(i => trip(`t${i}`, `2024-01-0${i}`)), 500).totalDurationMs,
        2000, '전체 = 획 수 × 한 획 시간');
}

// --- 시간에 따른 장면 --------------------------------------------------------
{
    const animation = TripAnimation.build([1, 2, 3].map(i => trip(`t${i}`, `2024-01-0${i}`)), 500);

    const begin = animation.frameAt(0);
    eq(begin.completedCount, 0, '시작: 완성된 획 없음');
    eq(begin.drawingIndex, 0, '시작: 첫 획을 그린다');
    near(begin.progress, 0, 1e-6, '시작: 진행 0');
    eq(begin.date, '2024-01-01', '시작 날짜');

    near(animation.frameAt(250).progress, 0.5, 1e-6, '절반');

    const boundary = animation.frameAt(500);
    eq(boundary.completedCount, 1, '경계: 앞 획이 완성');
    eq(boundary.drawingIndex, 1, '경계: 다음 획이 시작');
    near(boundary.progress, 0, 1e-6, '경계: 진행 0');
    eq(boundary.date, '2024-01-02', '경계 날짜');

    const last = animation.frameAt(1400);
    eq(last.completedCount, 2, '마지막 획 그리는 중');
    ok(!last.isFinished, '아직 안 끝남');

    const end = animation.frameAt(1500);
    ok(end.isFinished, '끝남');
    eq(end.completedCount, 3, '모든 획 완성');
    eq(end.drawingIndex, -1, '그리는 중인 획 없음');
    eq(end.date, '2024-01-03', '마지막 날짜가 남는다');
    eq(animation.frameAt(99999).elapsedMs, 1500, '지나쳐도 더 가지 않는다');

    const negative = animation.frameAt(-800);
    eq(negative.drawingIndex, 0, '음수 시간도 시작으로 본다');
    near(negative.progress, 0, 1e-6, '음수 시간 진행 0');
}
{
    const animation = TripAnimation.build([]);
    ok(animation.isEmpty, '비어 있음');
    eq(animation.totalDurationMs, 0, '길이 0');
    eq(animation.dateRange, null, '날짜 범위 없음');
    near(animation.totalLengthKm, 0, 1e-9, '거리 0');
    ok(animation.frameAt(0).isFinished, '비어 있으면 바로 끝난 상태');
    eq(animation.frameAt(0).drawingIndex, -1, '그릴 획 없음');
    eq(animation.bounds(), null, '범위 없음');
}

// --- 획 자르기 ---------------------------------------------------------------
{
    const stroke = strokeOf([line(139.0, 35.0, 139.1, 35.0, 139.2, 35.0)]);
    eq(stroke.partial(0).length, 0, '진행 0이면 아무것도 없다');
    eq(stroke.partial(-1).length, 0, '음수 진행도 아무것도 없다');
    eq(stroke.partial(1)[0].length, 3, '진행 1이면 전부');
    eq(stroke.partial(2)[0].length, 3, '1을 넘겨도 전부');
    near(lengthOf(stroke.partial(0.5)), stroke.totalLengthKm / 2, stroke.totalLengthKm * 0.01, '절반이면 길이도 절반');
}
{
    // 점 두 개짜리 선분 하나. 1/4 지점은 반드시 새 점이어야 한다.
    const stroke = strokeOf([line(139.0, 35.0, 139.4, 35.0)]);
    const quarter = stroke.partial(0.25)[0];
    eq(quarter.length, 2, '끊긴 자리에 점을 끼운다');
    near(quarter[1][0], 139.1, 1e-3, '끼운 점의 경도');
    near(quarter[1][1], 35.0, 1e-6, '끼운 점의 위도');
}
{
    const stroke = strokeOf([line(139.0, 35.0, 139.2, 35.0), line(139.2, 35.0, 139.4, 35.0)]);
    eq(stroke.partial(0.25).length, 1, '앞 폴리라인부터 채운다');
    const past = stroke.partial(0.75);
    eq(past.length, 2, '둘째 폴리라인까지 넘어간다');
    eq(past[0].length, 2, '첫 폴리라인은 통째로 남는다');
    near(past[0][1][0], 139.2, 1e-6, '첫 폴리라인의 끝점');
}
{
    const stroke = strokeOf([
        line(139.0, 35.0, 139.2, 35.2, 139.3, 35.1),
        line(139.3, 35.1, 139.6, 35.4)
    ]);
    let previous = 0;
    for (let step = 0; step <= 20; step += 1) {
        const drawn = lengthOf(stroke.partial(step / 20));
        ok(drawn >= previous - 1e-6, `진행 ${step} 에서 길이가 줄지 않는다`);
        previous = drawn;
    }
    near(previous, stroke.totalLengthKm, 1e-6, '끝까지 가면 전체 길이');
}
{
    const stroke = strokeOf([line(139.0, 35.0, 139.0, 35.0)]);
    near(stroke.totalLengthKm, 0, 1e-9, '길이가 없는 획');
    eq(stroke.partial(0.5).length, 0, '길이가 없으면 그려도 아무것도 없다');
    eq(stroke.partial(1).length, 1, '진행 1은 그래도 전부를 준다');
}

// --- 칠해진 거리와 범위 ------------------------------------------------------
{
    const animation = TripAnimation.build([
        trip('a', '2024-01-01', 0, [line(139.0, 35.0, 139.2, 35.0)]),
        trip('b', '2024-01-02', 0, [line(139.0, 36.0, 139.2, 36.0)])
    ], 500);
    const each = animation.strokes[0].totalLengthKm;
    near(animation.paintedLengthKm(animation.frameAt(0)), 0, 1e-6, '시작은 0km');
    near(animation.paintedLengthKm(animation.frameAt(250)), each / 2, each * 0.01, '절반 그리면 절반');
    near(animation.paintedLengthKm(animation.frameAt(500)), each, 1e-6, '한 획 다 그리면 그 길이');
    near(animation.paintedLengthKm(animation.frameAt(1000)), animation.totalLengthKm, 1e-6, '끝나면 전체');
}
{
    const animation = TripAnimation.build([
        trip('a', '2024-01-01', 0, [line(139.0, 35.0, 139.5, 35.5)]),
        trip('b', '2024-01-02', 0, [line(140.0, 36.0, 138.5, 34.5)])
    ]);
    const bounds = animation.bounds();
    near(bounds.minLat, 34.5, 1e-9, '남쪽 끝');
    near(bounds.maxLat, 36.0, 1e-9, '북쪽 끝');
    near(bounds.minLon, 138.5, 1e-9, '서쪽 끝');
    near(bounds.maxLon, 140.0, 1e-9, '동쪽 끝');
}

// --- 탄 날을 일본 시각으로 읽기 ------------------------------------------------
// 타임라인의 시각은 epoch 로 들어온다. UTC 로 자르면 밤 기록이 하루 전으로 밀린다.
{
    const { rideDateOf } = require('../.verify/timeline/parse.js');

    // 2024-05-01 21:00 JST = 2024-05-01T12:00Z. 같은 날이어야 한다.
    eq(rideDateOf(Date.UTC(2024, 4, 1, 12, 0)), '2024-05-01', '밤 9시 JST 는 그날');
    // 2024-05-01 08:00 JST = 2024-04-30T23:00Z. UTC 로 자르면 4월 30일이 된다.
    eq(rideDateOf(Date.UTC(2024, 3, 30, 23, 0)), '2024-05-01', '아침 8시 JST 도 그날');
    // 자정 직후. JST 0시 = 전날 15시 UTC.
    eq(rideDateOf(Date.UTC(2024, 4, 1, 15, 0)), '2024-05-02', '자정을 넘기면 다음 날');
    // 자정 직전. JST 23:59 = 같은 날 14:59 UTC.
    eq(rideDateOf(Date.UTC(2024, 4, 1, 14, 59)), '2024-05-01', '자정 직전은 아직 그날');
    eq(rideDateOf(NaN), '', '시각을 모르면 빈 값');
    eq(rideDateOf(Number.POSITIVE_INFINITY), '', '무한대도 빈 값');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

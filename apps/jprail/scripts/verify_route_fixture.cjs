/**
 * 고정물이 지금 그래프와 맞는가.
 *
 * `route_fixture.json` 은 앱과 웹이 같은 그래프를 세우는지 맞대는 데 쓴다. 웹이
 * 그래프를 고치고 고정물을 다시 만들지 않으면, 앱 쪽 시험이 **웹의 옛 답**과
 * 맞대게 된다. 그러면 갈라진 것을 못 잡는다. 여기서 먼저 걸러 낸다.
 *
 *   npm run verify:fixture
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FILE = path.join(__dirname, '..', 'public', 'rail', 'route_fixture.json');

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};

console.log('경로 고정물 검증');

ok(fs.existsSync(FILE), 'route_fixture.json 이 없다. npm run build:route-fixture 를 돌려라');
if (fs.existsSync(FILE)) {
    const shipped = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const before = fs.readFileSync(FILE, 'utf8');

    // 생성기를 그대로 다시 돌려 파일이 바뀌는지 본다. 같은 재료면 같은 파일이 나온다.
    execFileSync(process.execPath, [path.join(__dirname, 'build_route_fixture.cjs')], { stdio: 'pipe' });
    const after = fs.readFileSync(FILE, 'utf8');
    if (before !== after) fs.writeFileSync(FILE, before);
    ok(before === after, '고정물이 지금 그래프와 다르다. npm run build:route-fixture 를 다시 돌려라');

    const pairs = shipped.pairs || [];
    ok(pairs.length >= 100, `역쌍이 ${pairs.length}개뿐이다. 100개는 넘어야 한다`);
    ok(
        pairs.every((p) => p.from && p.to && p.from !== p.to),
        '역쌍에 빈 값이나 자기 자신이 있다'
    );
    ok(
        pairs.every((p) => p.rail_km === null || p.walk_km === null || p.walk_km <= p.rail_km + 1e-9),
        '걸어서 가는 편이 더 먼 쌍이 있다 — 도보 간선은 더하기만 하므로 그럴 수 없다'
    );
    ok(
        pairs.some((p) => p.why === 'patch'),
        '메워 넣은 연결(graph_patch)이 고정물에 하나도 없다'
    );
    const reachable = pairs.filter((p) => p.walk_km !== null).length;
    ok(reachable >= pairs.length * 0.9, `걸어서도 못 닿는 쌍이 너무 많다 (${pairs.length - reachable}개)`);
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

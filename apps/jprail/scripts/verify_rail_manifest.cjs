/**
 * 실려 나가는 목록표가 실제 파일과 맞는가.
 *
 * 앱은 이 목록표의 sha256 만 믿고 "받을 것이 있는지"를 가른다. 목록표가 실제
 * 파일과 어긋나면 앱은 낡은 사본을 최신이라 여기거나, 받아 놓고도 못 쓴다.
 * 데이터를 고치고 `npm run build:rail-manifest` 를 잊으면 여기서 걸린다.
 *
 *   npm run verify:manifest
 */
const fs = require('fs');
const path = require('path');

const { build } = require('./build_rail_manifest.cjs');

const OUT = path.join(__dirname, '..', 'public', 'rail', 'manifest.json');

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};

console.log('철도 데이터 목록표 검증');

ok(fs.existsSync(OUT), 'manifest.json 이 없다. npm run build:rail-manifest 를 돌려라');
if (fs.existsSync(OUT)) {
    const shipped = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const fresh = build();

    ok(shipped.version === fresh.version, `판본이 다르다 — 파일 ${shipped.version}, 실제 ${fresh.version}`);

    const shippedByPath = new Map((shipped.files || []).map((f) => [f.path, f]));
    const freshByPath = new Map(fresh.files.map((f) => [f.path, f]));

    const missing = [...freshByPath.keys()].filter((p) => !shippedByPath.has(p));
    const extra = [...shippedByPath.keys()].filter((p) => !freshByPath.has(p));
    ok(missing.length === 0, `목록표에 빠진 파일: ${JSON.stringify(missing)}`);
    ok(extra.length === 0, `목록표에만 있는 파일: ${JSON.stringify(extra)}`);

    const wrong = [...freshByPath.values()].filter((f) => {
        const entry = shippedByPath.get(f.path);
        return entry && (entry.sha256 !== f.sha256 || entry.bytes !== f.bytes);
    });
    ok(wrong.length === 0, `해시나 크기가 다른 파일: ${JSON.stringify(wrong.map((f) => f.path))}`);

    // 앱이 실제로 읽는 것들. 하나라도 빠지면 앱이 받아도 못 쓴다.
    const REQUIRED = [
        'companies.json', 'lines.json', 'stations_master.json', 'stations_lod.json',
        'platforms_meta.json', 'platforms_geom.json', 'sections_meta.json',
        'sections_geom_mid.json', 'station_graph.json', 'graph_patch.json', 'services.json'
    ];
    const absent = REQUIRED.filter((p) => !freshByPath.has(p));
    ok(absent.length === 0, `앱이 읽는 파일이 public/rail 에 없다: ${JSON.stringify(absent)}`);

    ok(fresh.files.every((f) => f.bytes > 0), '크기가 0 인 파일이 있다');
    ok(fresh.files.every((f) => /^[0-9a-f]{64}$/.test(f.sha256)), 'sha256 이 아닌 값이 있다');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

/**
 * 같은 역에서 노선을 갈아탈 때 걸리는 시간.
 *
 * 예전에는 환승 비용이 **상수 하나**였다. 그래서 新宿의 547m 환승과 같은 승강장
 * 건너편 28m 환승이 라우터에게 같은 값이었다. 전국 812개 환승역 중 74곳이 200m 를
 * 넘는데도 그랬다.
 *
 * 실제 `buildRouteGraph` 를 진짜 데이터로 돌려 확인한다.
 *
 * 앱(jpApp)의 `RailTransferWalkTest` 는 **노선 id 단위**로 1,489쌍을 고정한다. 여기
 * 숫자가 그보다 적은 것은 웹이 **노선을 그룹으로 묶기** 때문이다 — 회사 경계에서 id 가
 * 갈리는 노선(本四備讃線 등)을 한 줄로 보므로, 그 사이를 오가는 것은 환승이 아니다.
 *
 *   npm run verify:transfer
 */
const fs = require('fs');
const path = require('path');

const { buildRouteGraph, findCandidateRoutes } = require('../.verify/lib/routeSearch.js');
const tw = require('../.verify/lib/transferWalk.js');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

const stationsMaster = read('stations_master.json');
const platformsMeta = read('platforms_meta.json');
const platformsGeom = read('platforms_geom.json');
const sectionsMeta = read('sections_meta.json');
const sectionsGeomHigh = read('sections_geom_high.json');
const stationGraph = read('station_graph.json');
const railroadNetworkLite = read('railroad_network_lite.json');
const lines = read('lines.json');

// 폴리라인을 풀어 승강장 선로 방향을 얻는다. 앱은 PolylineDecoder 가 하는 일이다.
function decode(str) {
    const out = [];
    let lat = 0, lon = 0, i = 0;
    while (i < str.length) {
        for (let t = 0; t < 2; t += 1) {
            let shift = 0, result = 0, b;
            do {
                b = str.charCodeAt(i++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const d = (result & 1) ? ~(result >> 1) : (result >> 1);
            if (t === 0) lat += d; else lon += d;
        }
        out.push([lat / 1e5, lon / 1e5]);
    }
    return out;
}

const platforms = {};
for (const [pid, meta] of Object.entries(platformsMeta)) {
    const encoded = (platformsGeom[pid] || [])[0] || '';
    platforms[pid] = { ...meta, geometries: encoded ? [decode(encoded)] : [] };
}

const sections = Object.keys(sectionsGeomHigh).map((id) => ({
    id: parseInt(id, 10), ...sectionsMeta[id], geometry: sectionsGeomHigh[id]
}));
const railData = {
    stations: stationsMaster,
    platforms,
    lines,
    sections: { sections, lod: { high: sections, mid: sections, low: sections } },
    railroadNetwork: { ...railroadNetworkLite, station_graph: stationGraph }
};

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};

console.log('환승 도보 시간 검증');

const graph = buildRouteGraph(railData);
const minutes = [...graph.transferMinutes.values()];
minutes.sort((a, b) => a - b);
const median = minutes[Math.floor(minutes.length / 2)];
console.log(`  환승 짝 ${minutes.length}개 — 중앙값 ${median.toFixed(2)}분, 최대 ${minutes[minutes.length - 1].toFixed(1)}분`);

ok(minutes.length > 1200, `환승 짝이 충분히 나와야 한다 (실제 ${minutes.length})`);

// 보통 환승은 예전과 거의 같아야 한다 — 그래야 어려운 환승만 건드린다.
ok(Math.abs(median - 1.06) < 0.1, `중앙값이 1.06분 근처여야 한다 (실제 ${median.toFixed(2)})`);
ok(tw.transferCostFactor(median) < 1.2, '보통 환승의 배수는 1.2 미만');

// 값이 쉬운 쪽에 몰려 있어야 한다.
const quick = minutes.filter((m) => m <= 5).length;
ok(quick / minutes.length > 0.85, `5분 이하가 85% 넘어야 한다 (실제 ${(quick / minutes.length * 100).toFixed(0)}%)`);

// 악명 높은 환승을 짚어 본다.
const byName = {};
for (const [id, st] of Object.entries(stationsMaster)) {
    (byName[st.name] = byName[st.name] || []).push(id);
}
const worstAt = (name) => {
    let worst = 0;
    for (const sid of byName[name] || []) {
        for (const [key, m] of graph.transferMinutes) {
            if (key.startsWith(`${sid}|`) && m > worst) worst = m;
        }
    }
    return worst;
};
const shinjuku = worstAt('新宿');
const otemachi = worstAt('大手町');
console.log(`  新宿 최악 ${shinjuku.toFixed(1)}분 · 大手町 최악 ${otemachi.toFixed(1)}분`);
ok(shinjuku >= 10 && shinjuku <= 14, `新宿 최악 환승이 10~14분 (실제 ${shinjuku.toFixed(1)})`);
ok(otemachi >= 7 && otemachi <= 11, `大手町 최악 환승이 7~11분 (실제 ${otemachi.toFixed(1)})`);

// 규칙 자체.
ok(tw.transferMinutes(0, null) === tw.MIN_MINUTES, '붙어 있어도 최소 시간은 든다');
// 부동소수라 정확히 견주지 않는다.
ok(Math.abs(tw.transferMinutes(200, 80) - tw.transferMinutes(200, 10) - tw.LEVEL_CHANGE_MINUTES) < 1e-9,
    '선로가 엇갈리면 층 이동을 더한다');
ok(Math.abs(tw.transferMinutes(200, null) - tw.transferMinutes(200, 10)) < 1e-9,
    '방향을 모르면 층 이동을 더하지 않는다');
ok(tw.transferCostFactor(999) === tw.MAX_FACTOR, '배수에는 상한이 있다');
ok(tw.bearingDifference(170, 10) === 20, '방향 차는 0~90 사이다');

// 경로에 합계가 실린다.
const first = (name) => stationsMaster[(byName[name] || [])[0]];
const result = findCandidateRoutes([first('新宿'), first('東京')], railData, {});
const cand = result.legs[0] && result.legs[0].candidates[0];
ok(!!cand, '新宿→東京 경로가 나온다');
if (cand) {
    console.log(`  新宿→東京 ${cand.distance}km 환승 ${cand.transferCount}회 도보 ${cand.transferWalkMinutes}분`);
    ok(typeof cand.transferWalkMinutes === 'number', '경로에 환승 도보 시간이 실린다');
    ok(cand.transferCount === 0 ? cand.transferWalkMinutes === 0 : cand.transferWalkMinutes > 0,
        '환승이 있으면 도보 시간도 0보다 크다');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

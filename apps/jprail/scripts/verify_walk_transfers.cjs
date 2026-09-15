/**
 * 걸어서 갈아탈 수 있는 역이 제대로 이어지는지.
 *
 * 예전에는 **이름이 같은 역만** 이었다. 그래서 鷹ノ巣와 鷹巣, 諫早와 諫早（雲仙・島原口）,
 * 人吉와 人吉温泉처럼 **좌표가 사실상 같은데 이름만 다른** 곳이 남남으로 남았고,
 * 鷹ノ巣에서 西鷹巣까지 1.2km 를 240km 돌아갔다.
 *
 * 여기서는 실제 `buildRouteGraph` 를 진짜 데이터로 돌려 확인한다.
 *
 * 앱(jpApp)의 `RailWalkTransferTest` 는 **규칙 자체**를 49/474 로 고정한다. 여기 숫자가
 * 그보다 적은 것은 웹이 **철도 간선이 없는 역을 빼기** 때문이다. 그런 역으로는 어차피
 * 지나갈 수 없어서 경로 결과는 같다.
 *
 *   npm run verify:walk
 */
const fs = require('fs');
const path = require('path');

const { buildRouteGraph, findCandidateRoutes } = require('../.verify/lib/routeSearch.js');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

const stationsMaster = read('stations_master.json');
const sectionsMeta = read('sections_meta.json');
const sectionsGeomHigh = read('sections_geom_high.json');
const stationGraph = read('station_graph.json');
const railroadNetworkLite = read('railroad_network_lite.json');

const sections = Object.keys(sectionsGeomHigh).map((id) => ({
    id: parseInt(id, 10),
    ...sectionsMeta[id],
    geometry: []
}));
const railData = {
    stations: stationsMaster,
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

console.log('도보 환승 검증');

const graph = buildRouteGraph(railData);
const nameOf = (id) => (stationsMaster[id] && stationsMaster[id].name) || id;

const pairs = new Set();
graph.adj.forEach((edges, from) => {
    edges.forEach((edge) => {
        if (!edge.isWalk) return;
        pairs.add(from < edge.to ? `${from}|${edge.to}` : `${edge.to}|${from}`);
    });
});
let sameName = 0;
let nearby = 0;
const linked = new Set();
for (const key of pairs) {
    const [a, b] = key.split('|');
    if (nameOf(a) === nameOf(b)) sameName += 1;
    else nearby += 1;
    linked.add(nameOf(a) <= nameOf(b) ? `${nameOf(a)}↔${nameOf(b)}` : `${nameOf(b)}↔${nameOf(a)}`);
}
console.log(`  도보 짝 ${pairs.size}개 — 이름 같음 ${sameName}, 이름 다름 ${nearby}`);

ok(sameName === 40, `이름이 같은 짝이 40개여야 한다 (실제 ${sameName})`);
ok(nearby === 470, `이름이 다른 짝이 470개여야 한다 (실제 ${nearby})`);

// 좌표가 같은데 이름만 달라 끊겨 있던 곳들.
ok(linked.has('鷹ノ巣↔鷹巣'), '鷹ノ巣 ↔ 鷹巣');
ok(linked.has('諫早↔諫早（雲仙・島原口）'), '諫早 ↔ 諫早（雲仙・島原口）');
ok(linked.has('人吉↔人吉温泉'), '人吉 ↔ 人吉温泉');
ok(linked.has('大阪梅田↔梅田'), '梅田 ↔ 大阪梅田');

// 2.8km 는 걷는 문제가 아니라 선로가 이어지는지의 문제다.
ok(!linked.has('下地↔伊奈'), '下地 ↔ 伊奈 를 걸어서 이으면 안 된다');

const byName = {};
for (const [id, st] of Object.entries(stationsMaster)) {
    (byName[st.name] = byName[st.name] || []).push(id);
}
const firstId = (name) => (byName[name] || [])[0];
const routeBetween = (a, b, allowWalkTransfer) => {
    const from = stationsMaster[firstId(a)];
    const to = stationsMaster[firstId(b)];
    if (!from || !to) return null;
    const result = findCandidateRoutes([from, to], railData, { allowWalkTransfer });
    const leg = result.legs[0];
    return leg && leg.candidates[0] ? leg.candidates[0] : null;
};

// 도보를 켜면 짧고, 끄면 선로만으로 멀리 돈다. 옵션이 실제로 먹는지 본다.
const walked = routeBetween('鷹ノ巣', '西鷹巣', true);
const railOnly = routeBetween('鷹ノ巣', '西鷹巣', false);
ok(walked !== null && walked.distance < 20, `鷹ノ巣→西鷹巣 가 짧아야 한다 (${walked && walked.distance.toFixed(1)}km)`);
ok(walked !== null && walked.walkCount === 1, '걸어서 한 번 갈아탄다');
ok(railOnly !== null && railOnly.walkCount === 0, '도보를 끄면 도보 구간이 없어야 한다');
ok(railOnly !== null && railOnly.distance > 100, `선로만으로는 멀어야 한다 (${railOnly && railOnly.distance.toFixed(1)}km)`);

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

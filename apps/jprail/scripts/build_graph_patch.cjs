/**
 * 그래프 보수 간선 생성기.
 *
 * `station_graph.json` 은 노선이 갈리는 자리에서 간선을 빠뜨린다. 세토대교가
 * 그랬고(시코쿠 376역이 통째로 끊겼다), 醒ヶ井↔米原 이 그랬다. 구간(section)
 * 데이터에는 멀쩡히 선로가 있으니 규칙으로 되살릴 수 있는데, **그 규칙이 웹과
 * 앱에 따로 구현되어 있다**(`lib/routeSearch` · `domain/engine/GraphRepair.kt`).
 * 같은 규칙을 두 번 쓰면 한쪽만 틀리는 날이 온다. 실제로 왔다.
 *
 * 그래서 규칙은 여기서 **한 번만** 돌리고 결과를 데이터로 내보낸다. 앱과 웹은
 * 이 파일을 읽기만 하므로 둘의 그래프가 갈라질 자리가 없어진다. 두 구현은
 * 이제 런타임이 아니라 **검증**에 쓰인다 — 각자 이 파일과 같은 답을 내는지.
 *
 *   npm run build:graph-patch
 *
 * 출력은 앱(assets/rail)과 웹(public/rail)이 그대로 함께 쓴다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { collectRepairEdges } = require('../.verify/lib/routeSearch.js');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

const stationsMaster = read('stations_master.json');
const sectionsMeta = read('sections_meta.json');
const sectionsGeomHigh = read('sections_geom_high.json');
const stationGraph = read('station_graph.json');
const railroadNetworkLite = read('railroad_network_lite.json');
// 분기형 접합부를 넘을지 가르는 관문이 **승강장**의 노선을 본다. 없으면 아무것도 넘지 않는다.
const lines = read('lines.json');
const platformsMeta = read('platforms_meta.json');

const sections = Object.keys(sectionsGeomHigh).map((id) => ({
    id: parseInt(id, 10),
    ...sectionsMeta[id],
    geometry: []
}));

const railData = {
    lines,
    platforms: platformsMeta,
    stations: stationsMaster,
    sections: { sections, lod: { high: sections, mid: sections, low: sections } },
    railroadNetwork: { ...railroadNetworkLite, station_graph: stationGraph }
};

const nameOf = (id) => (stationsMaster[id] && stationsMaster[id].name) || id;

const edges = collectRepairEdges(railData).map((edge) => ({
    ...edge,
    from_name: nameOf(edge.from),
    to_name: nameOf(edge.to)
}));

// 내용이 같으면 같은 값이 나오는 판본. 앱이 받아 둔 것과 비교할 때 쓴다.
const version = crypto
    .createHash('sha256')
    .update(JSON.stringify(edges.map((e) => [e.from, e.to, e.section_ids])))
    .digest('hex')
    .slice(0, 12);

const out = {
    _source: 'scripts/build_graph_patch.cjs — lib/routeSearch 의 보수 규칙을 빌드 때 한 번 돌린 결과.',
    _note:
        'station_graph.json 이 빠뜨린 선로 간선. 앱과 웹이 각자 규칙을 돌리지 않고 이 목록을 읽는다. ' +
        '한 역쌍은 한 줄이고, 읽는 쪽이 양방향으로 넣는다. 이름은 사람이 읽기 위한 것이다.',
    version,
    edges
};

const outFile = path.join(RAIL, 'graph_patch.json');
fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');

const byRule = edges.reduce((acc, e) => {
    acc[e.rule] = (acc[e.rule] || 0) + 1;
    return acc;
}, {});
console.log(`${outFile}`);
console.log(`  판본 ${version} · 간선 ${edges.length}개 — ${Object.entries(byRule).map(([k, v]) => `${k} ${v}`).join(', ')}`);

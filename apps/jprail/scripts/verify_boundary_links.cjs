/**
 * 노선 경계에서 끊긴 연결이 되살아나는지.
 *
 * `station_graph.json` 은 노선이 갈리는 자리에서 간선을 빠뜨린다. 구간(section)
 * 데이터에는 멀쩡히 선로가 있는데도 그래프에 없어서, 붙어 있는 두 역 사이에
 * 엉뚱하게 먼 경로가 나온다. 가장 컸던 것이 세토대교로, **시코쿠 376개 역이
 * 혼슈에서 통째로 끊겨** 있었다.
 *
 * `routeSearch.ts` 의 `addContractedJointEdges` 가 이걸 메운다. 여기서는 **실제
 * 데이터로 진짜 그 함수를 돌려** 되살아나는 목록을 고정한다. 앱(jpApp)의
 * `RailBoundaryLinkTest` 와 같은 목록이어야 한다 — 갈라지면 같은 기록에서 앱과
 * 웹이 다른 경로를 낸다.
 *
 *   npm run verify:links
 */
const fs = require('fs');
const path = require('path');

const { buildRouteGraph } = require('../.verify/lib/routeSearch.js');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

const stationsMaster = read('stations_master.json');
const sectionsMeta = read('sections_meta.json');
const sectionsGeomHigh = read('sections_geom_high.json');
const stationGraph = read('station_graph.json');
const railroadNetworkLite = read('railroad_network_lite.json');

// useRailData 가 만드는 것과 같은 모양. 좌표는 이 검증에 쓰이지 않아 비워 둔다.
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

/** 되살아나야 하는 연결. `역A↔역B`, 이름 오름차순. */
const EXPECTED = [
    '上越妙高↔糸魚川',
    '杉原↔猪谷',
    '七尾↔徳田',
    '亀山↔井田川',
    '御厨↔袋井',
    '下関↔幡生',
    '新宮↔鵜殿',
    '上の町↔児島',
    '甘木↔馬田',
    '千国↔南小谷',
    'あすなろう四日市↔川原町',
    '一本松↔上伊田',
    '大開↔新開地',
    '平沼橋↔横浜',
    '新開地↔湊川',
    '天王寺↔天王寺駅前',
    '東日本橋↔馬喰横山',
    'あすなろう四日市↔近鉄四日市',
    '南森町↔大阪天満宮'
];

let failures = 0;
let checks = 0;
const ok = (condition, label) => {
    checks += 1;
    if (!condition) {
        failures += 1;
        console.error(`  ✗ ${label}`);
    }
};

console.log('노선 경계 연결 검증');

// station_graph 에 원래 있던 간선.
const original = new Set();
for (const [from, neighbours] of Object.entries(stationGraph)) {
    for (const to of Object.keys(neighbours || {})) original.add(`${from}|${to}`);
}

const graph = buildRouteGraph(railData);

const nameOf = (id) => (stationsMaster[id] && stationsMaster[id].name) || id;
const label = (a, b) => {
    const na = nameOf(a);
    const nb = nameOf(b);
    return na <= nb ? `${na}↔${nb}` : `${nb}↔${na}`;
};

// 원래 없었는데 생긴 간선만 모은다.
const recovered = new Set();
graph.adj.forEach((edges, from) => {
    edges.forEach((edge) => {
        if (edge.isWalk) return;
        if (original.has(`${from}|${edge.to}`) || original.has(`${edge.to}|${from}`)) return;
        recovered.add(label(from, edge.to));
    });
});

const missing = EXPECTED.filter((x) => !recovered.has(x));
const extra = [...recovered].filter((x) => !EXPECTED.includes(x));

ok(missing.length === 0, `되살아나지 않은 연결: ${JSON.stringify(missing)}`);
ok(extra.length === 0, `목록에 없는 연결이 생겼다: ${JSON.stringify(extra)}`);

// 가장 아팠던 두 곳은 따로 못 박는다.
ok(recovered.has('上の町↔児島'), '세토대교(上の町↔児島)가 이어져야 한다');
ok(recovered.has('杉原↔猪谷'), '다카야마 본선(杉原↔猪谷)이 이어져야 한다');

// 접합부가 역처럼 섞여 들어오면 없는 노선이 생긴다.
let jointLeak = 0;
graph.adj.forEach((edges, from) => {
    if (from.startsWith('J_')) jointLeak += 1;
    edges.forEach((edge) => {
        if (edge.to.startsWith('J_')) jointLeak += 1;
    });
});
ok(jointLeak === 0, `접합부가 그래프에 섞여 들어왔다 (${jointLeak}건)`);

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건, 되살린 연결 ${recovered.size}개`);

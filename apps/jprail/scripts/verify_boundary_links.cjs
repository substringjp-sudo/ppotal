/**
 * 노선 경계에서 끊긴 연결이 되살아나는지.
 *
 * `station_graph.json` 은 노선이 갈리는 자리에서 간선을 빠뜨린다. 구간(section)
 * 데이터에는 멀쩡히 선로가 있는데도 그래프에 없어서, 붙어 있는 두 역 사이에
 * 엉뚱하게 먼 경로가 나온다. 가장 컸던 것이 세토대교로, **시코쿠 376개 역이
 * 혼슈에서 통째로 끊겨** 있었다.
 *
 * `routeSearch.ts` 의 `addContractedJointEdges`(통과형 접합부)와 `addJunctionEdges`
 * (분기형 접합부)가 이걸 메운다. 여기서는 **실제 데이터로 진짜 그 함수들을 돌려**
 * 되살아나는 목록을 고정한다. 앱(jpApp)의 `RailBoundaryLinkTest`·`RailJointLinkTest`
 * 와 같은 목록이어야 한다 — 갈라지면 같은 기록에서 앱과 웹이 다른 경로를 낸다.
 *
 * 앱은 두 규칙의 **결과**를 따로 시험하지만 여기서는 완성된 그래프를 보므로 목록이
 * 한 자리에 모인다. 그래서 어느 규칙이 만든 것인지 목록을 나눠 적었다.
 *
 *   npm run verify:links
 */
const fs = require('fs');
const path = require('path');

const { buildRouteGraph, collectRepairEdges } = require('../.verify/lib/routeSearch.js');

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
// 빌드 때 미리 계산해 둔 보수 간선. 앱도 같은 파일을 읽는다.
const graphPatch = read('graph_patch.json');

// useRailData 가 만드는 것과 같은 모양. 좌표는 이 검증에 쓰이지 않아 비워 둔다.
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
    railroadNetwork: { ...railroadNetworkLite, station_graph: stationGraph },
    graphPatch,
    rules: read('rules.json')
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

/**
 * 분기형 접합부를 넘어 되살아나야 하는 연결.
 *
 * 모든 구간이 한 노선이고 그 노선이 양 끝 역의 승강장에 있을 때만 넘는다. 넷은
 * OpenStreetMap 선로로 길이까지 맞춰 봤고 3~10% 안에서 같았다. `塩尻↔小野` 는
 * 내려받은 OSM 범위 밖이라 대조하지 못했지만 小野 는 중앙본선 다쓰노 지선의 역이다.
 */
const EXPECTED_JUNCTION = [
    '塩尻↔小野',          // 9.7km — 지금은 231km 를 돌아간다
    '米原↔醒ヶ井',        // 5.9km — 도카이도선, JR 도카이/서일본 경계. 138km
    '湯河原↔熱海',        // 5.1km — 도카이도선, JR 동일본/도카이 경계. 32km
    'みどり湖↔塩尻',      // 3.7km — 중앙본선 미도리코 경유. 221km
    '西元町↔高速神戸'      // 0.6km — 고베 고속선
];

/**
 * 선로는 붙어 있어도 다닐 수 없어 **만들면 안 되는** 것들. 전부 OSM 으로 확인했다.
 *
 * `下地`와 `伊奈` 는 平井신호장에서 선로가 이어지고, `大阪梅田`와 `淀屋橋` 는 애먼
 * 오사카메트로 미도스지선을 타고 이어진다.
 */
const FORBIDDEN = [
    '下地↔伊奈', '大阪梅田↔淀屋橋', '犬山遊園↔鵜沼', '厚別↔平和',
    '西鷹巣↔鷹ノ巣', '植松↔彦崎', 'トマム↔落合', '赤羽橋↔芝公園'
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

const all = [...EXPECTED, ...EXPECTED_JUNCTION];
const missing = all.filter((x) => !recovered.has(x));
const extra = [...recovered].filter((x) => !all.includes(x));

ok(missing.length === 0, `되살아나지 않은 연결: ${JSON.stringify(missing)}`);
ok(extra.length === 0, `목록에 없는 연결이 생겼다: ${JSON.stringify(extra)}`);

const wrong = FORBIDDEN.filter((x) => recovered.has(x));
ok(wrong.length === 0, `선로가 붙어 있다고 다닐 수 있는 것은 아니다: ${JSON.stringify(wrong)}`);
ok(recovered.has('米原↔醒ヶ井'), '도카이도선 미하라 이음매(米原↔醒ヶ井)가 이어져야 한다');

// 가장 아팠던 두 곳은 따로 못 박는다.
ok(recovered.has('上の町↔児島'), '세토대교(上の町↔児島)가 이어져야 한다');
ok(recovered.has('杉原↔猪谷'), '다카야마 본선(杉原↔猪谷)이 이어져야 한다');

// 실려 나가는 목록이 규칙과 같은가.
// 런타임은 규칙을 돌리지 않고 이 파일만 읽으므로, 파일이 규칙과 어긋나면 아무도
// 모르게 그래프가 달라진다. 앱(`RailJointLinkTest`)도 자기 구현으로 같은 것을 맞댄다.
const fresh = collectRepairEdges(railData);
const strip = (list) =>
    list
        .map((e) => [e.from, e.to, e.km, (e.line_ids || []).join(','), (e.section_ids || []).join(','), e.rule].join('|'))
        .sort();
const shipped = strip(graphPatch.edges);
const computed = strip(fresh);
ok(
    JSON.stringify(shipped) === JSON.stringify(computed),
    `graph_patch.json 이 규칙과 어긋난다 (파일 ${shipped.length}줄, 규칙 ${computed.length}줄). npm run build:graph-patch 를 다시 돌려라`
);
ok(graphPatch.edges.length > 0, 'graph_patch.json 이 비어 있다');

// station_graph 가 이웃을 말하는데 그래프에는 선로 간선이 하나도 없는 역.
// `lines.json` 의 0 번은 IRいしかわ鉄道線 인데, 이걸 "노선 없음"으로 보고 간선을
// 통째로 버리던 때 東金沢·森本 이 이렇게 사라졌다. 앱에는 없던 증상이라 같은 기록에서
// 앱과 웹이 다른 경로를 냈다.
const stranded = [];
for (const [from, neighbours] of Object.entries(stationGraph)) {
    if (!stationsMaster[from]) continue;
    const wanted = Object.keys(neighbours || {}).filter((to) => stationsMaster[to]);
    if (wanted.length === 0) continue;
    if ((graph.adj.get(from) || []).some((edge) => !edge.isWalk)) continue;
    stranded.push(nameOf(from));
}
ok(stranded.length === 0, `station_graph 에 이웃이 있는데 선로 간선이 사라진 역: ${JSON.stringify(stranded)}`);

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

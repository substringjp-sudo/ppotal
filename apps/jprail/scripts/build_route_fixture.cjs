/**
 * 앱과 웹이 **같은 그래프**를 세우는지 맞대는 고정물.
 *
 * 선로 데이터도, 끊긴 연결을 메우는 목록(`graph_patch.json`)도 이제 한 곳에서
 * 만들어 양쪽이 나눠 읽는다. 그런데 그 재료로 **같은 그래프가 세워지는지**는
 * 아무도 보지 않았다. 도보 환승 반경처럼 양쪽 코드에 따로 적힌 값이 어긋나면
 * 같은 기록에서 앱과 웹이 다른 경로를 낸다 — 실제로 그런 적이 있다.
 *
 * 그래서 역쌍을 골라 **두 역 사이 최단 거리**를 적어 둔다. 앱과 웹이 각자 그래프를
 * 세워 다시 재고, 답이 다르면 CI 가 걸러 낸다.
 *
 *   npm run build:route-fixture
 *
 * ### 무엇을 고정하고 무엇을 고정하지 않나
 *
 * **그래프를 고정한다.** 최단 거리는 간선 집합이 같으면 같다 — 길이 여럿이어도
 * 값은 하나라 흔들리지 않는다. 선로만 쓴 거리와 도보 환승까지 쓴 거리를 따로 적어,
 * 도보 규칙이 어긋나면 뒤엣것만 달라지게 했다.
 *
 * **경로 선택은 고정하지 않는다.** 앱(`PENALTY_FACTOR = 2.2`)과 웹
 * (`BALANCED_PENALTY = 25`·`FAST_PENALTY = 6`)은 환승에 매기는 값이 아예 달라서
 * 지금은 같은 경로를 내지 않는다. 그건 따로 맞춰야 할 다음 일이다.
 */
const fs = require('fs');
const path = require('path');

const { buildRouteGraph } = require('../.verify/lib/routeSearch.js');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

function railData() {
    const sectionsMeta = read('sections_meta.json');
    const sectionsGeomHigh = read('sections_geom_high.json');
    const sections = Object.keys(sectionsGeomHigh).map((id) => ({
        id: parseInt(id, 10),
        ...sectionsMeta[id],
        geometry: []
    }));
    return {
        lines: read('lines.json'),
        platforms: read('platforms_meta.json'),
        stations: read('stations_master.json'),
        sections: { sections, lod: { high: sections, mid: sections, low: sections } },
        railroadNetwork: { ...read('railroad_network_lite.json'), station_graph: read('station_graph.json') },
        graphPatch: read('graph_patch.json'),
        rules: read('rules.json')
    };
}

/** 두 역 사이 최단 거리(km). 닿지 않으면 null. 다익스트라, 환승 벌점은 없다. */
function shortest(adj, from, to, useWalk) {
    if (from === to) return 0;
    const best = new Map([[from, 0]]);
    // 역 수가 9천 개라 정렬 큐로 충분하다. 고정물을 만드는 스크립트이지 런타임이 아니다.
    const queue = [{ node: from, km: 0 }];
    while (queue.length > 0) {
        queue.sort((a, b) => a.km - b.km);
        const current = queue.shift();
        if (current.node === to) return current.km;
        if (current.km > (best.get(current.node) ?? Infinity)) continue;
        for (const edge of adj.get(current.node) || []) {
            if (!useWalk && edge.isWalk) continue;
            const km = current.km + edge.distance;
            if (km >= (best.get(edge.to) ?? Infinity)) continue;
            best.set(edge.to, km);
            queue.push({ node: edge.to, km });
        }
    }
    return null;
}

const round = (value) => (value === null ? null : Math.round(value * 1000) / 1000);

function pickPairs(stations, patch) {
    const pairs = [];
    const seen = new Set();
    const add = (from, to, why) => {
        if (from === to) return;
        const key = from < to ? `${from}|${to}` : `${to}|${from}`;
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push({ from, to, why });
    };

    // 1. 메워 넣은 연결. 여기가 어긋나면 graph_patch 를 한쪽이 못 읽고 있다는 뜻이다.
    for (const edge of patch.edges) add(edge.from, edge.to, 'patch');

    // 2. 고르게 흩뿌린 표본. 난수를 쓰지 않는다 — 다시 돌려도 같은 목록이어야 한다.
    const ids = Object.keys(stations).sort();
    for (const stride of [1, 7, 53, 211, 907, 2341, 4099]) {
        for (let i = 0; i + stride < ids.length; i += 331) {
            add(ids[i], ids[i + stride], `stride:${stride}`);
        }
    }
    return pairs;
}

function main() {
    const data = railData();
    const graph = buildRouteGraph(data);
    const pairs = pickPairs(data.stations, data.graphPatch);

    const nameOf = (id) => data.stations[id]?.name || id;
    const rows = pairs.map((pair) => ({
        from: pair.from,
        to: pair.to,
        from_name: nameOf(pair.from),
        to_name: nameOf(pair.to),
        why: pair.why,
        rail_km: round(shortest(graph.adj, pair.from, pair.to, false)),
        walk_km: round(shortest(graph.adj, pair.from, pair.to, true))
    }));

    const out = {
        _source: 'scripts/build_route_fixture.cjs — lib/routeSearch 가 세운 그래프에서 잰 최단 거리.',
        _note:
            '앱과 웹이 같은 그래프를 세우는지 맞대는 고정물. rail_km 은 선로만, walk_km 은 ' +
            '도보 환승까지 쓴 거리다(km, 닿지 않으면 null). 환승 벌점 없는 순수 최단 거리라 ' +
            '길이 여럿이어도 값은 하나다. 경로 선택은 고정하지 않는다 — 두 라우터의 가중치가 ' +
            '아직 다르다.',
        pairs: rows
    };
    const file = path.join(RAIL, 'route_fixture.json');
    fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

    const unreachable = rows.filter((r) => r.walk_km === null).length;
    console.log(file);
    console.log(`  역쌍 ${rows.length}개 · 선로로만 못 닿는 쌍 ${rows.filter((r) => r.rail_km === null).length}개 · 걸어서도 못 닿는 쌍 ${unreachable}개`);
}

main();

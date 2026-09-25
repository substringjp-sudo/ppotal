/**
 * 실려 있는 駅ナンバリング 이 실제 사인과 같은가.
 *
 * `station_codes.json` 은 출처(ekidata 노선 축)를 우리 선적(N02) 축으로 **옮긴** 결과다.
 * 옮기는 과정에 이름 맞추기와 좌표 맞추기가 들어가므로 조용히 어긋날 수 있다.
 * 그래서 실제 역에 붙어 있는 번호 몇 개를 여기 박아 둔다 — 원본이 바뀌거나
 * 맞추는 규칙을 건드려 값이 달라지면 이 검증이 먼저 걸린다.
 *
 * 번호만 보지 않고 **어느 선로에 붙었는지**까지 본다. 東京역 JY01 이 東海道新幹線에
 * 붙어도 번호 자체는 맞기 때문이다. 앱에도 같은 검증이 있다(`StationCodesTest`).
 *
 *   npm run verify:station-codes
 */
const fs = require('fs');
const path = require('path');

const RAIL = path.join(__dirname, '..', 'public', 'rail');
const read = (name) => JSON.parse(fs.readFileSync(path.join(RAIL, name), 'utf8'));

const doc = read('station_codes.json');
const stations = read('stations_master.json');
const lines = read('lines.json');

let failures = 0;
let checks = 0;
const fail = (msg) => {
    failures += 1;
    console.error(`  ✗ ${msg}`);
};

/** 그 이름의 노선 id 들. 우리 데이터에는 같은 이름이 둘 이상인 노선이 있다. */
const lineIdsNamed = (name) =>
    new Set(
        Object.entries(lines)
            .filter(([, l]) => l.name === name)
            .map(([id]) => Number(id))
    );

/** 그 이름·그 노선의 역에 붙은 번호. */
function codeOf(stationName, lineName) {
    const ids = lineIdsNamed(lineName);
    for (const [stationId, entries] of Object.entries(doc.codes)) {
        const station = stations[stationId];
        if (!station || station.name !== stationName) continue;
        const hit = entries.find((e) => ids.has(e.line_id));
        if (hit) return `${hit.code} ${hit.number}`;
    }
    return null;
}

// 현장 사인 기준. 노선까지 함께 적는 이유는 위 주석과 같다.
const EXPECTED = [
    ['東京', '山手線', 'JY 01'],
    ['田端', '山手線', 'JY 09'],
    ['池袋', '山手線', 'JY 13'],
    ['新宿', '山手線', 'JY 17'],
    ['渋谷', '山手線', 'JY 20'],
    ['東京', '中央線', 'JC 01'],
    ['東京', '東海道線', 'JT 01'],
    ['品川', '東海道線', 'JT 03'],
    ['横浜', '根岸線', 'JK 12'],
    ['大船', '根岸線', 'JK 01'],
    ['東京', '4号線丸ノ内線', 'M 17'],
    ['新橋', '3号線銀座線', 'G 08'],
    ['浅草', '3号線銀座線', 'G 19'],
    ['上野', '2号線日比谷線', 'H 17'],
    ['新橋', '1号線浅草線', 'A 10'],
    ['新宿', '10号線新宿線', 'S 01'],
    ['池袋', '東上本線', 'TJ 01'],
    ['北千住', '伊勢崎線', 'TS 09'],
    ['新宿', '京王線', 'KO 01'],
];

for (const [station, line, want] of EXPECTED) {
    checks += 1;
    const got = codeOf(station, line);
    if (got !== want) fail(`${station} / ${line} — 기대 ${want}, 실제 ${got ?? '없음'}`);
}

const all = Object.values(doc.codes).flat();

// 한 기호 안에서 같은 번호가 두 역에 붙으면 둘 중 하나는 거짓이다.
checks += 1;
const byNumber = new Map();
for (const [stationId, entries] of Object.entries(doc.codes)) {
    for (const e of entries) {
        const key = `${e.code} ${e.number}`;
        if (!byNumber.has(key)) byNumber.set(key, new Set());
        byNumber.get(key).add(stationId);
    }
}
const clash = [...byNumber.entries()].filter(([, v]) => v.size > 1);
if (clash.length) fail(`같은 기호+번호가 여러 역에 붙었다: ${clash.slice(0, 5).map(([k]) => k).join(', ')}`);

// 신칸센 선로에는 재래선 번호를 붙이지 않는다.
checks += 1;
const shinkansen = new Set(
    Object.entries(lines)
        .filter(([, l]) => (l.name || '').includes('新幹線'))
        .map(([id]) => Number(id))
);
const onShinkansen = all.filter((e) => shinkansen.has(e.line_id));
if (onShinkansen.length) {
    fail(`신칸센 선로에 번호가 붙었다: ${onShinkansen.slice(0, 5).map((e) => `${e.code}${e.number}`).join(', ')}`);
}

// 실려 있는 역·노선이 실제로 우리 데이터에 있는가. 없는 id 를 가리키면 화면에서 조용히 빈다.
checks += 1;
const danglingStation = Object.keys(doc.codes).filter((id) => !stations[id]);
if (danglingStation.length) fail(`없는 역 id: ${danglingStation.slice(0, 5).join(', ')}`);
checks += 1;
const danglingLine = [...new Set(all.map((e) => e.line_id))].filter((id) => !lines[String(id)]);
if (danglingLine.length) fail(`없는 노선 id: ${danglingLine.slice(0, 5).join(', ')}`);

// 규모가 조용히 달라지면(원본 갱신·회귀) 알아야 한다.
checks += 1;
if (Object.keys(doc.codes).length !== doc._stations || all.length !== doc._pairs) {
    fail(`머리말과 내용이 다르다 — 머리말 ${doc._stations}역/${doc._pairs}쌍, 내용 ${Object.keys(doc.codes).length}역/${all.length}쌍`);
}

// ODPT 는 출처 표기가 의무다.
checks += 1;
if (!doc._copyright || !doc._copyright.includes('公共交通オープンデータセンター')) {
    fail('_copyright 에 ODPT 표기가 없다 — 표기는 의무다');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건 (역 ${doc._stations.toLocaleString()} · 쌍 ${doc._pairs.toLocaleString()} · 기호 ${doc._line_codes.length}종)`);

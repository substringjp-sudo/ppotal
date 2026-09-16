/**
 * 코드에 적힌 값이 `rules.json` 과 같은가.
 *
 * 같은 뜻을 가진 값이 Kotlin 과 TypeScript 에 따로 적혀 있으면 언젠가 갈라진다.
 * 실제로 갈라졌다 — 이름이 같은 역을 걸어서 잇는 거리가 웹 1.5km, 앱 1.0km 였고,
 * 경로 고정물 396개 중 14개가 어긋났다.
 *
 * 도보 반경은 두 클라이언트가 이 파일을 **읽으므로** 갈라질 수 없다. 나머지는
 * 상수로 두는 편이 낫는 값이라(사람이 걷는 속도 따위) 여기서 맞대기만 한다.
 * 앱에도 같은 검증이 있다(`RailRulesTest`).
 *
 *   npm run verify:rules
 */
const fs = require('fs');
const path = require('path');

const transferWalk = require('../.verify/lib/transferWalk.js');
const routeSearch = require('../.verify/lib/routeSearch.js');

const rules = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'public', 'rail', 'rules.json'), 'utf8')
);

let failures = 0;
let checks = 0;
const same = (label, code, file) => {
    checks += 1;
    if (code !== file) {
        failures += 1;
        console.error(`  ✗ ${label} — 코드 ${code}, rules.json ${file}`);
    }
};

console.log('공유 값 검증');

const walk = rules.walk_transfer || {};
same('walk_transfer.same_name_max_km', routeSearch.MAX_WALK_TRANSFER_KM, walk.same_name_max_km);
same('walk_transfer.nearby_max_km', routeSearch.MAX_NEARBY_TRANSFER_KM, walk.nearby_max_km);

const time = rules.transfer_time || {};
same('transfer_time.speed_mps', transferWalk.SPEED_MPS, time.speed_mps);
same('transfer_time.detour_factor', transferWalk.DETOUR_FACTOR, time.detour_factor);
same('transfer_time.level_change_minutes', transferWalk.LEVEL_CHANGE_MINUTES, time.level_change_minutes);
same('transfer_time.crossing_degrees', transferWalk.CROSSING_DEGREES, time.crossing_degrees);
same('transfer_time.min_minutes', transferWalk.MIN_MINUTES, time.min_minutes);
same('transfer_time.reference_minutes', transferWalk.REFERENCE_MINUTES, time.reference_minutes);
same('transfer_time.max_factor', transferWalk.MAX_FACTOR, time.max_factor);

const repair = rules.graph_repair || {};
same('graph_repair.max_joint_chain_sections', routeSearch.MAX_JOINT_CHAIN, repair.max_joint_chain_sections);
same('graph_repair.max_junction_chain_km', routeSearch.MAX_JUNCTION_CHAIN_KM, repair.max_junction_chain_km);
same('graph_repair.max_junction_chain_sections', routeSearch.MAX_JUNCTION_CHAIN_SECTIONS, repair.max_junction_chain_sections);

// 일부러 나누지 않는 값은 적어 두기만 한다. 적어 두지 않으면 "왜 여기 없지"가 반복된다.
checks += 1;
if (!rules._not_shared || !rules._not_shared.route_weights) {
    failures += 1;
    console.error('  ✗ _not_shared.route_weights 설명이 없다 — 왜 안 나누는지 적어 두어야 한다');
}

if (failures > 0) {
    console.error(`\n검증 실패 — ${checks}건 중 ${failures}건`);
    process.exit(1);
}
console.log(`검증 통과 — ${checks}건`);

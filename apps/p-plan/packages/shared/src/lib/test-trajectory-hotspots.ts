/**
 * trajectory-hotspots.ts 검증 하네스 (수동 실행).
 *
 * 이 레포엔 테스트 러너가 없어서 독립 스크립트로 둔다 — lib/test-firestore.ts와 같은 관례.
 * 실행(apps/p-plan에서):
 *
 *     npx -y tsx@latest packages/shared/src/lib/test-trajectory-hotspots.ts
 *
 * (node --experimental-strip-types는 확장자 없는 상대 import를 못 찾는다. 이 패키지는
 *  moduleResolution: "node"라 확장자를 붙이면 tsc가 거부하므로 tsx로 돌린다.)
 *
 * PATHWALK가 이 알고리즘을 Kotlin으로 옮긴 뒤(PATHWALK_HOTSPOT_HANDOFF.md 참고)
 * **같은 궤적으로 같은 결과가 나오는지** 대조하는 것이 이 파일의 주 용도다.
 * 기대값은 핸드오프 문서 §7에 표로 정리돼 있다.
 *
 * 지터가 난수라 실행할 때마다 소폭 흔들린다. 판정은 아래 세 가지가 핵심:
 *   · 1·4·8번이 "탐지 없음"인가 (오탐이 미탐보다 나쁘다)
 *   · 5번이 3개로 갈라지는가 (재방문 분리)
 *   · 6번 세 값이 서로 비슷한가 (표본 간격에 흔들리지 않는가 — 회귀 테스트)
 */
import { findTrajectoryHotspots, type TrajectorySample, type HotspotOptions } from './trajectory-hotspots';

const BASE = Date.parse('2026-05-01T09:00:00+09:00');
const LAT0 = 35.68;
const LNG0 = 139.76;
const M_LAT = 1 / 111_320;
const M_LNG = 1 / (111_320 * Math.cos((LAT0 * Math.PI) / 180));

const at = (sec: number) => new Date(BASE + sec * 1000).toISOString();

/** 기준점에서 (동쪽 dxM, 북쪽 dyM) 미터만큼 떨어진 표본 */
const pt = (sec: number, dxM: number, dyM: number, extra: Partial<TrajectorySample> = {}): TrajectorySample => ({
    timestamp: at(sec),
    lat: LAT0 + dyM * M_LAT,
    lng: LNG0 + dxM * M_LNG,
    accuracy: 12,
    ...extra,
});

function show(name: string, samples: TrajectorySample[], opts: HotspotOptions = {}) {
    const hs = findTrajectoryHotspots(samples, opts);
    console.log(`\n── ${name}  (표본 ${samples.length}개)`);
    if (hs.length === 0) {
        console.log('   핫스팟 없음');
        return hs;
    }
    const hhmm = (s: string) => new Date(s).toISOString().slice(11, 16);
    for (const h of hs) {
        console.log(
            `   ${hhmm(h.startAt)}~${hhmm(h.endAt)}  체류 ${h.dwellMinutes}분  ` +
            `봉우리 ${h.peakMinutes}분  반경 ${h.radiusMeters}m  확신 ${h.confidence}  표본 ${h.sampleCount}`,
        );
    }
    return hs;
}

// 1. 걸어서 통과 — 1.4m/s로 700m 직진. 탐지되면 안 된다.
const walkThrough: TrajectorySample[] = [];
for (let s = 0; s <= 500; s += 5) walkThrough.push(pt(s, s * 1.4, 0, { motion: 'walking' }));
show('1) 걸어서 통과 (700m 직진)', walkThrough);

// 2. 한자리 30분 체류 (GPS 지터 ±8m)
const stand: TrajectorySample[] = [];
for (let s = 0; s <= 1800; s += 5) {
    stand.push(pt(s, 300 + (Math.random() - 0.5) * 16, 300 + (Math.random() - 0.5) * 16, { motion: 'stationary' }));
}
show('2) 한자리 30분 체류', stand);

// 3. 넓은 장소 안을 40분간 배회 (반경 150m) — 반경으로는 못 잡는 케이스
const wander: TrajectorySample[] = [];
let wx = 0;
let wy = 0;
for (let s = 0; s <= 2400; s += 5) {
    wx += (Math.random() - 0.5) * 12;
    wy += (Math.random() - 0.5) * 12;
    const r = Math.hypot(wx, wy);
    if (r > 150) { wx *= 150 / r; wy *= 150 / r; }
    wander.push(pt(s, 1000 + wx, 1000 + wy, { motion: 'walking' }));
}
show('3) 넓은 장소 안 40분 배회 (반경 150m)', wander);

// 4. 차량 통과 + 신호 대기 3분 — 멈춰 섰어도 방문이 아니다
const drive: TrajectorySample[] = [];
let dx = 0;
for (let s = 0; s <= 200; s += 5) { drive.push(pt(s, dx, 0, { motion: 'automotive' })); dx += 15 * 5; }
for (let s = 205; s <= 385; s += 5) drive.push(pt(s, dx, 0, { motion: 'automotive' }));
for (let s = 390; s <= 590; s += 5) { dx += 15 * 5; drive.push(pt(s, dx, 0, { motion: 'automotive' })); }
show('4) 차량 통과 (중간 신호대기 3분)', drive);

// 5. 재방문 — A 25분 → B 25분 → A 25분. 공간은 같아도 시간이 다르면 다른 방문.
const revisit: TrajectorySample[] = [];
const stay = (t0: number, dur: number, x: number, y: number) => {
    for (let s = 0; s <= dur; s += 5) {
        revisit.push(pt(t0 + s, x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14, { motion: 'stationary' }));
    }
};
stay(0, 1500, 0, 0);
for (let s = 1505; s <= 1900; s += 5) revisit.push(pt(s, ((s - 1500) / 400) * 600, 0, { motion: 'walking' }));
stay(1905, 1500, 600, 0);
for (let s = 3410; s <= 3800; s += 5) revisit.push(pt(s, 600 - ((s - 3405) / 400) * 600, 0, { motion: 'walking' }));
stay(3805, 1500, 0, 0);
show('5) A(25분) → B(25분) → A 재방문(25분)', revisit);

// 6. 표본 간격이 달라도 같은 체류량이 나오는가 — GPS 지터 오인(핸드오프 §6-1) 회귀 테스트
for (const step of [5, 30, 120]) {
    const s6: TrajectorySample[] = [];
    for (let s = 0; s <= 1800; s += step) {
        s6.push(pt(s, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, { motion: 'stationary' }));
    }
    show(`6) 같은 30분 체류, 표본 간격 ${step}초`, s6);
}

// 7. GPS가 부정확할 때 — 탐지는 되되 확신도가 낮아야 한다
const noisy: TrajectorySample[] = [];
for (let s = 0; s <= 1800; s += 5) {
    noisy.push(pt(s, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, { motion: 'stationary', accuracy: 60 }));
}
show('7) 30분 체류, GPS 부정확(60m)', noisy);

// 8. 사진 몇 장 수준의 성긴 입력 — 이 알고리즘의 대상이 아님을 확인
show('8) 사진 4장 수준의 성긴 입력', [
    pt(0, 0, 0), pt(3600, 500, 200), pt(9000, 1200, 800), pt(14400, 2000, 300),
]);

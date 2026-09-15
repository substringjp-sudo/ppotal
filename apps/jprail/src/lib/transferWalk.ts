/**
 * 같은 역에서 노선을 갈아탈 때 실제로 얼마나 걸어야 하는지.
 *
 * 예전에는 환승 비용이 **상수 하나**였다. 그래서 新宿에서 丸ノ内線↔大江戸線으로 547m
 * 를 걸어 층을 오르내리는 환승과, 같은 승강장 건너편으로 28m 가는 환승이 라우터에게
 * **완전히 같은 값**이었다. 전국 812개 환승역 중 74곳이 200m 를 넘는데도 그랬다.
 *
 * 쓸 수 있는 재료는 이미 데이터에 있었다 — `platforms_meta.json` 의 **노선별 승강장
 * 좌표**와 `platforms_geom.json` 의 **승강장 선로 방향**이다.
 *
 * ## 층이 갈리는지 어떻게 아는가
 *
 * 데이터에 층 정보는 없다. 대신 **선로 방향**으로 가른다: 한 역에서 두 승강장의 선로가
 * 크게 엇갈리면, 그 둘은 같은 높이에 있을 수 없다 — 평면에서 만나면 선로가 서로 부딪
 * 힌다. 그러니 하나는 위, 하나는 아래다. 이건 추측이 아니라 물리적 제약이다.
 *
 * 반대는 성립하지 않는다. 나란한 두 선로도 위아래로 겹쳐 있을 수 있다(大手町의
 * 丸ノ内線↔三田線이 그렇다). 그런 곳은 각도로는 못 잡지만 **거리가 이미 멀어서**
 * 추정값이 충분히 커진다. 각도는 거리가 애매한 구간에서 정확도를 올리는 보조 신호다.
 *
 * ## 값이 맞는지
 *
 * 실제 데이터로 맞춰 본 결과다. 괄호는 널리 알려진 실제 소요 시간:
 *
 * | 환승 | 이 규칙 | 실제 |
 * |---|---|---|
 * | 新宿 丸ノ内線 ↔ 大江戸線 | 12.3분 | 10~12분 |
 * | 大手町 丸ノ内線 ↔ 三田線 | 8.7분 | 7~10분 |
 * | 池袋 西武池袋線 ↔ 東武東上線 | 7.7분 | 7분 남짓 |
 * | 渋谷 井の頭線 ↔ 東横線 | 6.5분 | 5~7분 |
 * | 東京 新幹線 ↔ 丸ノ内線 | 5.8분 | 5~8분 |
 *
 * 앱(jpApp 의 `domain/engine/TransferWalk.kt`)과 **같은 규칙·같은 상수**다.
 * 한쪽만 고치면 같은 환승이 기기마다 다른 시간으로 나온다.
 */

/**
 * 역 구내 보행 속도(m/s).
 *
 * 바깥을 걷는 속도(1.3~1.4)보다 느리게 잡는다. 사람이 많고, 모퉁이가 있고,
 * 개찰을 지나고, 표지를 보느라 선다.
 */
export const SPEED_MPS = 1.1;

/** 직선거리를 실제 걷는 거리로 부풀리는 배수. 통로는 벽을 뚫고 가지 않는다. */
export const DETOUR_FACTOR = 1.3;

/** 층을 오르내리는 데 더 드는 시간(분). 계단·에스컬레이터를 타고 기다리는 몫이다. */
export const LEVEL_CHANGE_MINUTES = 1.5;

/** 선로가 이만큼 엇갈리면 같은 높이에 있을 수 없다고 본다(도). */
export const CROSSING_DEGREES = 60;

/**
 * 아무리 가까워도 이만큼은 걸린다(분).
 *
 * 좌표가 같은 승강장도 있다(같은 섬식 승강장의 양쪽). 그래도 내려서 건너가는 데는
 * 시간이 든다. 0분이라고 하면 라우터가 환승을 공짜로 여긴다.
 */
export const MIN_MINUTES = 1.0;

/**
 * 비용 배수의 기준이 되는 "보통 환승"(분).
 *
 * 전국 환승 짝의 시간 중앙값이 1.06분이다. 그 보통 환승이 예전 상수와 거의 같은 값을
 * 갖도록 맞춰 둔다 — 그래야 이 변경이 **어려운 환승만** 비싸게 만들고, 쉬운 환승의
 * 기존 경로는 흔들지 않는다.
 */
export const REFERENCE_MINUTES = 1.0;

/**
 * 비용 배수의 상한.
 *
 * 없으면 라우터가 나쁜 환승 하나를 피하려고 수십 km 를 돌아간다. 환승이 아무리
 * 고약해도 그건 사용자가 바라는 답이 아니다.
 */
export const MAX_FACTOR = 8.0;

/** 승강장 하나. `bearingDeg` 는 선로 방향(0~180), 모르면 null. */
export interface TransferPlatform {
    id: string;
    lineId: number;
    lat: number;
    lon: number;
    bearingDeg: number | null;
}

/** 한 역 안에서 노선 `lineA` 와 `lineB` 를 갈아타는 데 드는 값. */
export interface TransferLink {
    stationId: string;
    lineA: number;
    lineB: number;
    distanceM: number;
    bearingDiffDeg: number | null;
    minutes: number;
}

/**
 * 걸어서 갈아타는 데 걸리는 시간(분).
 *
 * `bearingDiffDeg` 를 모르면(null) 층 이동을 더하지 않는다. 없는 정보로 벌점을 주면
 * 데이터가 빈 역이 부당하게 비싸진다.
 */
export function transferMinutes(distanceM: number, bearingDiffDeg: number | null): number {
    let m = (distanceM * DETOUR_FACTOR) / SPEED_MPS / 60;
    if (bearingDiffDeg !== null && bearingDiffDeg > CROSSING_DEGREES) {
        m += LEVEL_CHANGE_MINUTES;
    }
    return Math.max(MIN_MINUTES, m);
}

/**
 * 예전 상수 대비 몇 배로 무겁게 볼지.
 *
 * 라우터의 비용은 km 단위라 분을 그대로 넣을 수 없다. 대신 "보통 환승의 몇 배인가"를
 * 구해 기존 환승 벌점에 곱한다. 이렇게 하면 기존 상대 무게가 살아 있으면서 같은 조건
 * 안에서 어려운 환승이 비싸진다.
 */
export function transferCostFactor(minutes: number): number {
    return Math.min(MAX_FACTOR, Math.max(1, minutes / REFERENCE_MINUTES));
}

/**
 * 두 선로 방향의 차(0~90).
 *
 * 방향은 0~180 으로 들어온다(선로에 앞뒤가 없으므로). 170도와 10도는 20도 차이지
 * 160도 차이가 아니다.
 */
export function bearingDifference(a: number | null, b: number | null): number | null {
    if (a === null || b === null) return null;
    const d = Math.abs(a - b) % 180;
    return Math.min(d, 180 - d);
}

/** 폴리라인의 첫 점에서 끝 점으로 향하는 방향(0~180). 점이 하나뿐이면 null. */
export function bearingOf(points: [number, number][]): number | null {
    if (points.length < 2) return null;
    const [lat1, lon1] = points[0];
    const [lat2, lon2] = points[points.length - 1];
    if (lat1 === lat2 && lon1 === lon2) return null;
    const deg = (Math.atan2(lon2 - lon1, lat2 - lat1) * 180) / Math.PI;
    return ((deg % 180) + 180) % 180;
}

/** 노선 두 개를 순서 없이 묶는 키. */
export function linePairKey(a: number, b: number): string {
    return a <= b ? `${a}_${b}` : `${b}_${a}`;
}

/** 두 점 사이 거리(m). */
export function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const h =
        Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/**
 * 한 역의 승강장들에서 노선 짝마다 환승 값을 구한다.
 *
 * 같은 노선의 승강장이 여럿이면(상·하행이 따로 잡힌 경우) 짝을 만들지 않는다 — 같은
 * 노선을 갈아탄다고 하지 않는다. 노선 짝이 여러 승강장 조합으로 나오면 **가장 가까운
 * 조합**을 쓴다: 사람은 제일 가까운 길로 간다.
 */
export function transferLinksFor(
    stationId: string,
    platforms: TransferPlatform[]
): TransferLink[] {
    const best = new Map<string, TransferLink>();
    for (let i = 0; i < platforms.length; i += 1) {
        for (let j = i + 1; j < platforms.length; j += 1) {
            const a = platforms[i];
            const b = platforms[j];
            if (a.lineId === b.lineId) continue;
            const distance = distanceMetres(a.lat, a.lon, b.lat, b.lon);
            const diff = bearingDifference(a.bearingDeg, b.bearingDeg);
            const key = linePairKey(a.lineId, b.lineId);
            const prior = best.get(key);
            if (prior && prior.distanceM <= distance) continue;
            best.set(key, {
                stationId,
                lineA: a.lineId,
                lineB: b.lineId,
                distanceM: distance,
                bearingDiffDeg: diff,
                minutes: transferMinutes(distance, diff)
            });
        }
    }
    return [...best.values()];
}

/**
 * 갈아타며 걷는 시간을 사람이 읽는 말로.
 *
 * 1분 남짓은 적지 않는다 — 같은 승강장 건너편까지 "약 1분"이라고 적으면 정보가 아니라
 * 잡음이다. 분으로만 반올림한다: 초 단위는 추정값에 없는 정밀도다.
 */
export function formatTransferWalk(minutes: number, language: string): string | null {
    if (minutes < 1.5) return null;
    const n = Math.round(minutes);
    if (language === 'en') return `~${n} min walk`;
    if (language === 'ja') return `徒歩 約${n}分`;
    return `도보 약 ${n}분`;
}

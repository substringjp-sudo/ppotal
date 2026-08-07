/**
 * 궤적 → 체류 핫스팟 (누적 브러시 방식).
 *
 * 지나간 길을 "가운데는 진하고 멀어질수록 연해지는 반투명 붓"으로 칠한다고 생각하면 된다.
 * 스쳐 지나간 길은 얇게 한 번 칠해질 뿐이지만, 한자리에 머물거나 근처를 배회하면 같은
 * 칸이 반복해서 칠해져 진해진다. 진하게 칠해진 영역만 골라내면 그게 "머문 곳"이다.
 *
 * 왜 반경·시간 임계값 방식(clusterByTimeAndDistance)만으로는 부족한가:
 *   · 큰 공원 안에서 300m 걸어다닌 것과 300m 떨어진 다른 가게로 이동한 것을 거리로는 못 가른다
 *   · 한자리에 오래 머물면 반경은 좁지만, 배회하면 넓다 — 하나의 반경으로 둘 다 못 잡는다
 * 여기서는 "얼마나 멀리 갔나"가 아니라 "어디에 시간이 쌓였나"를 보므로 둘 다 자연히 풀린다.
 *
 * 설계상 중요한 두 가지:
 *
 * 1) 붓이 칠하는 것은 거리가 아니라 **시간**이다.
 *    GPS 표본 간격은 기기·배터리 상태에 따라 들쭉날쭉하다. 표본 개수로 세면 고주파로
 *    쏟아진 구간이 오래 머문 것처럼 보인다. 그래서 각 표본이 아니라 표본 사이 구간의
 *    경과 시간을 칠한다 — 표본이 100개든 3개든 10분은 10분으로 칠해진다.
 *
 * 2) 임계값은 **영역을 오려내는 데만** 쓰고, 진짜 판정은 그 영역에 쌓인 **총량**으로 한다.
 *    봉우리 높이로 판정하면 한자리에 선 사람만 걸리고 넓게 배회한 사람은 놓친다(칠이
 *    넓게 퍼져 봉우리가 낮아지니까). 총량은 퍼짐과 무관하게 보존되므로 둘 다 잡힌다.
 *
 * 이 모듈은 순수 함수다 — 지도 API도, 네트워크도, 브라우저 API도 쓰지 않는다.
 * 기기 안에서 전부 계산할 수 있으므로, 찾아낸 핫스팟 안의 장소만 나중에 조회하면 된다.
 */
import type { ActivityType } from '../types/record';

/** 궤적 표본 하나 — 정제(칼만/이상치 제거)를 마친 뒤의 좌표를 넣는다. */
export interface TrajectorySample {
    timestamp: string;   // ISO
    lat: number;
    lng: number;
    /** GPS 오차 반경(m). 붓의 굵기를 정한다 — 부정확할수록 넓고 흐리게 칠해진다. */
    accuracy?: number;
    /** m/s. 없으면 앞뒤 표본으로 추정한다. */
    speed?: number;
    /** 이미 판정된 이동 상태가 있으면 속도 추정보다 우선한다. */
    motion?: ActivityType;
}

export interface HotspotOptions {
    /** 격자 한 칸의 크기(m) */
    cellMeters?: number;
    /** 이만큼은 시간이 쌓여야 "머문 곳"으로 본다(분) */
    minDwellMinutes?: number;
    /** 이보다 긴 공백은 궤적이 끊긴 것으로 보고 그 사이를 칠하지 않는다(분) */
    maxGapMinutes?: number;
    /** 같은 자리를 이만큼 비웠다가 돌아오면 별개의 방문으로 나눈다(분) */
    revisitGapMinutes?: number;
    /** 붓의 최소 굵기(m) — GPS가 아무리 정확하다고 보고해도 이보다 좁게는 안 칠한다 */
    minAccuracyMeters?: number;
    /** 이보다 부정확한 표본은 아예 버린다(m) */
    maxAccuracyMeters?: number;
    /**
     * 그냥 걸어서 지나갈 때 쌓이는 양의 몇 배를 임계값으로 삼을지.
     * 높일수록 확실한 체류만 남고, 낮출수록 짧은 들름도 잡힌다.
     */
    separationFactor?: number;
}

export interface Hotspot {
    /** 칠해진 농도로 가중한 중심 좌표 */
    lat: number;
    lng: number;
    /** 이 방문에 쌓인 실효 체류 시간(분) — 이동 상태 가중치가 반영된 값 */
    dwellMinutes: number;
    /**
     * 영역에서 가장 진한 칸의 값(분). 한자리에 붙어 있었는지, 넓게 배회했는지를 말해준다.
     * 같은 영역을 여러 번 방문한 경우 방문들이 이 값을 공유한다(영역 단위 지표라서).
     */
    peakMinutes: number;
    /** 임계값을 넘은 영역을 원으로 환산한 반경(m) */
    radiusMeters: number;
    startAt: string;
    endAt: string;
    /** 이 방문에 속한 표본 수 */
    sampleCount: number;
    /** 0~1 — 정말 "머문 곳"인지에 대한 확신. 체류량·집중도·GPS 품질을 합친 값. */
    confidence: number;
}

const METERS_PER_DEG_LAT = 111_320;
const WALKING_SPEED_MPS = 1.4;
/** 한 구간을 이보다 잘게 쪼개지는 않는다 — 긴 이동 구간에서 계산이 폭발하는 걸 막는다 */
const MAX_STEPS_PER_SEGMENT = 400;
/** 이보다 빠르면 GPS 튐으로 보고 그 구간은 칠하지 않는다(m/s, ≈288km/h) */
const IMPLAUSIBLE_SPEED_MPS = 80;

/**
 * 이동 상태별 붓의 진하기.
 *
 * 걷기를 크게 깎지 않는 게 중요하다 — 넓은 장소 안을 돌아다니는 것도 엄연한 체류다.
 * "통과"와 "배회"는 이 가중치가 아니라 격자 누적이 알아서 가른다(통과는 선으로 얇게
 * 흩어지고, 배회는 같은 동네에 반복해서 쌓인다). 반면 차량은 신호 대기로 멈춰 서도
 * 방문이 아니므로 확실히 죽인다.
 */
const MOTION_WEIGHT: Record<ActivityType, number> = {
    stationary: 1,
    walking: 0.85,
    running: 0.4,
    cycling: 0.25,
    automotive: 0.05,
    unknown: 0.85,
};

function weightFromSpeed(mps: number): number {
    if (mps < 0.5) return MOTION_WEIGHT.stationary;
    if (mps < 2.0) return MOTION_WEIGHT.walking;
    if (mps < 4.0) return MOTION_WEIGHT.running;
    if (mps < 8.0) return MOTION_WEIGHT.cycling;
    return MOTION_WEIGHT.automotive;
}

/**
 * 표본의 붓 진하기. 이동 상태 태그가 있으면 그걸 믿되, 실제로 움직인 거리로 한 번 더
 * 검증한다 — 60초에 500m를 갔다면 태그가 뭐라고 하든 서 있던 게 아니다.
 */
function sampleWeight(s: TrajectorySample, impliedSpeedMps: number): number {
    const tagged = s.motion ? MOTION_WEIGHT[s.motion] : undefined;
    const own = s.speed != null ? weightFromSpeed(s.speed) : undefined;
    const implied = weightFromSpeed(impliedSpeedMps);
    return Math.min(tagged ?? implied, own ?? implied, implied);
}

interface Projector {
    x(lng: number): number;
    y(lat: number): number;
    lng(x: number): number;
    lat(y: number): number;
}

/**
 * 기준점 주변을 평면으로 편다(등거리 원통 근사). 도시 하나 규모에서는 오차가 무시할
 * 수준이고, 격자 계산을 전부 미터 단위로 할 수 있어 훨씬 단순해진다.
 */
function makeProjector(refLat: number, refLng: number): Projector {
    const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((refLat * Math.PI) / 180);
    return {
        x: (lng) => (lng - refLng) * mPerDegLng,
        y: (lat) => (lat - refLat) * METERS_PER_DEG_LAT,
        lng: (x) => refLng + x / mPerDegLng,
        lat: (y) => refLat + y / METERS_PER_DEG_LAT,
    };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 궤적을 받아 "머문 곳" 후보를 돌려준다.
 * 표본이 성기거나(사진 몇 장 수준) 좌표가 없으면 빈 배열이 나온다 — 이 알고리즘은
 * 시간축을 따라 관측이 쌓여야 의미가 있으므로, 그런 입력은 애초에 대상이 아니다.
 */
export function findTrajectoryHotspots(
    samples: TrajectorySample[],
    opts: HotspotOptions = {},
): Hotspot[] {
    const cell = opts.cellMeters ?? 10;
    const minDwellMinutes = opts.minDwellMinutes ?? 8;
    const maxGapMs = (opts.maxGapMinutes ?? 20) * 60_000;
    const revisitGapMs = (opts.revisitGapMinutes ?? 30) * 60_000;
    const minSigma = opts.minAccuracyMeters ?? 12;
    const maxSigma = opts.maxAccuracyMeters ?? 100;
    const separationFactor = opts.separationFactor ?? 3;

    const usable = samples
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .filter((s) => s.accuracy == null || s.accuracy <= maxSigma)
        .map((s) => ({ s, t: Date.parse(s.timestamp) }))
        .filter((e) => Number.isFinite(e.t))
        .sort((a, b) => a.t - b.t);

    if (usable.length < 2) return [];

    const proj = makeProjector(usable[0].s.lat, usable[0].s.lng);
    const pts = usable.map(({ s, t }) => ({
        s,
        t,
        x: proj.x(s.lng),
        y: proj.y(s.lat),
        sigma: clamp(s.accuracy ?? minSigma, minSigma, maxSigma),
    }));

    // ── 1. 붓질: 시간을 격자에 칠한다 ────────────────────────────
    const grid = new Map<string, number>();          // 칸 → 쌓인 초
    const shareSec = new Array<number>(pts.length).fill(0);  // 표본별 실효 시간 지분(초)
    const key = (cx: number, cy: number) => `${cx}:${cy}`;

    const paint = (px: number, py: number, massSec: number, sigma: number) => {
        if (massSec <= 0) return;
        const radius = Math.max(cell, 2 * sigma);
        const x0 = Math.floor((px - radius) / cell);
        const x1 = Math.floor((px + radius) / cell);
        const y0 = Math.floor((py - radius) / cell);
        const y1 = Math.floor((py + radius) / cell);

        // 커널을 격자 위에서 직접 정규화한다 — 그래야 붓이 굵어져도(오차가 커도)
        // 총량이 보존되고 봉우리만 낮아진다. 즉 부정확한 표본은 저절로 약한 증거가 된다.
        const hits: { cx: number; cy: number; k: number }[] = [];
        let sum = 0;
        const twoSigmaSq = 2 * sigma * sigma;
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const dx = (cx + 0.5) * cell - px;
                const dy = (cy + 0.5) * cell - py;
                const d2 = dx * dx + dy * dy;
                if (d2 > radius * radius) continue;
                const k = Math.exp(-d2 / twoSigmaSq);
                hits.push({ cx, cy, k });
                sum += k;
            }
        }
        if (sum <= 0) {
            const k0 = key(Math.floor(px / cell), Math.floor(py / cell));
            grid.set(k0, (grid.get(k0) ?? 0) + massSec);
            return;
        }
        for (const h of hits) {
            const kk = key(h.cx, h.cy);
            grid.set(kk, (grid.get(kk) ?? 0) + (massSec * h.k) / sum);
        }
    };

    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dtMs = b.t - a.t;
        if (dtMs <= 0 || dtMs > maxGapMs) continue;   // 끊긴 구간은 잇지 않는다

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const dtSec = dtMs / 1000;
        if (dist / dtSec > IMPLAUSIBLE_SPEED_MPS) continue;  // GPS 튐

        // 속도를 판정할 땐 GPS 오차만큼을 빼고 본다. 가만히 서 있어도 좌표는 오차 반경
        // 안에서 계속 흔들리는데, 표본 간격이 촘촘할수록 그 흔들림이 큰 속도로 환산돼
        // (5초에 9m = 1.8m/s) 서 있는 사람이 걷거나 뛰는 걸로 잡힌다. 그러면 표본이
        // 많을수록 체류가 깎이는 역전이 생긴다 — 정보가 가장 많을 때 결과가 가장 나빠진다.
        const noiseFloor = (a.sigma + b.sigma) / 2;
        const impliedSpeed = Math.max(0, dist - noiseFloor) / dtSec;

        const w = Math.min(sampleWeight(a.s, impliedSpeed), sampleWeight(b.s, impliedSpeed));

        // 표본이 성겨도 그 사이를 지나간 건 사실이므로 선을 따라 나눠 칠한다.
        // 이렇게 해야 표본 간격이 벌어진 이동 구간이 "뚝뚝 떨어진 체류"로 보이지 않는다.
        const steps = clamp(Math.ceil(dist / cell), 1, MAX_STEPS_PER_SEGMENT);
        const massPerStep = (dtSec * w) / steps;
        for (let k = 0; k < steps; k++) {
            const f = (k + 0.5) / steps;
            paint(a.x + dx * f, a.y + dy * f, massPerStep, a.sigma + (b.sigma - a.sigma) * f);
        }

        // 시간 지분은 양 끝 표본이 절반씩 나눠 갖는다(나중에 방문별 체류량을 낼 때 쓴다)
        shareSec[i] += (dtSec * w) / 2;
        shareSec[i + 1] += (dtSec * w) / 2;
    }

    if (grid.size === 0) return [];

    // ── 2. 임계값: "그냥 걸어 지나갔을 때"보다 얼마나 진한가 ──────
    //
    // 속도 v로 지나가면 한 칸에 쌓이는 양은 w·cell² / (v·σ·√(2π))로 수렴한다
    // (경로에 수직인 가우시안을 경로 방향으로 적분한 값). 이 값을 기준선으로 삼으면
    // 격자 크기나 GPS 품질이 달라져도 임계값이 함께 움직여 손댈 필요가 없다.
    //
    // w는 가능한 최대치(1)로 잡는다 — 표본이 촘촘하면 걷는 중에도 변위가 오차 이하라
    // 정지로 분류돼 만점 가중치로 칠해지기 때문이다. 최악의 경우를 기준선으로 삼아야
    // 통과 구간이 임계값을 넘지 않는다.
    const sigmas = pts.map((p) => p.sigma).sort((a, b) => a - b);
    const refSigma = sigmas[Math.floor(sigmas.length / 2)];
    const walkThroughPerCell =
        (cell * cell) / (WALKING_SPEED_MPS * refSigma * Math.sqrt(2 * Math.PI));
    const thresholdSec = walkThroughPerCell * separationFactor;

    const hot = new Map<string, number>();
    for (const [k, v] of grid) if (v >= thresholdSec) hot.set(k, v);
    if (hot.size === 0) return [];

    // ── 3. 진한 칸들을 이어붙여 영역으로 (연결 요소 탐색) ────────
    const regionOf = new Map<string, number>();
    const regions: { cells: string[]; mass: number; peak: number }[] = [];

    for (const start of hot.keys()) {
        if (regionOf.has(start)) continue;
        const id = regions.length;
        const cells: string[] = [];
        let mass = 0;
        let peak = 0;
        const stack = [start];
        regionOf.set(start, id);
        while (stack.length) {
            const cur = stack.pop()!;
            const [cxs, cys] = cur.split(':');
            const cx = Number(cxs);
            const cy = Number(cys);
            const v = hot.get(cur)!;
            cells.push(cur);
            mass += v;
            if (v > peak) peak = v;
            for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
                const nk = key(nx, ny);
                if (hot.has(nk) && !regionOf.has(nk)) {
                    regionOf.set(nk, id);
                    stack.push(nk);
                }
            }
        }
        regions.push({ cells, mass, peak });
    }

    // ── 4. 영역별 중심·반경 ──────────────────────────────────────
    const geometry = regions.map((r) => {
        let wx = 0;
        let wy = 0;
        let wsum = 0;
        for (const c of r.cells) {
            const [cxs, cys] = c.split(':');
            const v = hot.get(c)!;
            wx += ((Number(cxs) + 0.5) * cell) * v;
            wy += ((Number(cys) + 0.5) * cell) * v;
            wsum += v;
        }
        const area = r.cells.length * cell * cell;
        return {
            lat: proj.lat(wy / wsum),
            lng: proj.lng(wx / wsum),
            radiusMeters: Math.round(Math.sqrt(area / Math.PI)),
        };
    });

    // ── 5. 같은 영역이라도 다시 찾아왔으면 다른 방문이다 ─────────
    //
    // 격자는 오전에 들른 것과 저녁에 다시 들른 것을 한 덩어리로 합쳐 놓는다.
    // 표본을 시간순으로 훑어 공백이 크면 끊어, 공간은 같지만 시간이 다른 방문으로 나눈다.
    const byRegion = new Map<number, number[]>();   // 영역 → 표본 인덱스들
    pts.forEach((p, i) => {
        const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
        const rid = regionOf.get(k);
        if (rid == null) return;
        if (!byRegion.has(rid)) byRegion.set(rid, []);
        byRegion.get(rid)!.push(i);
    });

    const out: Hotspot[] = [];
    for (const [rid, idxs] of byRegion) {
        const region = regions[rid];
        const geo = geometry[rid];
        const peakMinutes = region.peak / 60;

        let visit: number[] = [];
        const flush = () => {
            if (visit.length === 0) return;
            const dwellSec = visit.reduce((s, i) => s + shareSec[i], 0);
            const dwellMinutes = dwellSec / 60;
            if (dwellMinutes < minDwellMinutes) { visit = []; return; }

            const accs = visit.map((i) => pts[i].sigma).sort((a, b) => a - b);
            const medianAcc = accs[Math.floor(accs.length / 2)];

            // 얼마나 오래(dwell), 얼마나 좁은 데 뭉쳤고(concentration),
            // GPS는 얼마나 믿을 만했나(fix) — 셋을 합쳐 확신도로 쓴다.
            const dwellScore = dwellMinutes / (dwellMinutes + minDwellMinutes);
            const concentration = clamp(region.peak / (thresholdSec * 4), 0, 1);
            const fixQuality = maxSigma > minSigma
                ? clamp(1 - (medianAcc - minSigma) / (maxSigma - minSigma), 0, 1)
                : 1;

            out.push({
                lat: geo.lat,
                lng: geo.lng,
                dwellMinutes: Math.round(dwellMinutes * 10) / 10,
                peakMinutes: Math.round(peakMinutes * 10) / 10,
                radiusMeters: geo.radiusMeters,
                startAt: pts[visit[0]].s.timestamp,
                endAt: pts[visit[visit.length - 1]].s.timestamp,
                sampleCount: visit.length,
                confidence: Math.round((0.5 * dwellScore + 0.3 * concentration + 0.2 * fixQuality) * 100) / 100,
            });
            visit = [];
        };

        for (const i of idxs) {
            if (visit.length && pts[i].t - pts[visit[visit.length - 1]].t > revisitGapMs) flush();
            visit.push(i);
        }
        flush();
    }

    return out.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

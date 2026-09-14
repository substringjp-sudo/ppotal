/**
 * 주행 기록을 시간순으로 되짚는 애니메이션의 계산 부분.
 *
 * 그리기와 녹화에서 완전히 떼어 놓았다. 화면이 없어도 시험할 수 있어야 하기
 * 때문이다(`scripts/verify_trip_animation.ts`).
 *
 * 안드로이드 앱(jpApp)의 `TripAnimation` 과 같은 규칙을 따른다. 두 쪽이 갈라지면
 * 같은 기록에서 다른 영상이 나온다.
 */

const EARTH_RADIUS_KM = 6371.0088;

/** 한 획으로 그려질 여정. `geometries` 는 `[경도, 위도]` 점들의 폴리라인 묶음이다. */
export interface ReplayTrip {
    id: string;
    name: string;
    /** `YYYY-MM-DD`. 화면 한쪽에 띄운다. */
    date: string;
    /** `#RRGGBB`. */
    color: string;
    /** 날짜가 같을 때의 순서. 보통 기록된 시각에서 온다. */
    order: number;
    geometries: [number, number][][];
}

export interface GeoBounds {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
}

/** 어느 순간에 무엇을 그려야 하는지. */
export interface AnimationFrame {
    /** 이 개수만큼은 이미 다 그려졌다. */
    completedCount: number;
    /** 지금 그려지는 중인 획의 자리. 없으면 -1. */
    drawingIndex: number;
    /** 그 획이 얼마나 그려졌는지(0~1). */
    progress: number;
    /** 화면 한쪽에 띄울 날짜. */
    date: string;
    elapsedMs: number;
    isFinished: boolean;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * 애니메이션에서 그려질 한 획.
 *
 * 여정 하나가 획 하나다. 길이에 상관없이 모두 같은 시간 동안 그려진다 — 그래야
 * 전체 길이가 `획 수 × 한 획 시간` 으로 예측되고, 속도 조절이 그대로 길이 조절이 된다.
 *
 * 누적 거리를 미리 재 둔다. 프레임마다 다시 재면 초당 60번 폴리라인 전체를 훑게 된다.
 */
export class AnimationStroke {
    /** 폴리라인마다, 각 점까지의 누적 거리. */
    private readonly cumulative: number[][];
    /** 각 폴리라인이 시작되는 지점까지의 전체 누적 거리. */
    private readonly offsets: number[];
    readonly totalLengthKm: number;

    constructor(
        readonly tripId: string,
        readonly date: string,
        readonly name: string,
        readonly color: string,
        readonly geometries: [number, number][][]
    ) {
        this.cumulative = geometries.map(line => {
            const marks = new Array<number>(line.length).fill(0);
            for (let i = 1; i < line.length; i += 1) {
                marks[i] = marks[i - 1] + distanceKm(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
            }
            return marks;
        });

        this.offsets = new Array<number>(geometries.length).fill(0);
        let running = 0;
        for (let i = 0; i < geometries.length; i += 1) {
            this.offsets[i] = running;
            const marks = this.cumulative[i];
            running += marks.length > 0 ? marks[marks.length - 1] : 0;
        }
        this.totalLengthKm = running;
    }

    /**
     * 획의 앞에서부터 [progress] 만큼만 잘라 낸다.
     *
     * 다 그려진 폴리라인은 통째로, 그려지는 중인 하나는 중간을 끊어 점을 하나 끼운다.
     * 끊긴 자리가 선분 중간이면 두 점 사이를 비례로 나눈다 — 그래야 선이 한 점씩
     * 튀지 않고 매끄럽게 자란다.
     */
    partial(progress: number): [number, number][][] {
        if (progress >= 1) return this.geometries;
        if (progress <= 0 || this.totalLengthKm <= 0) return [];

        const target = this.totalLengthKm * progress;
        const out: [number, number][][] = [];

        for (let i = 0; i < this.geometries.length; i += 1) {
            const line = this.geometries[i];
            const marks = this.cumulative[i];
            const lineLength = marks.length > 0 ? marks[marks.length - 1] : 0;
            const start = this.offsets[i];

            if (start + lineLength <= target) {
                out.push(line);
                continue;
            }
            if (start >= target) break;

            const within = target - start;
            const cut: [number, number][] = [];
            for (let j = 0; j < line.length; j += 1) {
                if (marks[j] <= within) {
                    cut.push(line[j]);
                    continue;
                }
                // 이 선분 중간에서 끊긴다. 앞 점과 이 점 사이를 비례로 나눈다.
                const prev = line[j - 1];
                const span = marks[j] - marks[j - 1];
                const ratio = span <= 0 ? 0 : (within - marks[j - 1]) / span;
                cut.push([
                    prev[0] + (line[j][0] - prev[0]) * ratio,
                    prev[1] + (line[j][1] - prev[1]) * ratio
                ]);
                break;
            }
            if (cut.length >= 2) out.push(cut);
            break;
        }
        return out;
    }
}

/** 기본 한 획 시간. 1초 안쪽이어야 지도가 채워지는 리듬이 산다. */
export const DEFAULT_STROKE_MS = 700;
/** 조절 하한. 이보다 빠르면 눈이 못 따라간다. */
export const MIN_STROKE_MS = 120;
/** 조절 상한. */
export const MAX_STROKE_MS = 2500;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * 탄 날을 모르는 여정을 늘어놓을 순서.
 *
 * 이름순이나 id 순으로 놓으면 없는 의미가 생긴다("ㄱ부터 탔나?"). 그렇다고 매번 다시
 * 섞으면 미리 본 것과 저장한 영상의 순서가 달라진다. 그래서 **id 에서 뽑은 값으로
 * 섞는다** — 보기에는 무작위고, 같은 기록이면 언제 돌려도 같은 순서다.
 *
 * 앱(jpApp)의 `TripAnimation.shuffleKey` 와 같은 계산(FNV-1a 32비트)이다.
 */
export function shuffleKey(id: string): number {
    let hash = 2166136261;
    for (let i = 0; i < id.length; i += 1) {
        hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
}

/**
 * 주행 기록을 시간순으로 되짚는 애니메이션.
 *
 * 꺼진 일본 지도 위에 여정이 하나씩 그려지며 색이 쌓인다. 먼저 그려진 획은 그대로
 * 남는다 — 지도가 채워지는 과정 자체가 이 화면의 내용이기 때문이다.
 */
export class TripAnimation {
    readonly strokeDurationMs: number;
    readonly totalDurationMs: number;
    /** 획 i 까지 다 그렸을 때 쌓이는 거리. `prefixKm[0]` 은 0 이다. */
    private readonly prefixKm: number[];

    constructor(readonly strokes: AnimationStroke[], strokeDurationMs: number = DEFAULT_STROKE_MS) {
        this.strokeDurationMs = Math.round(clamp(strokeDurationMs, MIN_STROKE_MS, MAX_STROKE_MS));
        this.totalDurationMs = strokes.length * this.strokeDurationMs;

        this.prefixKm = new Array<number>(strokes.length + 1).fill(0);
        for (let i = 0; i < strokes.length; i += 1) {
            this.prefixKm[i + 1] = this.prefixKm[i] + strokes[i].totalLengthKm;
        }
    }

    get isEmpty(): boolean {
        return this.strokes.length === 0;
    }

    /** 다 그렸을 때 지도에 칠해질 거리. */
    get totalLengthKm(): number {
        return this.prefixKm[this.prefixKm.length - 1];
    }

    /** 화면에 나올 날짜의 범위. 미리보기에 쓴다. */
    get dateRange(): [string, string] | null {
        if (this.strokes.length === 0) return null;
        return [this.strokes[0].date, this.strokes[this.strokes.length - 1].date];
    }

    /**
     * 획은 그대로 두고 속도만 바꾼다.
     *
     * 슬라이더를 움직일 때마다 좌표를 다시 재면 전국 기록에서는 손가락을 따라오지 못한다.
     */
    withStrokeDuration(ms: number): TripAnimation {
        return new TripAnimation(this.strokes, ms);
    }

    /** 지금 이 순간까지 지도에 칠해진 거리. 화면에 숫자가 같이 올라가야 지도가 읽힌다. */
    paintedLengthKm(frame: AnimationFrame): number {
        const done = this.prefixKm[clamp(frame.completedCount, 0, this.strokes.length)];
        const drawing = frame.drawingIndex;
        if (drawing < 0 || drawing >= this.strokes.length) return done;
        return done + this.strokes[drawing].totalLengthKm * frame.progress;
    }

    /**
     * 칠해질 획들이 차지하는 지리 범위.
     *
     * 지도를 전국이 아니라 내 기록에 맞춰 당겨 볼 때 쓴다. 기록이 간토에만 있으면
     * 전국 축척에서는 획이 손톱만 하게 나온다.
     */
    bounds(): GeoBounds | null {
        let minLat = Infinity;
        let minLon = Infinity;
        let maxLat = -Infinity;
        let maxLon = -Infinity;
        let seen = false;

        for (const stroke of this.strokes) {
            for (const line of stroke.geometries) {
                for (const point of line) {
                    const lon = point[0];
                    const lat = point[1];
                    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
                    if (lat < minLat) minLat = lat;
                    if (lat > maxLat) maxLat = lat;
                    if (lon < minLon) minLon = lon;
                    if (lon > maxLon) maxLon = lon;
                    seen = true;
                }
            }
        }
        return seen ? { minLat, minLon, maxLat, maxLon } : null;
    }

    frameAt(elapsedMs: number): AnimationFrame {
        if (this.strokes.length === 0) {
            return { completedCount: 0, drawingIndex: -1, progress: 0, date: '', elapsedMs: 0, isFinished: true };
        }
        if (elapsedMs >= this.totalDurationMs) {
            return {
                completedCount: this.strokes.length,
                drawingIndex: -1,
                progress: 1,
                date: this.strokes[this.strokes.length - 1].date,
                elapsedMs: this.totalDurationMs,
                isFinished: true
            };
        }
        const clamped = Math.max(0, elapsedMs);
        // 모든 획이 같은 시간을 쓰므로 나눗셈 한 번으로 자리를 찾는다.
        const index = clamp(Math.floor(clamped / this.strokeDurationMs), 0, this.strokes.length - 1);
        const into = clamped - index * this.strokeDurationMs;
        return {
            completedCount: index,
            drawingIndex: index,
            progress: clamp(into / this.strokeDurationMs, 0, 1),
            date: this.strokes[index].date,
            elapsedMs: clamped,
            isFinished: false
        };
    }

    /**
     * 여정에서 애니메이션을 만든다.
     *
     * 선로 좌표가 없는 여정은 그릴 것이 없으므로 뺀다. 날짜가 같으면 기록된 순서를 따른다.
     *
     * **탄 날을 모르는 여정은 맨 뒤로 보낸다.** 날짜가 없다고 맨 앞에 놓으면 시간순이라는
     * 이 화면의 전제가 첫 장면부터 깨진다. 대신 다 지나간 뒤에 섞어서 붙인다.
     */
    static build(trips: ReplayTrip[], strokeDurationMs: number = DEFAULT_STROKE_MS): TripAnimation {
        const drawable = trips.filter(trip => trip.geometries.some(line => line.length >= 2));
        const dated = drawable
            .filter(trip => trip.date.trim() !== '')
            .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
        const undated = drawable
            .filter(trip => trip.date.trim() === '')
            .sort((a, b) => shuffleKey(a.id) - shuffleKey(b.id));
        const ordered = dated.concat(undated);

        const strokes = ordered.map(trip => new AnimationStroke(
            trip.id,
            trip.date,
            trip.name,
            trip.color,
            trip.geometries.filter(line => line.length >= 2)
        ));
        return new TripAnimation(strokes, strokeDurationMs);
    }
}

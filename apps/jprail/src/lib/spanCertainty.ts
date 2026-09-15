/**
 * 그린 구간에서 **기억한 역**과 **앱이 채운 역**을 가르는 규칙.
 *
 * 손가락(커서)이 스친 역만 기억한 역이다. 건너뛴 자리는 앱이 채운 것이라 점선으로
 * 그리고 "흐림"으로 센다. 기억한 것과 지어낸 것을 섞지 않는다 — 기록에 경로만이 아니라
 * **어디까지가 확실했는지**가 같이 남는다. 내비게이션은 이걸 남길 이유가 없고, 기록하는
 * 앱만 남길 수 있다.
 *
 * ## 점이 아니라 자취로 잰다
 *
 * 스쳤는지를 **찍힌 점**으로 재면 같은 길도 빨리 그으면 흐려지고 천천히 그으면 확실해진다
 * — 이벤트가 얼마나 자주 오느냐에 답이 달라진다. 선분과의 거리로 재면 속도와 무관해진다.
 *
 * 그리고 자취 **전체**를 봐야 한다. 구간이 자라기 전에 커서가 이미 지나가 버린 역이 있어서,
 * 직전 한 칸만 보면 그런 역은 영영 스친 것으로 세지 못한다. 그래서 **새로 붙은 역은 자취
 * 전체와** 견주고, 이미 있던 역은 마지막 칸만 본다.
 *
 * 앱(jpApp 의 `domain/engine/SpanDrawing.kt`)과 같은 규칙이다.
 */

export interface Point {
    x: number;
    y: number;
}

/** 커서가 역에서 이만큼 안으로 지나가면 "스쳤다"고 본다(px). */
export const TOUCH_RADIUS_PX = 24;

/** 점에서 선분까지의 거리. 선분이 한 점이면 그 점까지의 거리다. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    const length = vx * vx + vy * vy;
    const t = length <= 0 ? 0 : Math.min(1, Math.max(0, (wx * vx + wy * vy) / length));
    return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

/** 자취 어딘가를 스쳤는가. 자취가 한 점뿐이면 그 점까지의 거리로 본다. */
export function nearTrail(p: Point, trail: Point[], radiusPx: number): boolean {
    if (trail.length === 0) return false;
    if (trail.length === 1) return Math.hypot(p.x - trail[0].x, p.y - trail[0].y) <= radiusPx;
    for (let i = 1; i < trail.length; i += 1) {
        if (distanceToSegment(p, trail[i - 1], trail[i]) <= radiusPx) return true;
    }
    return false;
}

export interface TouchedOptions {
    /** 지금 경로의 역들. */
    path: string[];
    /** 직전까지 기억한 역으로 세던 것. */
    previous: ReadonlySet<string>;
    /** 이번 움직임 **전에** 이미 경로에 있던 역. 나머지는 새로 붙은 역이다. */
    known: ReadonlySet<string>;
    /** 역의 화면 자리. 모르는 역은 null. */
    project: (stationId: string) => Point | null;
    /** 커서가 지나온 자취(화면 좌표). 마지막 점이 지금 자리. */
    trail: Point[];
    radiusPx?: number;
}

/** 이번 움직임까지 반영한 "기억한 역" 목록. */
export function touchedStations(options: TouchedOptions): Set<string> {
    const { path, previous, known, project, trail } = options;
    const radius = options.radiusPx ?? TOUCH_RADIUS_PX;
    const inPath = new Set(path);
    const out = new Set<string>();
    // 경로에서 빠진 역은 기억한 역 목록에서도 빠진다. 줄였다 늘리면 그 사이 역이
    // 스치지도 않은 채 확실한 역으로 남는다.
    previous.forEach(id => {
        if (inPath.has(id)) out.add(id);
    });
    if (trail.length === 0) return out;
    const last = trail[trail.length - 1];
    const beforeLast = trail.length >= 2 ? trail[trail.length - 2] : last;
    for (const id of path) {
        if (out.has(id)) continue;
        const at = project(id);
        if (!at) continue;
        const brushed = known.has(id)
            ? distanceToSegment(at, beforeLast, last) <= radius
            : nearTrail(at, trail, radius);
        if (brushed) out.add(id);
    }
    return out;
}

/**
 * 커서가 지나지 않은 자리들. 양옆의 "지나간 역"까지 물려서 한 덩어리로 돌려준다.
 *
 * 이 자리에 **후보 목록을 붙이지 않는다.** 중간이 기억나지 않는 사람에게 목록을 줘도
 * 고를 수가 없다. 흐린 채로 남기고, 고치고 싶으면 그 자리를 다시 그으면 된다.
 */
export function unsureSpans(path: string[], touched: ReadonlySet<string>): [number, number][] {
    const out: [number, number][] = [];
    let i = 0;
    while (i < path.length) {
        if (touched.has(path[i])) {
            i += 1;
            continue;
        }
        const from = i;
        while (i < path.length && !touched.has(path[i])) i += 1;
        out.push([Math.max(0, from - 1), Math.min(path.length - 1, i)]);
    }
    return out;
}

/** 커서가 지나지 않아 앱이 채운 역 수. */
export function unsureCount(path: string[], touched: ReadonlySet<string>): number {
    return path.reduce((n, id) => (touched.has(id) ? n : n + 1), 0);
}

/** 찾아 준 경로를 받을 때. **양 끝만** 기억한 것으로 둔다 — 가운데는 탐색이 채웠다. */
export function touchedForFoundRoute(path: string[]): Set<string> {
    const out = new Set<string>();
    if (path.length > 0) {
        out.add(path[0]);
        out.add(path[path.length - 1]);
    }
    return out;
}

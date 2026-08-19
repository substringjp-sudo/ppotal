/**
 * Geodesic helpers for matching.
 *
 * Everything here works in metres on a local flat approximation rather than
 * proper geodesics. Over the distances that matter — a trace point is either
 * within ~200m of a rail line or it is not — the error from treating a degree
 * of longitude as `cos(lat)` degrees of latitude is far below the GPS noise we
 * are measuring against, and it keeps the inner loop cheap enough to run over
 * a few hundred thousand points in a worker.
 */

const R = 6_371_008.8; // mean Earth radius, metres
const DEG = Math.PI / 180;

/** Metres between two [lon, lat] points. */
export function metersBetween(a: [number, number], b: [number, number]): number {
    const latMid = (a[1] + b[1]) * 0.5 * DEG;
    const dx = (b[0] - a[0]) * DEG * Math.cos(latMid);
    const dy = (b[1] - a[1]) * DEG;
    return Math.hypot(dx, dy) * R;
}

/**
 * A local metre-space projection anchored at a latitude.
 *
 * Distances to a polyline get computed thousands of times against the same
 * route, so the trig belongs outside the loop.
 */
export function projectorAt(lat: number) {
    const kx = DEG * R * Math.cos(lat * DEG);
    const ky = DEG * R;
    return (lon: number, la: number): [number, number] => [lon * kx, la * ky];
}

/** Squared distance from point p to segment ab, all already in metres. */
function distSqToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): number {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const len2 = vx * vx + vy * vy;
    if (len2 === 0) return wx * wx + wy * wy;
    let t = (wx * vx + wy * vy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = wx - t * vx, dy = wy - t * vy;
    return dx * dx + dy * dy;
}

/**
 * A polyline prepared for repeated nearest-point queries.
 *
 * Holds the vertices in metre space plus cumulative distance along the line, so
 * a query returns both "how far off the line" and "how far along it" — the
 * second is what `routeSpan` needs to tell a real ride from a trace that
 * clipped one end of a long route.
 */
export interface PreparedLine {
    xs: Float64Array;
    ys: Float64Array;
    /** Cumulative metres at each vertex. */
    cum: Float64Array;
    length: number;
    project: (lon: number, lat: number) => [number, number];
}

export function prepareLine(points: [number, number][]): PreparedLine {
    const n = points.length;
    const latAnchor = n ? points[(n / 2) | 0][1] : 0;
    const project = projectorAt(latAnchor);
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    const cum = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const [x, y] = project(points[i][0], points[i][1]);
        xs[i] = x; ys[i] = y;
        cum[i] = i === 0 ? 0 : cum[i - 1] + Math.hypot(x - xs[i - 1], y - ys[i - 1]);
    }
    return { xs, ys, cum, length: n ? cum[n - 1] : 0, project };
}

export interface NearestOnLine {
    /** Metres from the query point to the line. */
    distance: number;
    /** Metres travelled along the line to the closest point. */
    along: number;
}

export function nearestOnLine(line: PreparedLine, lon: number, lat: number): NearestOnLine {
    const [px, py] = line.project(lon, lat);
    const n = line.xs.length;
    if (n === 0) return { distance: Infinity, along: 0 };
    if (n === 1) return { distance: Math.hypot(px - line.xs[0], py - line.ys[0]), along: 0 };

    let bestSq = Infinity;
    let bestAlong = 0;
    for (let i = 1; i < n; i++) {
        const ax = line.xs[i - 1], ay = line.ys[i - 1];
        const bx = line.xs[i], by = line.ys[i];
        const d2 = distSqToSegment(px, py, ax, ay, bx, by);
        if (d2 < bestSq) {
            bestSq = d2;
            const vx = bx - ax, vy = by - ay;
            const len2 = vx * vx + vy * vy;
            let t = len2 === 0 ? 0 : ((px - ax) * vx + (py - ay) * vy) / len2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            bestAlong = line.cum[i - 1] + t * Math.sqrt(len2);
        }
    }
    return { distance: Math.sqrt(bestSq), along: bestAlong };
}

/** Total ground distance along a trace, in metres. */
export function traceLength(points: { lon: number; lat: number }[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += metersBetween(
            [points[i - 1].lon, points[i - 1].lat],
            [points[i].lon, points[i].lat]
        );
    }
    return total;
}

export function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return NaN;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
